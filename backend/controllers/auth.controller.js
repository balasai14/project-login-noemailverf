import bcryptjs from "bcryptjs";
import path from "path";
import * as faceapi from "face-api.js";
import { Canvas, Image, ImageData } from "canvas";
import { User } from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

// Monkey patch FaceAPI.js to use Canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Specify the directory containing FaceAPI.js models
const modelPath = path.resolve("backend/models");

export const login = async (req, res) => {
  const { email, password, image } = req.body;

  try {
    // Validate input
    if (!email || !password || !image) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find the user in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify the password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Check if the user has a stored image
    const storedImage = user.image; // Retrieve stored image from MongoDB
    if (!storedImage) {
      return res.status(404).json({ message: "No image found for the user." });
    }

    // Load FaceAPI.js models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
    ]);

    // Convert input image and stored image to tensors
    const inputImage = await faceapi.bufferToImage(Buffer.from(image, "base64")); // Login image
    const dbImage = await faceapi.bufferToImage(Buffer.from(storedImage, "base64")); // Stored image

    // Compute face descriptors for both images
    const inputDescriptor = await faceapi.computeFaceDescriptor(inputImage);
    const dbDescriptor = await faceapi.computeFaceDescriptor(dbImage);

    // Calculate Euclidean distance between face descriptors
    const distance = faceapi.euclideanDistance(inputDescriptor, dbDescriptor);

    // Set a threshold for face verification (adjust if necessary)
    const threshold = 0.6;
    if (distance > threshold) {
      return res.status(401).json({ message: "Face verification failed." });
    }

    // Generate token and set cookie for authenticated session
    generateTokenAndSetCookie(res, user._id);

    // Return successful login response
    res.status(200).json({
      message: "Login successful.",
      user: {
        ...user._doc,
        password: undefined, // Do not return the password
        image: undefined, // Do not return the image
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error." });
  }
};


export const signup = async (req, res) => {
	const { email, password, name, image } = req.body;
  
	try {
	  if (!email || !password || !name || !image) {
		throw new Error("All fields, including an image, are required");
	  }
  
	  // Check if the user already exists
	  const userAlreadyExists = await User.findOne({ email });
	  console.log("userAlreadyExists", userAlreadyExists);
  
	  if (userAlreadyExists) {
		return res.status(400).json({
		  success: false,
		  message: "User already exists",
		});
	  }
  
	  // Hash the password
	  const hashedPassword = await bcryptjs.hash(password, 10);
	  const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
  
	  // Convert the base64 image to a Buffer
	  const imageBuffer = Buffer.from(image.split(",")[1], "base64");
  
	  // Create a new user
	  const user = new User({
		email,
		password: hashedPassword,
		name,
		isVerified: true, // Automatically verified for simplicity
		image: imageBuffer, // Store the user's image
	  });
  
	  await user.save();
  
	  // Generate JWT and set cookie
	  generateTokenAndSetCookie(res, user._id);
  
	  res.status(201).json({
		success: true,
		message: "User created successfully",
		user: {
		  ...user._doc,
		  password: undefined, // Exclude password from the response
		},
	  });
	} catch (error) {
	  res.status(400).json({
		success: false,
		message: error.message,
	  });
	}
};
  

export const verifyEmail = async (req, res) => {
	const { code } = req.body;
	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		await sendWelcomeEmail(user.email, user.name);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};



export const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.log("Error in checkAuth ", error);
        res.status(400).json({ success: false, message: error.message });
    }
};


