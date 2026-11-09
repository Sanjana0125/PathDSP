# PathDSP: Explainable Drug Sensitivity Platform

A full-stack precision oncology web application combining deep learning drug sensitivity predictions, Monte Carlo uncertainty estimation, SHAP pathway explainability, and interactive exploration of the GDSC pharmacogenomics dataset.

---
## ⚠️ IMPORTANT: Missing Data Files
Because GitHub has a strict file size limit, the massive datasets and PyTorch model weights are **NOT** included in this repository. To run this app locally, you must download them and place them in the correct folders before starting the servers:

1. **`input.txt`** (The 593MB GDSC Dataset) → Place in the root folder.
2. **`metadata.csv`** (Cell line tissue types) → Place in the `server/` folder.
3. **`PathDSP_run.FNN.cv_10best_model.pt`** (Trained Model) → Place in the `model_service/` folder.
4. **`shap_background.pt`** → Place in the `model_service/` folder.

---

## Architecture Overview

```
                      ┌────────────────────────┐
                      │    React 19 Frontend   │ (Port 3000)
                      │  Interactive Dashboard │
                      └───────────┬────────────┘
                                  │ REST
                                  ▼
                      ┌────────────────────────┐
                      │  Node.js / Express API │ (Port 5000)
                      │  In-Memory GDSC Cache  │
                      └───────────┬────────────┘
                                  │ HTTP
                                  ▼
                      ┌────────────────────────┐
                      │  FastAPI Model Service │ (Port 8000)
                      │ PyTorch FNN + SHAP Exp │
                      └────────────────────────┘
```

---

## Getting Started

### 1. Start the Python Model Service (Port 8000)
```powershell
cd model_service
python main.py
```
*Loads the trained 1,031-feature PyTorch FNN and `shap.DeepExplainer` with precomputed background tensor.*

### 2. Start the Node.js Backend Server (Port 5000)
```powershell
cd server
node index.js
```
*Parses `input.txt` (37,732 pairs) and `metadata.csv` (cancer types and tissue names).*

### 3. Start the React Frontend (Port 3000)
```powershell
cd client
npm start
```
*Opens the web dashboard at `http://localhost:3000`.*

---

## Features Implemented

1. **Drug Sensitivity Prediction**: Real FNN predictions with 30 MC-Dropout passes calculating mean log-IC50, 95% Confidence Interval, AI Confidence score (`HIGH` / `LOW`), and comparison to actual GDSC lab measurements.
2. **Semi-Circular Drug Response Gauge**: Calibrated SVG needle meter with Sensitive (< Q25), Intermediate (Q25–Q75), and Resistant (> Q75) zones.
3. **SHAP Feature Importance**: Waterfall chart and Signed Impact Bars with Top 5, Top 10, Top 20, and All feature views.
4. **Readable Pathway & Feature Explanations**: Biological annotations for PI3K, MAPK, Apoptosis, Cell Cycle, TP53, BRCA, EGFR, and more.
5. **Feature Category Filters**: Filter SHAP features by Expression (EXP), Drug Target (TARGET), Mutation (MUT), Copy Number (CNV), and Chemical (CHEM).
6. **Top Sensitive & Resistant Drugs**: Batch-evaluated ranking of drugs for any cell line with Sensitive vs. Resistant direction toggle.
7. **Top Sensitive & Resistant Cell Lines**: Batch-evaluated ranking of cancer cell lines for any drug across 30+ tissue types.
8. **Drug Comparison**: Side-by-side comparison of 2–6 drugs on a cell line with confidence intervals and comparative response bars.
9. **Cell Line Comparison**: Cross-tissue comparison of multiple cancer cell lines against the same drug.
10. **Prediction Explorer**: Search, filter, and paginate all 37,000+ pairs in the dataset with 1-click "Analyze →" action.
11. **Prediction History**: Persistent history in `localStorage` with live stats, restore/re-analyze, CSV export, and clear options.
12. **PDF Prediction Report**: Publication-ready PDF export via `html2pdf.js` with structured inputs, prediction metrics, SHAP table, and citations.
13. **CSV Export**: Instant CSV downloads for predictions, SHAP tables, rankings, comparisons, and dataset explorer pages.
14. **Model & Dataset Information**: Comprehensive documentation on the FNN architecture, 10-fold cross-validation benchmarks, and GDSC metadata.
15. **Interactive Glossary**: Searchable oncology and deep learning terminology dictionary with category pills.

