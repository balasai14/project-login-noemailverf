import bcryptjs from "bcryptjs";
import path from "path";
import * as faceapi from "face-api.js";
import { Canvas, Image, ImageData } from "canvas";
import { User } from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {faceRecognition} from "../utils/faceRecognition.js";  // Custom function to handle face comparison

export const login = async (req, res) => {
  const { email, password, image } = req.body; // Receive captured image from the frontend

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Compare captured image with stored image
    const isFaceMatched = await faceRecognition(image, user.image);
    if (!isFaceMatched) {
      return res.status(400).json({ success: false, message: "Face verification failed" });
    }

    generateTokenAndSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.log("Error in login ", error);
    res.status(400).json({ success: false, message: error.message });
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


