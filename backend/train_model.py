import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from pathlib import Path
import sys
from tqdm import tqdm

DATA_DIR = Path(__file__).parent / "data"
MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

ASL_LABELS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'SPACE', 'DELETE', 'NOTHING'
]

LABEL_TO_INDEX = {label: i for i, label in enumerate(ASL_LABELS)}
INPUT_SIZE = 63  # 21 landmarks * 3

def load_dataset():
    X, y = [], []
    
    for label in ASL_LABELS:
        label_dir = DATA_DIR / label
        if not label_dir.exists():
            continue
            
        files = list(label_dir.glob("*.json"))
        for f in tqdm(files, desc=f"Loading {label}", leave=False):
            with open(f) as fp:
                data = json.load(fp)
                landmarks = data.get("landmarks", [])
                if len(landmarks) == INPUT_SIZE:
                    X.append(landmarks)
                    y.append(LABEL_TO_INDEX[label])
    
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)

def build_model(num_classes: int):
    model = keras.Sequential([
        layers.Input(shape=(INPUT_SIZE,)),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(128, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

def train(epochs: int = 50, batch_size: int = 32, validation_split: float = 0.2):
    status_file = MODEL_DIR / "training_status.json"
    
    def update_status(status: str, progress: float, **kwargs):
        data = {"status": status, "progress": progress, **kwargs}
        with open(status_file, "w") as f:
            json.dump(data, f)
    
    try:
        update_status("loading_data", 0.1)
        X, y = load_dataset()
        
        if len(X) == 0:
            update_status("error", 0, error="No training data found. Collect samples first.")
            return
        
        print(f"Loaded {len(X)} samples across {len(np.unique(y))} classes")
        
        # Check class distribution
        unique, counts = np.unique(y, return_counts=True)
        for u, c in zip(unique, counts):
            print(f"  {ASL_LABELS[u]}: {c} samples")
        
        if len(unique) < 2:
            update_status("error", 0, error="Need at least 2 classes with data")
            return
        
        # Normalize
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
        
        # Save normalization params
        normalize_params = {
            "mean": scaler.mean_.tolist(),
            "std": scaler.scale_.tolist()
        }
        with open(MODEL_DIR / "normalize.json", "w") as f:
            json.dump(normalize_params, f)
        
        # Split
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, random_state=42, stratify=y
        )
        
        update_status("training", 0.2, epochs=epochs, samples=len(X))
        
        model = build_model(len(ASL_LABELS))
        
        class ProgressCallback(keras.callbacks.Callback):
            def on_epoch_end(self, epoch, logs=None):
                progress = 0.2 + 0.7 * (epoch + 1) / epochs
                update_status("training", progress, epoch=epoch + 1, logs=logs)
        
        callbacks = [
            ProgressCallback(),
            keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(patience=5, factor=0.5)
        ]
        
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        update_status("saving", 0.9)
        
        # Save Keras model
        model.save(MODEL_DIR / "keras_model.h5")
        
        # Convert to TF.js format
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, str(MODEL_DIR))
        
        # Save labels
        with open(MODEL_DIR / "labels.json", "w") as f:
            json.dump({"labels": ASL_LABELS}, f)
        
        # Evaluate
        val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
        
        update_status("completed", 1.0, 
            val_accuracy=float(val_acc), 
            val_loss=float(val_loss),
            model_path=str(MODEL_DIR)
        )
        
        print(f"\nTraining complete! Val accuracy: {val_acc:.4f}")
        
    except Exception as e:
        update_status("error", 0, error=str(e))
        print(f"Training error: {e}")
        raise

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--val-split", type=float, default=0.2)
    args = parser.parse_args()
    
    train(args.epochs, args.batch_size, args.val_split)