import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SEC;
    if (!secret) {
      return res.status(500).json({ success: false, message: "Server JWT configuration missing" });
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select("-accessToken");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found or token invalid" });
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

