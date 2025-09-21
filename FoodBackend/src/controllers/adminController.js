import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { Admin } from '../models/adminModel.js'
import { User } from '../models/userModel.js'
import { ApiError } from '../utils/ApiError.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import jwt from "jsonwebtoken"
import { validationResult } from "express-validator"
import { sendVerificationEmail, sendWelcomeEmail, sendResetPasswordEmail, sendResetSuccessEmail } from "../utils/emails.js"
import { randomBytes } from "node:crypto"
import { generateVerificationCode } from "../utils/generateVerificationCode.js";

import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { Seller } from '../models/sellerModel.js';
import  Order  from '../models/ordersModel.js';
import { DroneOrder } from '../models/droneOrderModel.js';
import { Notification } from '../models/notificationModel.js';
import { Drone } from '../models/droneModel.js';
import Settings from '../models/settingsModel.js';

const generateAccessToken = async(adminId) => {
    try {
        const admin = await Admin.findById(adminId);      
        const accessToken = admin.generateAccessToken()    
        return accessToken;
    } 
    catch (error) {
        throw new ApiError("Error in generating access token", 500, "Something went wrong while generating the access token");
    }
};

const generateAccessAndRefreshTokens = async (adminId, deviceId) => {
    try {
        const admin = await Admin.findById(adminId);
        const accessToken = admin.generateAccessToken();
        const refreshToken = admin.generateRefreshToken(deviceId);

        // Save the refresh token with the deviceId
        admin.refreshTokens.push({ token: refreshToken, deviceId });
        admin.lastLogin = new Date();
        await admin.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            "Error in generating tokens",
            500,
            "Something went wrong in generating refresh and access token"
        );
    }
};

export const registerAdmin = asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError("Error while sign up", 400, errors.array())
    }

    const { name, email, password, mobile } = req.body

    console.log('Admin registration attempt:', { name, email, mobile, timestamp: new Date().toISOString() });

    const adminAlreadyExists = await Admin.findOne({ email });
    if (adminAlreadyExists) {
        console.log('Admin registration failed: Email already exists:', email);
        throw new ApiError("Error while registering the admin", 400, "Email already exists",)
    }
    
    const verificationToken = generateVerificationCode();
    console.log('Generated verification token for admin:', { email, token: verificationToken });

    const admin = new Admin({
        email,
        password,
        name,
        mobile,
        verificationToken,
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })
    await admin.save();
    console.log('Admin saved to database:', { adminId: admin._id, email: admin.email });

    try {
        console.log('Attempting to send verification email to admin:', admin.email);
        await sendVerificationEmail(admin.name, admin.email, verificationToken);
        console.log('Verification email sent successfully to admin:', admin.email);
        
        res.status(200).json(new ApiResponse(200,
            {
                ...admin._doc,
                password: undefined,
                refreshToken: undefined,
            }, "Admin registered Successfully. Please check your email for verification."))
    } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        
        // Check if this is a development environment with missing SMTP config
        if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
            console.log('⚠️ SMTP not configured - auto-verifying admin for development');
            admin.is_verified = true;
            admin.verificationToken = undefined;
            admin.verificationTokenExpiresAt = undefined;
            await admin.save();
            
            res.status(200).json(new ApiResponse(200,
                {
                    ...admin._doc,
                    password: undefined,
                    refreshToken: undefined,
                }, "Admin registered Successfully (auto-verified for development). Please configure SMTP for production."))
        } else {
            // Delete the admin if email fails to send and SMTP is configured
            await Admin.findByIdAndDelete(admin._id);
            throw new ApiError("Registration failed", 500, "Failed to send verification email. Please try again.");
        }
    }
})

export const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    console.log('Admin verification attempt:', { code, timestamp: new Date().toISOString() });
    
    const admin = await Admin.findOne({
        verificationToken: code,
        verificationTokenExpiresAt: { $gt: Date.now() }
    })

    if (!admin) {
        console.log('Admin verification failed: Invalid or expired code');
        throw new ApiError("Error while verifying the email", 400, "Invalid or expired verification code")
    }
    
    console.log('Admin found for verification:', { adminId: admin._id, email: admin.email });
    
    admin.is_verified = true;
    admin.verificationToken = undefined;
    admin.verificationTokenExpiresAt = undefined
    await admin.save();
    
    try {
        await sendWelcomeEmail(admin.name, admin.email);
        console.log('Welcome email sent successfully to admin:', admin.email);
    } catch (emailError) {
        console.error('Failed to send welcome email to admin:', emailError);
        // Don't fail verification if welcome email fails
    }
    
    console.log('Admin email verified successfully:', admin.email);
    return res.status(200).json(
        new ApiResponse(200, { }, "Email verified successfully")
    )
})

// Resend verification code
export const resendVerificationCode = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError("Missing email", 400, "Email is required");
    }

    console.log('Admin resend verification attempt:', { email, timestamp: new Date().toISOString() });

    const admin = await Admin.findOne({ email });
    if (!admin) {
        console.log('Admin resend verification failed: Admin not found:', email);
        throw new ApiError("Admin not found", 404, "No admin with this email");
    }
    if (admin.is_verified) {
        console.log('Admin resend verification failed: Email already verified:', email);
        return res.status(200).json(new ApiResponse(200, {}, "Email already verified", true));
    }

    const verificationToken = generateVerificationCode();
    console.log('Generated new verification token for admin:', { email, token: verificationToken });
    
    admin.verificationToken = verificationToken;
    admin.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await admin.save();
    console.log('Admin verification token updated in database:', { adminId: admin._id, email: admin.email });

    try {
        console.log('Attempting to resend verification email to admin:', admin.email);
        await sendVerificationEmail(admin.name, admin.email, verificationToken);
        console.log('Verification email resent successfully to admin:', admin.email);
        return res.status(200).json(new ApiResponse(200, {}, "Verification code resent", true));
    } catch (emailError) {
        console.error("Failed to resend verification email:", emailError);
        
        // Check if this is a development environment with missing SMTP config
        if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
            console.log('⚠️ SMTP not configured - auto-verifying admin for development');
            admin.is_verified = true;
            admin.verificationToken = undefined;
            admin.verificationTokenExpiresAt = undefined;
            await admin.save();
            
            return res.status(200).json(new ApiResponse(200, {}, "Verification code resent (auto-verified for development)", true));
        } else {
            // Revert the token changes if email fails and SMTP is configured
            admin.verificationToken = undefined;
            admin.verificationTokenExpiresAt = undefined;
            await admin.save();
            throw new ApiError("Failed to resend verification", 500, "Failed to send verification email. Please try again.");
        }
    }
});

export const loginAdmin = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError("Error while login", 400, errors.array());
    }

    const { email, password, deviceId } = req.body;

    console.log('Admin login attempt:', { email, deviceId, timestamp: new Date().toISOString() });

    const admin = await Admin.findOne({ email });
    if (!admin) {
        console.log('Admin login failed: Admin not found:', email);
        throw new ApiError("Error while login", 400, "Email and password are not correct");
    }

    console.log('Admin found for login:', { adminId: admin._id, email: admin.email, isVerified: admin.is_verified });

    const correctPassword = await admin.isPasswordCorrect(password);
    if (!correctPassword) {
        console.log('Admin login failed: Incorrect password for:', email);
        throw new ApiError("Error while login", 400, "Password and email do not exist");
    }

    if(!admin.is_verified ){
        console.log('Admin login failed: Email not verified for:', email);
        throw new ApiError("Error while login", 400, "Email not verified. Please check your email for verification code.");
    }
    
    // Clear old refresh tokens before generating new ones (Industry Standard)
    admin.refreshTokens = [];
    await admin.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(admin._id, deviceId, 'Admin');

    console.log('Admin login successful:', { adminId: admin._id, email: admin.email });

    // Options for sensitive tokens (httpOnly for security)
    const secureOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    };

    // Options for frontend-readable cookies
    const frontendOptions = {
        httpOnly: false, // Allow frontend to read
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, secureOptions)
        .cookie("refreshToken", refreshToken, secureOptions)
        .cookie("userRole", "admin", frontendOptions) // Frontend can read this
        .cookie("deviceId", deviceId || "default", frontendOptions) // Frontend can read this
        .json(
            new ApiResponse(
                200,
                {
                    user: {
                        ...admin._doc,
                        password: undefined,
                        refreshTokens: undefined,
                    },
                    accessToken,
                    refreshToken,
                },
                "Admin Logged In Successfully"
            )
        );
});

export const logoutAdmin = asyncHandler(async (req, res) => {
    const { deviceId } = req.body;

    const adminId = req.admin?._id || req.user?._id;
    // Remove all tokens for this admin to prevent multiple token issues
    await Admin.findByIdAndUpdate(adminId, {
        $set: { refreshTokens: [] }
    });
    
    console.log(`🔍 logoutAdmin: Cleared all refresh tokens for admin ${adminId}`);

    // Options for clearing cookies (must match the options used when setting them)
    const secureOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    };

    const frontendOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    };

    return res
        .status(200)
        .clearCookie("accessToken", secureOptions)
        .clearCookie("refreshToken", secureOptions)
        .clearCookie("userRole", frontendOptions) // Clear userRole cookie
        .clearCookie("deviceId", frontendOptions) // Clear deviceId cookie
        .json(new ApiResponse(200, {}, "Admin logged out successfully", true));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.query?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    
    const { deviceId } = req.body;

    if (!incomingRefreshToken || !deviceId) {
        throw new ApiError("Unauthorized request", 401, "Invalid token or device ID");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const admin = await Admin.findById(decodedToken?._id);

        if (!admin) {
            throw new ApiError("Unauthorized request", 401, "Invalid refresh token");
        }

        const tokenMatch = admin.refreshTokens.find((t) => t.token === incomingRefreshToken && t.deviceId === deviceId);
        if (!tokenMatch) {
            throw new ApiError("Unauthorized request", 401, "Token does not match any device");
        }

        const accessToken = await generateAccessToken(admin, 'Admin');

        const options = {
            httpOnly: true,
            secure: false, // Set to false for development
            sameSite: 'lax',
        };

        return res.status(200).cookie("accessToken", accessToken, options).json(new ApiResponse(200, { accessToken }, "Refresh Access Token Successfully"));
    } catch (error) {
        throw new ApiError("Unauthorized request", 401, "Invalid refresh token");
    }
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError("Error while forget password", 400, errors.array())
    }
    const { email } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
        throw new ApiError("error in forgot password", 400, "Invalid email")
    }
    //Generate reset token
    const resetToken = randomBytes(20).toString('hex');
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;// 1 hours in milliseconds
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpiresAt = resetTokenExpiresAt;
    await admin.save();
    //send email
    await sendResetPasswordEmail(admin.name, email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
    return res.status(200).json(new ApiResponse(200, {}, "Reset token successfully sent to admin email address"))
})

export const resetPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError("Error while reset password", 400, errors.array())
    }
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    if (confirmPassword != password) {
        throw new ApiError("error in reset password", 400, "confirm password does not match")
    }
    const admin = await Admin.findOne({ resetPasswordToken: token, resetPasswordExpiresAt: { $gt: Date.now() } })
    if (!admin) {
        throw new ApiError("error in reset password", 400, "Invalid or expired reset token")
    };
    if (admin.password === password || admin.password === confirmPassword) {
        throw new ApiError("error in reset password", 400, "entered old password pls enter new one")
    }
    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpiresAt = undefined;

    await admin.save();
    sendResetSuccessEmail(admin.name, admin.email);
    return res.status(200).json(new ApiResponse(200, {}, "Admin password successfully reset", true));
})

export { getDeviceDetails } from '../utils/deviceUtils.js';

export const updateEditProfile = asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError("Validation error while updating profile", 400, errors.array());
    }

    const { name, email, mobile } = req.body; // Extract admin data
    const userId = req.admin?._id || req.user?._id; // Get admin ID from session
    const admin = await Admin.findById(userId); // Fetch admin from the database

    if (!admin) {
        throw new ApiError("Admin not found", 404, "Admin not found");
    }

    let image;
    if (req.file) {
        const localImagePath = req.file.path; // Uploaded image file path
        image = await uploadOnCloudinary(localImagePath); // Upload to cloud
        admin.image = image?.url || '';
    }

    // Update fields
    admin.name = name;
    admin.email = email;
    admin.mobile = mobile;

    await admin.save(); // Save updates to database
    res.status(200).json(new ApiResponse(200, {
        ...admin._doc,
        password: undefined,
        refreshTokens: undefined,
    }, "Admin updated successfully", true));
});

export const viewProfile = asyncHandler(async (req, res) => {
    const userId = req.admin?._id || req.user?._id; // Get admin ID from session
    const admin = await Admin.findById(userId); // Fetch admin from the database

    if (!admin) {
        throw new ApiError("Error while view the admin profile", 400, "Admin not found")
    }
    res.status(200).json(new ApiResponse(200,{
        ...admin._doc,
        password: undefined,
        refreshTokens: undefined,
    }, ""))
});

export const loadEditProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Get admin ID from session
    const admin = await Admin.findById(userId); // Fetch admin from the database

    if (!admin) {
        throw new ApiError("Error while loading edit profile", 400, "Admin not found")
    }
    res.status(200).json(new ApiResponse(200,{
        ...admin._doc,
        password: undefined,
        refreshTokens: undefined,
    }, ""))
});

// Admin Dashboard Functions
export const getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalSellers = await Seller.countDocuments();
    const totalShops = await Shop.countDocuments();
    const totalProducts = await Product.countDocuments();
    const pendingShops = await Shop.countDocuments({ isApproved: false });
    const pendingProducts = await Product.countDocuments({ isApproved: false });

    res.status(200).json(new ApiResponse(200, {
        totalUsers,
        totalSellers,
        totalShops,
        totalProducts,
        pendingShops,
        pendingProducts
    }, "Dashboard stats retrieved successfully"));
});

// Add this new function for admin dashboard statistics
export const getAdminStats = asyncHandler(async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // Get total orders count
        const totalOrders = await Order.countDocuments();
        
        // Get active drone deliveries count
        const activeDroneDeliveries = await DroneOrder.countDocuments({
            status: { $in: ['pending', 'preparing', 'drone_dispatched', 'out_for_delivery'] }
        });
        
        // Get completed drone deliveries count
        const completedDeliveries = await DroneOrder.countDocuments({
            status: 'delivered'
        });

        const stats = {
            totalUsers,
            totalOrders,
            activeDroneDeliveries,
            completedDeliveries
        };

        return res.status(200).json(new ApiResponse(200, stats, "Admin statistics retrieved successfully"));
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw new ApiError("Failed to fetch admin statistics", 500);
    }
});

// Admin: Create/register a new drone with home location
export const createDrone = asyncHandler(async (req, res) => {
    const { droneId, name, model, serialNumber, homeLocation, maxPayload, maxRange, mavsdkPort } = req.body;

    if (!droneId || !name || !model || !serialNumber || !homeLocation || !mavsdkPort) {
        throw new ApiError(400, "All fields are required: droneId, name, model, serialNumber, homeLocation, mavsdkPort");
    }
    if (homeLocation?.lat === undefined || homeLocation?.lng === undefined) {
        throw new ApiError(400, "Home location must include latitude and longitude.");
    }

    const existing = await Drone.findOne({ $or: [{ droneId }, { serialNumber }] });
    if (existing) {
        throw new ApiError(409, "A drone with this ID or serial number already exists.");
    }

    const newDrone = await Drone.create({
        droneId,
        name,
        model,
        serialNumber,
        mavsdkPort: parseInt(mavsdkPort),
        maxPayload: isNaN(parseFloat(maxPayload)) ? undefined : parseFloat(maxPayload),
        maxRange: isNaN(parseFloat(maxRange)) ? undefined : parseFloat(maxRange),
        homeLocation: {
            lat: parseFloat(homeLocation.lat),
            lng: parseFloat(homeLocation.lng),
            address: homeLocation.address || 'Home Base'
        },
        location: {
            lat: parseFloat(homeLocation.lat),
            lng: parseFloat(homeLocation.lng),
            altitude: 0,
            heading: 0,
            speed: 0,
            verticalSpeed: 0
        },
        status: 'idle',
        operationalStatus: 'operational',
        battery: 100
    });

    return res.status(201).json(new ApiResponse(201, newDrone, 'Drone created and registered successfully.'));
});

// Public (internal) endpoint to provide drone config to Python bridge
export const getDroneConfig = asyncHandler(async (req, res) => {
    const drones = await Drone.find({ operationalStatus: 'operational' })
        .select('droneId mavsdkPort homeLocation');
    const testing = await Settings.findOne({ key: 'enableTestingMode' });

    const config = {
        enableTestingMode: !!(testing?.value),
        drones: drones.map(d => ({
            droneId: d.droneId,
            mavsdkPort: d.mavsdkPort,
            homeLocation: d.homeLocation
        }))
    };

    return res.status(200).json(config);
});

export const getTestingModeStatus = asyncHandler(async (req, res) => {
    const setting = await Settings.findOne({ key: 'enableTestingMode' });
    return res.status(200).json(new ApiResponse(200, { isEnabled: setting?.value || false }));
});

export const toggleTestingMode = asyncHandler(async (req, res) => {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
        throw new ApiError(400, 'Invalid request: "enable" field must be a boolean.');
    }
    const updated = await Settings.findOneAndUpdate(
        { key: 'enableTestingMode' },
        { value: enable },
        { new: true, upsert: true }
    );
    return res.status(200).json(new ApiResponse(200, { isEnabled: updated.value }, `Testing Mode has been ${enable ? 'ENABLED' : 'DISABLED'}.`));
});

// Product Image Verification
export const approveProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { isApproved, rejectionReason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError("Product not found", 404, "Product not found");
    }

    product.isApproved = isApproved;
    if (!isApproved && rejectionReason) {
        product.rejectionReason = rejectionReason;
    }

    await product.save();
    try {
        // Notify seller of approval/rejection
        if (product.sellerId) {
            await Notification.create({
                userId: product.sellerId,
                userModel: 'Seller',
                type: isApproved ? 'success' : 'warning',
                title: isApproved ? 'Product Approved' : 'Product Rejected',
                message: isApproved ? `Your product ${product.name} was approved` : `Your product ${product.name} was rejected${rejectionReason ? `: ${rejectionReason}` : ''}`,
                metadata: { productId: product._id }
            });
        }
    } catch {}

    res.status(200).json(new ApiResponse(200, product, 
        isApproved ? "Product approved successfully" : "Product rejected successfully"));
});

export const getPendingProducts = asyncHandler(async (req, res) => {
    const pendingProducts = await Product.find({ isApproved: false })
        .populate('shopId', 'name');

    res.status(200).json(new ApiResponse(200, pendingProducts, "Pending products retrieved successfully"));
});

// Get all products with filtering options
export const getAllProducts = asyncHandler(async (req, res) => {
    console.log('🔍 Admin getAllProducts called');
    
    const { status, page = 1, limit = 20, search } = req.query;
    console.log('🔍 Query params:', { status, page, limit, search });
    
    // Build query
    const query = {};
    
    // Status filter
    if (status === 'pending') {
        query.isApproved = { $exists: false };
    } else if (status === 'approved') {
        query.isApproved = true;
    } else if (status === 'rejected') {
        query.isApproved = false;
    }
    // If status is 'all' or not provided, don't filter by approval status
    
    // Search filter
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
        ];
    }
    
    console.log('🔍 Final query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(query)
        .populate({
            path: 'shopId',
            select: 'name sellerId',
            populate: {
                path: 'sellerId',
                select: 'name email'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    
    const total = await Product.countDocuments(query);
    
    console.log('🔍 Found products:', products.length);
    console.log('🔍 Total products:', total);

    res.status(200).json(new ApiResponse(200, {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    }, "Products retrieved successfully"));
});

// Shop Approval
export const approveShop = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { isApproved, rejectionReason } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new ApiError("Shop not found", 404, "Shop not found");
    }

    shop.isApproved = isApproved;
    if (!isApproved && rejectionReason) {
        shop.rejectionReason = rejectionReason;
    }

    await shop.save();
    try {
        // Notify seller of approval/rejection
        if (shop.sellerId) {
            await Notification.create({
                userId: shop.sellerId,
                userModel: 'Seller',
                type: isApproved ? 'success' : 'warning',
                title: isApproved ? 'Shop Approved' : 'Shop Rejected',
                message: isApproved ? `Your shop ${shop.name} was approved` : `Your shop ${shop.name} was rejected${rejectionReason ? `: ${rejectionReason}` : ''}`,
                metadata: { shopId: shop._id }
            });
        }
    } catch {}

    res.status(200).json(new ApiResponse(200, shop, 
        isApproved ? "Shop approved successfully" : "Shop rejected successfully"));
});

export const getPendingShops = asyncHandler(async (req, res) => {
    console.log('🔍 Admin getPendingShops called');
    
    const pendingShops = await Shop.find({ isApproved: false })
        .populate('sellerId', 'name email');
    
    console.log('🔍 Found pending shops:', pendingShops.length);
    console.log('🔍 Pending shops data:', pendingShops);

    res.status(200).json(new ApiResponse(200, pendingShops, "Pending shops retrieved successfully"));
});

// Get all shops with filtering options
export const getAllShops = asyncHandler(async (req, res) => {
    console.log('🔍 Admin getAllShops called');
    
    const { status, page = 1, limit = 20, search } = req.query;
    console.log('🔍 Query params:', { status, page, limit, search });
    
    // Build query
    const query = {};
    
    // Status filter
    if (status === 'pending') {
        query.isApproved = false;
    } else if (status === 'approved') {
        query.isApproved = true;
    }
    // If status is 'all' or not provided, don't filter by approval status
    
    // Search filter
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
            { state: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
        ];
    }
    
    console.log('🔍 Final query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const shops = await Shop.find(query)
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    
    const total = await Shop.countDocuments(query);
    
    console.log('🔍 Found shops:', shops.length);
    console.log('🔍 Total shops:', total);
    console.log('🔍 Shops data:', shops);

    res.status(200).json(new ApiResponse(200, {
        shops,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    }, "Shops retrieved successfully"));
});

// Seller Management
export const getSellers = asyncHandler(async (req, res) => {
    console.log('🔍 Admin getSellers called');
    
    const { status, page = 1, limit = 20, search } = req.query;
    console.log('🔍 Query params:', { status, page, limit, search });
    
    // Build query
    const query = {};
    
    // Status filter (sellers don't have approval status, but we can filter by verification)
    if (status === 'pending') {
        query.is_verified = 0;
    } else if (status === 'approved') {
        query.is_verified = 1;
    }
    // If status is 'all' or not provided, don't filter by verification status
    
    // Search filter
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { mobile: { $regex: search, $options: 'i' } }
        ];
    }
    
    console.log('🔍 Final query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const sellers = await Seller.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    
    console.log('🔍 Found sellers:', sellers.length);

    // Get shops for each seller
    const sellersWithShops = await Promise.all(
        sellers.map(async (seller) => {
            const shops = await Shop.find({ sellerId: seller._id })
                .select('name isActive isApproved');
            
            return {
                ...seller.toObject(),
                shops: shops
            };
        })
    );
    
    const total = await Seller.countDocuments(query);
    
    console.log('🔍 Sellers with shops:', sellersWithShops.length);
    console.log('🔍 Total sellers:', total);

    res.status(200).json(new ApiResponse(200, {
        sellers: sellersWithShops,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    }, "Sellers retrieved successfully"));
});

export const toggleSellerStatus = asyncHandler(async (req, res) => {
    const { sellerId } = req.params;
    const { isActive } = req.body;

    const seller = await Seller.findById(sellerId);
    if (!seller) {
        throw new ApiError("Seller not found", 404, "Seller not found");
    }

    // Toggle associated shop status (seller accounts don't have isActive field)
    const shops = await Shop.find({ sellerId: seller._id });
    if (shops.length > 0) {
        await Shop.updateMany(
            { sellerId: seller._id },
            { isActive: isActive }
        );
    }

    res.status(200).json(new ApiResponse(200, { seller, shops }, 
        `Seller shops ${isActive ? 'activated' : 'deactivated'} successfully`));
});

export const getCsrfToken = (req, res) => {
    res.status(200).json({ csrfToken: req.csrfToken() });
};

// ==================== DRONE FLEET MANAGEMENT ====================

/**
 * Get all drones in the fleet
 */
export const getDrones = asyncHandler(async (req, res) => {
    try {
        const drones = await Drone.find({ is_active: true }).select('-__v');
        
        res.status(200).json(new ApiResponse(200, drones, 'Drones retrieved successfully'));
    } catch (error) {
        console.error('Error fetching drones:', error);
        throw new ApiError('Failed to fetch drones', 500, error.message);
    }
});

/**
 * Add a new drone to the fleet
 */
export const addDrone = asyncHandler(async (req, res) => {
    try {
        const { droneId, wsUrl, model = 'Generic Drone', capabilities = ['takeoff', 'land', 'navigate'] } = req.body;
        
        // Validate required fields
        if (!droneId || !wsUrl) {
            throw new ApiError('Missing required fields', 400, 'Drone ID and WebSocket URL are required');
        }
        
        // Check if drone already exists
        const existingDrone = await Drone.findOne({ droneId });
        if (existingDrone) {
            throw new ApiError('Drone already exists', 409, 'A drone with this ID already exists');
        }
        
        // Create new drone
        const drone = new Drone({
            droneId,
            wsUrl,
            model,
            capabilities,
            status: 'offline',
            is_active: true,
            registeredAt: new Date()
        });
        
        await drone.save();
        
        res.status(201).json(new ApiResponse(201, drone, 'Drone added successfully'));
    } catch (error) {
        console.error('Error adding drone:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError('Failed to add drone', 500, error.message);
    }
});

/**
 * Remove a drone from the fleet
 */
export const removeDrone = asyncHandler(async (req, res) => {
    try {
        const { droneId } = req.params;
        
        const drone = await Drone.findOneAndDelete({ droneId });
        if (!drone) {
            throw new ApiError('Drone not found', 404, 'Drone does not exist');
        }
        
        res.status(200).json(new ApiResponse(200, drone, 'Drone removed successfully'));
    } catch (error) {
        console.error('Error removing drone:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError('Failed to remove drone', 500, error.message);
    }
});

/**
 * Get fleet overview with connection status
 */
export const getFleetOverview = asyncHandler(async (req, res) => {
    try {
        const { droneDiscoveryService } = await import('../services/droneDiscoveryService.js');
        const overview = droneDiscoveryService.getFleetOverview();
        
        res.status(200).json(new ApiResponse(200, overview, 'Fleet overview retrieved successfully'));
    } catch (error) {
        console.error('Error fetching fleet overview:', error);
        throw new ApiError('Failed to fetch fleet overview', 500, error.message);
    }
});