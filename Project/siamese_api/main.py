from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from tensorflow.keras.models import load_model
import numpy as np
import tensorflow as tf
import cv2
from PIL import Image
from mtcnn import MTCNN
import os
from tensorflow.keras import layers
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
import io

class L2NormalizeLayer(layers.Layer):
    def call(self, inputs):
        return tf.math.l2_normalize(inputs, axis=1)

class AbsoluteDifferenceLayer(layers.Layer):
    def call(self, inputs):
        return tf.abs(inputs[0] - inputs[1])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)


MODEL_PATH = "models/siamese.keras"
BOUNDING_BOXES_DIR = "static/bounding_boxes"
CROPPED_IMAGES_DIR = "static/cropped_faces"

os.makedirs(BOUNDING_BOXES_DIR, exist_ok=True)
os.makedirs(CROPPED_IMAGES_DIR, exist_ok=True)

detector = MTCNN()

model = load_model(MODEL_PATH, custom_objects={'L2NormalizeLayer': L2NormalizeLayer, 'AbsoluteDifferenceLayer': AbsoluteDifferenceLayer})

app.mount("/static", StaticFiles(directory="static"), name="static")

def detect_and_save_bounding_box(image_bytes, output_folder):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_np = np.array(image)
    
    # Detect faces with MTCNN
    faces = detector.detect_faces(image_np)
    if not faces:
        return None, None, "No face detected"

    # Draw bounding box for visualization (on the original image)
    for face in faces:
        x, y, w, h = face['box']
        cv2.rectangle(image_np, (x, y), (x+w, y+h), (0, 255, 0), 2)

    # Save image with bounding box (for visualization)
    filename = f"{uuid.uuid4()}_bbox.jpg"
    output_path = os.path.join(output_folder, filename)
    cv2.imwrite(output_path, cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR))

    return image_np, faces, filename

def crop_and_save_faces(image_np, faces, output_folder):
    # Find the face with the largest area (width * height)
    largest_face = max(faces, key=lambda face: face['box'][2] * face['box'][3])  # Max by area (width * height)
    
    # Get the coordinates of the largest face
    x, y, w, h = largest_face['box']
    
    # Crop only the face region, excluding the bounding box
    cropped = image_np[y:y+h, x:x+w]
    resized = cv2.resize(cropped, (160, 160), interpolation=cv2.INTER_AREA)

    # Save the cropped image
    filename = f"{uuid.uuid4()}_cropped.jpg"
    output_path = os.path.join(output_folder, filename)
    cv2.imwrite(output_path, cv2.cvtColor(resized, cv2.COLOR_RGB2BGR))

    return [resized], [filename]

def preprocess_image(image):
    image = image / 255.0
    image = np.expand_dims(image, axis=0)
    return image

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/predict")
async def predict(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
):
    try:
        image_bytes1 = await image1.read()
        image_bytes2 = await image2.read()

        # IMAGE 1 Processing
        image_np1, faces1, bbox_filename1 = detect_and_save_bounding_box(image_bytes1, BOUNDING_BOXES_DIR)
        
        if not faces1:
            return HTTPException(status_code=400, detail={
                "message": "Gambar tidak memiliki wajah"
            })
        
        cropped_faces1, cropped_filenames1 = crop_and_save_faces(image_np1, faces1, CROPPED_IMAGES_DIR)

        image_np2, faces2, bbox_filename2 = detect_and_save_bounding_box(image_bytes2, BOUNDING_BOXES_DIR)
        
        if not faces2:
            return HTTPException(status_code=400, detail={
                "message": "Gambar tidak memiliki wajah"
            })

        cropped_faces2, cropped_filenames2 = crop_and_save_faces(image_np2, faces2, CROPPED_IMAGES_DIR)

        # Ambil wajah pertama untuk prediksi
        face1_input = preprocess_image(cropped_faces1[0])
        face2_input = preprocess_image(cropped_faces2[0])

        # Prediksi menggunakan model Siamese Network
        prediction = model.predict([face1_input, face2_input])
        similarity_score = float(prediction[0][0])

        print("Done predicting")

        if similarity_score < 0.5:
            return HTTPException(status_code=400, detail={
                'message': 'Gambar tidak cocok',
                'similarity_score': similarity_score
            })

        # Return URL gambar
        return {
            "similarity_score": similarity_score,
            "bounding_boxes": [
                {"url": f"/static/bounding_boxes/{bbox_filename1}", "description": "Image 1 with bounding box"},
                {"url": f"/static/bounding_boxes/{bbox_filename2}", "description": "Image 2 with bounding box"}
            ],
            "cropped_faces": [
                {"url": f"/static/cropped_faces/{cropped_filenames1[0]}", "description": "Cropped Face 1"},
                {"url": f"/static/cropped_faces/{cropped_filenames2[0]}", "description": "Cropped Face 2"}
            ]
        }
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}