import pandas as pd
import torch

# The ../ tells it to look outside model_service for input.txt
df = pd.read_csv("../input.txt", sep="\t", nrows=201)
features = df.iloc[1:, 2:1033].values.astype("float32")
torch.save(torch.tensor(features), "shap_background.pt")
print("Saved successfully!")