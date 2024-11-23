import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";  // Ensure to import Link

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const webcamRef = useRef(null);
  const { login, error, isLoading } = useAuthStore();

  // Track webcam permission error
  useEffect(() => {
    const checkWebcamPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());  // Stop the stream after checking
      } catch (err) {
        setWebcamError("Camera permission denied or webcam not accessible.");
      }
    };

    checkWebcamPermission();
  }, []);

  const handleCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImage(imageSrc); // Store the captured image
        setWebcamError(null); // Clear any previous errors
      } else {
        setWebcamError("Failed to capture image. Please try again.");
      }
    } else {
      setWebcamError("Webcam not available. Please check your camera.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!image) {
      setWebcamError("Please capture an image to proceed.");
      return;
    }

    try {
      await login(email, password, image);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
          Login
        </h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-gray-900 text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-gray-900 text-white"
            required
          />
          <div className="mt-4">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-lg"
              onUserMediaError={(err) => setWebcamError("Webcam error: " + err.message)}
            />
            <button
              type="button"
              onClick={handleCapture}
              className={`mt-2 w-full py-2 px-4 ${
                isLoading ? "bg-gray-600" : "bg-gray-700 hover:bg-gray-600"
              } text-white rounded-lg`}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Capture Image"}
            </button>
            {webcamError && <p className="text-red-500 mt-2">{webcamError}</p>}
          </div>
          {image && <img src={image} alt="Captured" className="mt-4 rounded-lg" />}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full py-3 px-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}

        {/* Sign Up Link */}
        <p className="text-center text-white mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginPage;
