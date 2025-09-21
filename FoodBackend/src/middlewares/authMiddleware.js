import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { Seller } from "../models/sellerModel.js";
import { Admin } from "../models/adminModel.js";

// Middleware to check if user is already authenticated (for login/register protection)
export const checkAlreadyAuthenticated = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            return next(); // No token, allow access to login/register
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if user exists and token is valid
        const [user, seller, admin] = await Promise.all([
            User.findById(decodedToken?._id).select("-password -refreshTokens"),
            Seller.findById(decodedToken?._id).select("-password -refreshTokens"),
            Admin.findById(decodedToken?._id).select("-password -refreshTokens"),
        ]);

        const principal = user || seller || admin;
        if (principal) {
            // User is already authenticated, return error
            throw new ApiError("Already authenticated", 400, "You are already logged in. Please logout first to access this route.");
        }

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            // Invalid or expired token, allow access to login/register
            return next();
        }
        throw error;
    }
});

// Generic JWT verification middleware with device ID validation
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        const deviceId = req.cookies?.deviceId || req.body?.deviceId || req.query?.deviceId;

        if (!token) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        if (!deviceId) {
            throw new ApiError("Unauthorized request", 401, "Device ID required for authentication");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Attempt to resolve the principal across all supported roles
        const [user, seller, admin] = await Promise.all([
            User.findById(decodedToken?._id).select("-password -refreshTokens"),
            Seller.findById(decodedToken?._id).select("-password -refreshTokens"),
            Admin.findById(decodedToken?._id).select("-password -refreshTokens"),
        ]);

        const principal = user || seller || admin;
        if (!principal) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        // Validate that the device ID matches one of the stored refresh tokens
        if (principal.refreshTokens && principal.refreshTokens.length > 0) {
            const validDevice = principal.refreshTokens.some(rt => rt.deviceId === deviceId);
            if (!validDevice) {
                console.log(`🔍 Device ID mismatch: ${deviceId} not found in user ${principal._id}`);
                throw new ApiError("Unauthorized request", 401, "Device not authorized for this account");
            }
        }

        // Attach generic and role-specific references for downstream middlewares/controllers
        req.user = principal;
        req.deviceId = deviceId; // Attach device ID for downstream use
        if (seller) req.seller = seller;
        if (admin) req.admin = admin;

        next();
    } catch (error) {
        throw new ApiError("Unauthorized request", 401, error.message || "Invalid token");
    }
});

// Seller-specific JWT verification with device ID validation
export const verifySellerJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        const deviceId = req.cookies?.deviceId || req.body?.deviceId || req.query?.deviceId;

        if (!token) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        if (!deviceId) {
            throw new ApiError("Unauthorized request", 401, "Device ID required for authentication");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const seller = await Seller.findById(decodedToken?._id).select("-password -refreshTokens");

        if (!seller) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        // Validate that the device ID matches one of the stored refresh tokens
        if (seller.refreshTokens && seller.refreshTokens.length > 0) {
            const validDevice = seller.refreshTokens.some(rt => rt.deviceId === deviceId);
            if (!validDevice) {
                console.log(`🔍 Device ID mismatch: ${deviceId} not found in seller ${seller._id}`);
                throw new ApiError("Unauthorized request", 401, "Device not authorized for this account");
            }
        }

        req.seller = seller;
        req.deviceId = deviceId; // Attach device ID for downstream use
        next();
    } catch (error) {
        throw new ApiError("Unauthorized request", 401, error.message || "Invalid token");
    }
});

// Admin-specific JWT verification with device ID validation
export const verifyAdminJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        const deviceId = req.cookies?.deviceId || req.body?.deviceId || req.query?.deviceId;

        if (!token) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        // For admin operations, device ID is optional (more flexible)
        // This allows admin to access documentation and other admin features
        if (!deviceId) {
            console.log('⚠️ Admin JWT verification: No device ID provided, proceeding with token validation only');
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const admin = await Admin.findById(decodedToken?._id).select("-password -refreshTokens");

        if (!admin) {
            throw new ApiError("Unauthorized request", 401, "Invalid token");
        }

        // Only validate device ID if it's provided and admin has refresh tokens
        if (deviceId && admin.refreshTokens && admin.refreshTokens.length > 0) {
            const validDevice = admin.refreshTokens.some(rt => rt.deviceId === deviceId);
            if (!validDevice) {
                console.log(`🔍 Device ID mismatch: ${deviceId} not found in admin ${admin._id}`);
                // For admin operations, don't fail on device mismatch, just log it
                console.log('⚠️ Admin device mismatch, but proceeding with authentication');
            }
        }

        req.admin = admin;
        req.deviceId = deviceId; // Attach device ID for downstream use (may be undefined)
        next();
    } catch (error) {
        throw new ApiError("Unauthorized request", 401, error.message || "Invalid token");
    }
});

