from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import shutil
from pathlib import Path

app = FastAPI(title="ASL Interpreter API", version="0.1.0")

# CORS configuration - use env var in production, allow all in development
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
MODEL_DIR = Path(__file__).parent / "model"
DATA_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

class LandmarkData(BaseModel):
    landmarks: List[List[float]]  # 21 * 3 = 63 values
    label: str

class TrainingRequest(BaseModel):
    epochs: int = 50
    batch_size: int = 32
    validation_split: float = 0.2

@app.get("/")
async def root():
    return {"message": "ASL Interpreter API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/labels")
async def get_labels():
    labels_file = DATA_DIR / "labels.json"
    if labels_file.exists():
        with open(labels_file) as f:
            return json.load(f)
    return {"labels": [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
        "SPACE", "DELETE", "NOTHING"
    ]}

@app.post("/collect")
async def collect_sample(data: LandmarkData):
    label_dir = DATA_DIR / data.label
    label_dir.mkdir(exist_ok=True)
    
    existing_files = list(label_dir.glob("*.json"))
    next_id = len(existing_files)
    
    sample_file = label_dir / f"sample_{next_id:04d}.json"
    with open(sample_file, "w") as f:
        json.dump({"landmarks": data.landmarks, "label": data.label}, f)
    
    return {"status": "saved", "file": str(sample_file), "count": next_id + 1}

@app.get("/stats")
async def get_stats():
    stats = {}
    total = 0
    for label_dir in DATA_DIR.iterdir():
        if label_dir.is_dir():
            count = len(list(label_dir.glob("*.json")))
            stats[label_dir.name] = count
            total += count
    return {"total_samples": total, "per_class": stats}

@app.post("/train")
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    from train_model import train
    background_tasks.add_task(train, request.epochs, request.batch_size, request.validation_split)
    return {"status": "training_started", "message": "Check /train/status for progress"}

@app.get("/train/status")
async def train_status():
    status_file = MODEL_DIR / "training_status.json"
    if status_file.exists():
        with open(status_file) as f:
            return json.load(f)
    return {"status": "idle", "progress": 0}

@app.get("/model/download")
async def download_model():
    model_path = MODEL_DIR / "model.json"
    if not model_path.exists():
        raise HTTPException(404, "Model not found. Train first.")
    return FileResponse(model_path, media_type="application/json")

@app.get("/model/normalize")
async def download_normalize():
    norm_path = MODEL_DIR / "normalize.json"
    if not norm_path.exists():
        raise HTTPException(404, "Normalization params not found.")
    return FileResponse(norm_path, media_type="application/json")

@app.delete("/data/{label}")
async def delete_label_data(label: str):
    label_dir = DATA_DIR / label
    if label_dir.exists():
        shutil.rmtree(label_dir)
        return {"status": "deleted", "label": label}
    raise HTTPException(404, "Label not found")

@app.delete("/data")
async def delete_all_data():
    for label_dir in DATA_DIR.iterdir():
        if label_dir.is_dir():
            shutil.rmtree(label_dir)
    return {"status": "all_data_cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)