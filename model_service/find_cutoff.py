import pandas as pd
import torch
import numpy as np
import requests

# 1. Load a chunk of real data (e.g., 100 samples from your dataset)
print("Loading data...")
# We read 101 rows: 1 header + 100 data rows
df = pd.read_csv("../input.txt", sep="\t", nrows=101)
features_batch = df.iloc[1:, 2:1033].values.astype("float32")

stds = []

# 2. Get predictions and std for each sample
print("Running MC-Dropout passes (this might take a minute)...")
for i, features in enumerate(features_batch):
    payload = {"features": features.tolist()}
    # Assuming your server is running on port 8000
    response = requests.post("http://localhost:8000/predict_with_confidence", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        stds.append(data['std'])
    else:
        print(f"Error at index {i}: {response.text}")

# 3. Calculate the 95th percentile
stds = np.array(stds)
cutoff_95 = np.percentile(stds, 95)

print("-" * 30)
print(f"Processed {len(stds)} samples.")
print(f"Average std: {np.mean(stds):.4f}")
print(f"Max std: {np.max(stds):.4f}")
print(f"Suggested Cutoff (95th percentile): {cutoff_95:.4f}")
print("-" * 30)