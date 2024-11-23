import cv2
from flask import Flask, Response
from ultralytics import YOLO
from flask_cors import CORS


 # Enable CORS for all routes

app = Flask(__name__)
CORS(app) 
# Load the YOLOv8 model (small version for faster processing)
model = YOLO('yolo11s.pt')  # Ensure you have the yolov8s.pt model file

def generate_frames():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not access the camera.")
        return
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Unable to capture video frame.")
            break

        # Resize frame for faster processing
        resized_frame = cv2.resize(frame, (640, 480))

        # Perform inference
        results = model(resized_frame)

        # Extract detection results
        detections = results[0].boxes.data  # Get detection data (tensor)

        # Draw bounding boxes and count people
        people_count = 0
        for detection in detections:
            xmin, ymin, xmax, ymax, conf, class_id = detection.tolist()
            if int(class_id) == 0:  # Class 0 corresponds to 'person'
                people_count += 1
                # Draw bounding box (blue color)
                cv2.rectangle(frame, (int(xmin), int(ymin)), (int(xmax), int(ymax)), (255, 0, 0), 2)

        # Display the people count
        cv2.putText(frame, f'People Count: {people_count}', (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)  # Red text

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)