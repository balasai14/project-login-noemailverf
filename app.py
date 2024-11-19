from flask import Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import os

app = Flask(__name__)

# Load the trained model
model = load_model('C:\\Users\\Sai\\Desktop\\project-login-noemail\\my_model.keras')

# Class labels
class_labels = ['class1', 'class2', 'class3']  # Replace with your actual class names

@app.route('/')
def index():
    return render_template('index.html')  # Load the frontend

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'})

    img_file = request.files['file']
    if img_file.filename == '':
        return jsonify({'error': 'No file selected'})

    # Save and process the image
    img_path = os.path.join('uploads', img_file.filename)
    img_file.save(img_path)

    # Preprocess the image
    img = image.load_img(img_path, target_size=(128, 128))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    # Make a prediction
    predictions = model.predict(img_array)
    predicted_class_index = np.argmax(predictions)
    predicted_class = class_labels[predicted_class_index]
    confidence = np.max(predictions) * 100

    return jsonify({
        'predicted_class': predicted_class,
        'confidence': f'{confidence:.2f}%'
    })

if __name__ == '__main__':
    app.run(debug=True)
