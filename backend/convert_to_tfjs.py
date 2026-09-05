import tensorflowjs as tfjs
import tensorflow as tf
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "model"

def convert():
    keras_model_path = MODEL_DIR / "keras_model.h5"
    if not keras_model_path.exists():
        print("Keras model not found. Run training first.")
        return
    
    model = tf.keras.models.load_model(keras_model_path)
    tfjs.converters.save_keras_model(model, str(MODEL_DIR))
    print(f"Model converted to TF.js format at {MODEL_DIR}")

if __name__ == "__main__":
    convert()