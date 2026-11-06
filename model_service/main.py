from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import torch
import numpy as np
import shap
import os
import threading
from myModel import FNN

N_INPUTS = 1031
BASE = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE, "PathDSP_run.FNN.cv_10best_model.pt")
BG_PATH    = os.path.join(BASE, "shap_background.pt")

app = FastAPI(title="PathDSP Model Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread lock to prevent race conditions during concurrent predictions and SHAP backward passes
model_lock = threading.Lock()

# --- 1. Load model for inference (no SHAP hooks) ---
model = FNN(N_INPUTS)
state = torch.load(MODEL_PATH, map_location="cpu")
model.load_state_dict(state)
model.eval()

# --- 2. Load dedicated model for SHAP explanations ---
# (Keeps DeepExplainer hooks completely isolated from inference & MC-Dropout passes)
explain_model = FNN(N_INPUTS)
explain_model.load_state_dict(state)
explain_model.eval()

# --- 3. Load SHAP background ---
background = torch.load(BG_PATH, map_location="cpu")
explainer  = shap.DeepExplainer(explain_model, background)

# Compute baseline expected value from background
with torch.no_grad():
    _bg_preds = model(background).detach().numpy().flatten()
BASE_VALUE = float(_bg_preds.mean())

# ---- Pydantic models ----
class PredictRequest(BaseModel):
    features: list[float]

class BatchPredictRequest(BaseModel):
    features_list: list[list[float]]

class ExplainRequest(BaseModel):
    features: list[float]
    limit: Optional[int] = 100   # None = return all; integer = top-N by |shap|


def _to_tensor(features):
    if len(features) != N_INPUTS:
        raise HTTPException(400, f"Expected {N_INPUTS} features, got {len(features)}")
    return torch.tensor([features], dtype=torch.float32)


# ---- Routes ----

@app.get("/health")
def health():
    return {"status": "ok", "n_inputs": N_INPUTS, "base_value": BASE_VALUE}


# --- 3. Basic single prediction (used internally for fast rankings) ---
@app.post("/predict")
def predict(req: PredictRequest):
    x = _to_tensor(req.features)
    with model_lock:
        with torch.no_grad():
            pred = model(x).item()
    return {"predicted_log_ic50": pred}


# --- 4. BATCH prediction — feeds rankings without N sequential HTTP calls ---
@app.post("/predict_batch")
def predict_batch(req: BatchPredictRequest):
    if not req.features_list:
        return {"predictions": []}
    for fl in req.features_list:
        if len(fl) != N_INPUTS:
            raise HTTPException(400, f"Each feature vector must have {N_INPUTS} values")
    x = torch.tensor(req.features_list, dtype=torch.float32)
    with model_lock:
        with torch.no_grad():
            preds = model(x).detach().numpy().flatten().tolist()
    return {"predictions": preds}


# --- 5. Prediction with MC-Dropout Confidence & 95% CI ---
@app.post("/predict_with_confidence")
def predict_with_confidence(req: PredictRequest, n_passes: int = 30):
    x = _to_tensor(req.features)

    with model_lock:
        model.train()   # keep dropout active
        with torch.no_grad():
            preds = np.array([model(x).item() for _ in range(n_passes)])
        model.eval()

    mean      = float(preds.mean())
    std       = float(preds.std())
    lower_ci  = mean - 1.96 * std
    upper_ci  = mean + 1.96 * std
    confidence = "high" if std < 0.2636 else "low"

    return {
        "mean":              mean,
        "std":               std,
        "lower_ci":          lower_ci,
        "upper_ci":          upper_ci,
        "confidence_label":  confidence,
        "base_value":        BASE_VALUE,
    }


# --- 6. SHAP Explanations (configurable limit) ---
@app.post("/explain")
def explain(req: ExplainRequest):
    global explainer
    x = _to_tensor(req.features)

    with model_lock:
        explain_model.eval()
        try:
            shap_values = explainer.shap_values(x)
            vals = np.array(shap_values).flatten()   # shape: (N_INPUTS,)
        except Exception:
            # Re-initialize explainer to clear any corrupted PyTorch hook buffers
            explain_model.eval()
            explainer = shap.DeepExplainer(explain_model, background)
            shap_values = explainer.shap_values(x)
            vals = np.array(shap_values).flatten()

        # Deterministic predicted value from clean prediction model
        with torch.no_grad():
            pred_val = float(model(x).item())

    # Sort all features by absolute SHAP magnitude
    sorted_indices = np.argsort(-np.abs(vals))

    # Apply limit
    if req.limit is not None:
        sorted_indices = sorted_indices[:req.limit]

    return {
        "base_value":      BASE_VALUE,
        "predicted_value": pred_val,
        "top_features": [
            {"index": int(i), "shap_value": float(vals[i])} for i in sorted_indices
        ],
    }

if __name__ == "__main__":
    import uvicorn
    import socket

    def is_port_in_use(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0

    port = int(os.environ.get("PORT", 8000))
    if is_port_in_use(port) and "PORT" not in os.environ:
        print(f"Port {port} is already in use by another process. Automatically using port 8001...")
        port = 8001

    print(f"Starting PathDSP Model Service on http://127.0.0.1:{port} ...")
    uvicorn.run(app, host="127.0.0.1", port=port)

