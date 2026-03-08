import sys
import traceback
import tensorflow as tf

print("TF Version:", tf.__version__)

try:
    print("Loading model...")
    model = tf.keras.models.load_model('models/lifecycle_cost_model.keras')
    print("OK")
except Exception:
    traceback.print_exc()
