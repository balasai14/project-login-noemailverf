import * as faceapi from 'face-api.js';


const bufferToBlob = (buffer) => {
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  return blob;
};

export const faceRecognition = async (capturedImage, storedImage) => {
  try {
    // Convert the base64 captured image to Buffer, then to Blob
    const capturedImageBuffer = Buffer.from(capturedImage.split(',')[1], 'base64');
    const capturedImageBlob = bufferToBlob(capturedImageBuffer);

    // Convert the stored image to Blob (assuming it's stored as a Buffer)
    const storedImageBlob = bufferToBlob(storedImage);

    // Load face-api.js models (this should be done once when your server starts)
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');

    // Detect faces in both images
    const capturedImageResults = await faceapi.detectAllFaces(capturedImageBlob).withFaceLandmarks().withFaceDescriptors();
    const storedImageResults = await faceapi.detectAllFaces(storedImageBlob).withFaceLandmarks().withFaceDescriptors();

    if (capturedImageResults.length === 0 || storedImageResults.length === 0) {
      throw new Error('No faces detected in one or both images.');
    }

    // Compare face descriptors
    const capturedImageDescriptor = capturedImageResults[0].descriptor;
    const storedImageDescriptor = storedImageResults[0].descriptor;

    const distance = faceapi.euclideanDistance(capturedImageDescriptor, storedImageDescriptor);

    // You can adjust the threshold based on your needs
    const threshold = 0.6;
    if (distance < threshold) {
      return true; // Faces match
    } else {
      return false; // Faces don't match
    }
  } catch (error) {
    console.error('Face recognition failed:', error);
    throw new Error('Face recognition failed.');
  }
};


