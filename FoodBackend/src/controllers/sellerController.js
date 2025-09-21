import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Seller } from "../models/sellerModel.js";
import { Shop } from "../models/shopModel.js";
import { Product } from "../models/productsModel.js";
import { Offer } from "../models/offersModel.js";

import uploadOnCloudinary from "../utils/cloudinary.js";
import { generateAccessAndRefreshTokens } from "../utils/tokenUtils.js";
import jwt from "jsonwebtoken";
import  Order  from "../models/ordersModel.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../utils/emails.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";

// Register seller
export const registerSeller = asyncHandler(async (req, res) => {
    const { name, email, password, mobile, address } = req.body;

    if ([name, email, password, mobile, address].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedSeller = await Seller.findOne({
        $or: [{ email }, { mobile }]
    });

    if (existedSeller) {
        throw new ApiError(409, "Seller with email or mobile already exists");
    }

    const verificationToken = generateVerificationCode();

    const seller = await Seller.create({
        name,
        email,
        password,
        mobile,
        address,
        verificationToken,
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    const createdSeller = await Seller.findById(seller._id).select("-password -refreshTokens");

    if (!createdSeller) {
        throw new ApiError(500, "Something went wrong while registering the seller");
    }

    try {
        await sendVerificationEmail(seller.name, seller.email, verificationToken);
        console.log('Email verification enabled - verification email sent to seller');

    return res.status(201).json(
            new ApiResponse(201, createdSeller, "Seller registered successfully. Please check your email for verification.")
        );
    } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        
        // Check if this is a development environment with missing SMTP config
        if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
            console.log('⚠️ SMTP not configured - auto-verifying seller for development');
            seller.is_verified = true;
            seller.verificationToken = undefined;
            seller.verificationTokenExpiresAt = undefined;
            await seller.save();
            
            return res.status(201).json(
                new ApiResponse(201, createdSeller, "Seller registered successfully (auto-verified for development). Please configure SMTP for production.")
            );
        } else {
            // Delete the seller if email fails to send and SMTP is configured
            await Seller.findByIdAndDelete(seller._id);
            throw new ApiError("Registration failed", 500, "Failed to send verification email. Please try again.");
        }
    }
});

// Verify seller email
export const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    console.log('Seller verification attempt:', { code, timestamp: new Date().toISOString() });
    
    const seller = await Seller.findOne({
        verificationToken: code,
        verificationTokenExpiresAt: { $gt: Date.now() }
    })

    if (!seller) {
        console.log('Seller verification failed: Invalid or expired code');
        throw new ApiError("Error while verifying the email", 400, "Invalid or expired verification code")
    }
    
    console.log('Seller found for verification:', { sellerId: seller._id, email: seller.email });
    
    seller.is_verified = true;
    seller.verificationToken = undefined;
    seller.verificationTokenExpiresAt = undefined
    await seller.save();
    
    try {
        await sendWelcomeEmail(seller.name, seller.email);
        console.log('Welcome email sent successfully to seller:', seller.email);
    } catch (emailError) {
        console.error('Failed to send welcome email to seller:', emailError);
        // Don't fail verification if welcome email fails
    }
    
    console.log('Seller email verified successfully:', seller.email);
    return res.status(200).json(
        new ApiResponse(200, {}, "Email verified successfully", true)
    )
})

// Resend verification code for seller
export const resendVerificationCode = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError("Missing email", 400, "Email is required");
    }

    console.log('Seller resend verification attempt:', { email, timestamp: new Date().toISOString() });

    const seller = await Seller.findOne({ email });
    if (!seller) {
        console.log('Seller resend verification failed: Seller not found:', email);
        throw new ApiError("Seller not found", 404, "No seller with this email");
    }
    if (seller.is_verified) {
        console.log('Seller resend verification failed: Email already verified:', email);
        return res.status(200).json(new ApiResponse(200, {}, "Email already verified", true));
    }

    const verificationToken = generateVerificationCode();
    console.log('Generated new verification token for seller:', { email, token: verificationToken });
    
    seller.verificationToken = verificationToken;
    seller.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await seller.save();
    console.log('Seller verification token updated in database:', { sellerId: seller._id, email: seller.email });

    try {
        console.log('Attempting to resend verification email to seller:', seller.email);
        await sendVerificationEmail(seller.name, seller.email, verificationToken);
        console.log('Verification email resent successfully to seller:', seller.email);
        return res.status(200).json(new ApiResponse(200, {}, "Verification code resent", true));
    } catch (emailError) {
        console.error("Failed to resend verification email:", emailError);
        
        // Check if this is a development environment with missing SMTP config
        if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
            console.log('⚠️ SMTP not configured - auto-verifying seller for development');
            seller.is_verified = true;
            seller.verificationToken = undefined;
            seller.verificationTokenExpiresAt = undefined;
            await seller.save();
            
            return res.status(200).json(new ApiResponse(200, {}, "Verification code resent (auto-verified for development)", true));
        } else {
            // Revert the token changes if email fails and SMTP is configured
            seller.verificationToken = undefined;
            seller.verificationTokenExpiresAt = undefined;
            await seller.save();
            throw new ApiError("Failed to resend verification", 500, "Failed to send verification email. Please try again.");
        }
    }
});

// Login seller
export const loginSeller = asyncHandler(async (req, res) => {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const seller = await Seller.findOne({ email });

    if (!seller) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await seller.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    if (!seller.is_verified) {
        throw new ApiError(401, "Email not verified. Please check your email for verification code.");
    }

    // Clear old refresh tokens before generating new ones (Industry Standard)
    seller.refreshTokens = [];
    await seller.save({ validateBeforeSave: false });

    // Generate tokens with proper parameters
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(seller._id, deviceId, 'Seller');

    const loggedInSeller = await Seller.findById(seller._id).select("-password -refreshTokens");

    // Options for sensitive tokens (httpOnly for security)
    const secureOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax"
    };

    // Options for frontend-readable cookies
    const frontendOptions = {
        httpOnly: false, // Allow frontend to read
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax"
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, secureOptions)
        .cookie("refreshToken", refreshToken, secureOptions)
        .cookie("userRole", "seller", frontendOptions) // Frontend can read this
        .cookie("deviceId", deviceId || "default", frontendOptions) // Frontend can read this
        .json(
            new ApiResponse(
                200,
                {
                    seller: loggedInSeller,
                    accessToken,
                    refreshToken,
                },
                "Seller logged in successfully"
            )
        );
});

// Logout seller
export const logoutSeller = asyncHandler(async (req, res) => {
    const { deviceId } = req.body;
    
    if (deviceId) {
        // Remove specific device's refresh token
        await Seller.findByIdAndUpdate(
            req.seller._id,
            {
                $pull: { refreshTokens: { deviceId } }
            },
            {
                new: true
            }
        );
    } else {
        // Remove all refresh tokens (full logout)
        await Seller.findByIdAndUpdate(
            req.seller._id,
            {
                $set: { refreshTokens: [] }
            },
            {
                new: true
            }
        );
    }

    // Options for clearing cookies (must match the options used when setting them)
    const secureOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax"
    };

    const frontendOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax"
    };

    return res
        .status(200)
        .clearCookie("accessToken", secureOptions)
        .clearCookie("refreshToken", secureOptions)
        .clearCookie("userRole", frontendOptions) // Clear userRole cookie
        .clearCookie("deviceId", frontendOptions) // Clear deviceId cookie
        .json(new ApiResponse(200, {}, "Seller logged out"));
});

// Refresh access token
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const { deviceId } = req.body;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const seller = await Seller.findById(decodedToken?._id);

        if (!seller) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Check if the refresh token exists in the seller's refreshTokens array
        let tokenExists;
        if (deviceId) {
            // Check for specific device
            tokenExists = seller.refreshTokens && seller.refreshTokens.some(rt => rt.token === incomingRefreshToken && rt.deviceId === deviceId);
        } else {
            // Check for any matching token (fallback for backward compatibility)
            tokenExists = seller.refreshTokens && seller.refreshTokens.some(rt => rt.token === incomingRefreshToken);
        }
        
        if (!tokenExists) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(seller._id, deviceId, 'Seller');

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// Get current seller
export const getCurrentSeller = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.seller, "Seller fetched successfully")
    );
});



// Update seller profile
export const updateSellerProfile = asyncHandler(async (req, res) => {
    const { name, email, mobile, address } = req.body;

    if (!name && !email && !mobile && !address) {
        throw new ApiError(400, "At least one field is required");
    }

    const seller = await Seller.findByIdAndUpdate(
        req.seller._id,
        {
            $set: {
                ...(name && { name }),
                ...(email && { email }),
                ...(mobile && { mobile }),
                ...(address && { address })
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, seller, "Profile updated successfully")
    );
});

// Change password
export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const seller = await Seller.findById(req.seller._id);
    const isPasswordCorrect = await seller.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    seller.password = newPassword;
    await seller.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

// Get seller dashboard
export const getSellerDashboard = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;

    // Get seller's shops
    const shops = await Shop.find({ sellerId }).select('name isActive isApproved');

    // Get shop IDs to find products
    const shopIds = shops.map(shop => shop._id);
    
    // Get total products across all shops
    const totalProducts = await Product.countDocuments({ shopId: { $in: shopIds } });

    // Get total offers
    const totalOffers = await Offer.countDocuments({ sellerId });

    // Get recent products
    const recentProducts = await Product.find({ shopId: { $in: shopIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name price image');

    // Get recent offers
    const recentOffers = await Offer.find({ sellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title discountPercentage');

    const dashboardData = {
        shops,
        totalProducts,
        totalOffers,
        recentProducts,
        recentOffers
    };

    return res.status(200).json(
        new ApiResponse(200, dashboardData, "Dashboard data fetched successfully")
    );
});

// Get seller shops
export const getSellerShops = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;

    const shops = await Shop.find({ sellerId })
        .select('name description state city location pincode contactNumber openingHours closingHours isActive isApproved createdAt productId')
        .populate('productId', 'name price image');

    return res.status(200).json(
        new ApiResponse(200, shops, "Shops fetched successfully")
    );
});

// Get seller products
export const getSellerProducts = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;

    // First get all shops of the seller
    const sellerShops = await Shop.find({ sellerId }).select('_id name');
    const shopIds = sellerShops.map(shop => shop._id);

    // Then get products from those shops
    const products = await Product.find({ shopId: { $in: shopIds } })
        .populate('shopId', 'name')
        .select('name description price image available stock discount isApproved');

    return res.status(200).json(
        new ApiResponse(200, products, "Products fetched successfully")
    );
});

// Get seller offers
export const getSellerOffers = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;

    const offers = await Offer.find({ sellerId })
        .populate('productId', 'name price image')
        .select('title description discountPercentage startDate endDate productId');

    return res.status(200).json(
        new ApiResponse(200, offers, "Offers fetched successfully")
    );
});

// Create shop
export const createShop = asyncHandler(async (req, res) => {
    const { 
        name, 
        description, 
        state, 
        city, 
        location, 
        pincode,
        latitude,
        longitude,
        FSSAI_license,
        Eating_house_license,
        Healt_or_trade_license,
        Liquior_license,
        Gst_registration,
        Environmental_clearance_license,
        Fire_safety_license,
        Signage_license,
        Shop_act,
        Insurance,
        contactNumber,
        openingHours,
        closingHours
    } = req.body;

    if (!name || !state || !city || !location || !pincode || !openingHours || !closingHours) {
        throw new ApiError(400, "Name, state, city, location, pincode, opening hours, and closing hours are required");
    }

    const sellerId = req.seller._id;

    // Check if seller already has a shop with this name
    const existingShop = await Shop.findOne({ sellerId, name });
    if (existingShop) {
        throw new ApiError(400, "Shop with this name already exists");
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (req.file) {
        const localImagePath = req.file.path;
        const result = await uploadOnCloudinary(localImagePath);
        imageUrl = result?.url;
    }

    const shop = await Shop.create({
        name,
        description,
        state,
        city,
        location,
        pincode,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        FSSAI_license,
        Eating_house_license,
        Healt_or_trade_license,
        Liquior_license,
        Gst_registration,
        Environmental_clearance_license,
        Fire_safety_license,
        Signage_license,
        Shop_act,
        Insurance,
        contactNumber: contactNumber ? parseInt(contactNumber) : undefined,
        openingHours,
        closingHours,
        image: imageUrl,
        sellerId
    });

    return res.status(201).json(
        new ApiResponse(201, shop, "Shop created successfully")
    );
});

// Update shop
export const updateShop = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { 
        name, 
        description, 
        state, 
        city, 
        location, 
        pincode,
        latitude,
        longitude,
        FSSAI_license,
        Eating_house_license,
        Healt_or_trade_license,
        Liquior_license,
        Gst_registration,
        Environmental_clearance_license,
        Fire_safety_license,
        Signage_license,
        Shop_act,
        Insurance,
        contactNumber,
        openingHours,
        closingHours
    } = req.body;

    const sellerId = req.seller._id;

    const shop = await Shop.findOne({ _id: shopId, sellerId });
    if (!shop) {
        throw new ApiError("Shop not found", 404, []);
    }

    // Handle image upload if provided
    let imageUrl = shop.image; // Keep existing image if no new one
    if (req.file) {
        const localImagePath = req.file.path;
        const result = await uploadOnCloudinary(localImagePath);
        imageUrl = result?.url;
    }

    const updatedShop = await Shop.findByIdAndUpdate(
        shopId,
        {
            $set: {
                ...(name && { name }),
                ...(description && { description }),
                ...(state && { state }),
                ...(city && { city }),
                ...(location && { location }),
                ...(pincode && { pincode }),
                ...(latitude && { latitude: parseFloat(latitude) }),
                ...(longitude && { longitude: parseFloat(longitude) }),
                ...(FSSAI_license && { FSSAI_license }),
                ...(Eating_house_license && { Eating_house_license }),
                ...(Healt_or_trade_license && { Healt_or_trade_license }),
                ...(Liquior_license && { Liquior_license }),
                ...(Gst_registration && { Gst_registration }),
                ...(Environmental_clearance_license && { Environmental_clearance_license }),
                ...(Fire_safety_license && { Fire_safety_license }),
                ...(Signage_license && { Signage_license }),
                ...(Shop_act && { Shop_act }),
                ...(Insurance && { Insurance }),
                ...(contactNumber && { contactNumber: parseInt(contactNumber) }),
                ...(openingHours && { openingHours }),
                ...(closingHours && { closingHours }),
                ...(imageUrl && { image: imageUrl })
            }
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedShop, "Shop updated successfully")
    );
});



// Delete shop
export const deleteShop = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const sellerId = req.seller._id;

    const shop = await Shop.findOne({ _id: shopId, sellerId });
    if (!shop) {
        throw new ApiError(404, "Shop not found");
    }

    // Check if shop has products
    const productCount = await Product.countDocuments({ shopId });
    if (productCount > 0) {
        throw new ApiError(400, "Cannot delete shop with existing products");
    }

    await Shop.findByIdAndDelete(shopId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Shop deleted successfully")
    );
});

// Create product
export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, category, shopId, stock, discount } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !shopId) {
        throw new ApiError(400, "Name, description, price, category, and shopId are required");
    }

    // Validate and parse numeric fields
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new ApiError(400, "Price must be a valid positive number");
    }

    let parsedStock = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
        parsedStock = parseInt(stock);
        if (isNaN(parsedStock) || parsedStock < 0) {
            throw new ApiError(400, "Stock must be a valid non-negative integer");
        }
    }

    let parsedDiscount = 0;
    if (discount !== undefined && discount !== null && discount !== '') {
        parsedDiscount = parseFloat(discount);
        if (isNaN(parsedDiscount) || parsedDiscount < 0) {
            throw new ApiError(400, "Discount must be a valid non-negative number");
        }
    }

    const sellerId = req.seller._id;

    // Verify shop belongs to seller
    const shop = await Shop.findOne({ _id: shopId, sellerId });
    if (!shop) {
        throw new ApiError(404, "Shop not found or does not belong to you");
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (req.file) {
        try {
            const localImagePath = req.file.path;
            const result = await uploadOnCloudinary(localImagePath);
            imageUrl = result?.url;
        } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            throw new ApiError(400, "Failed to upload image. Please try again.");
        }
    }

    const product = await Product.create({
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        category: category.trim(),
        shopId,
        stock: parsedStock,
        discount: parsedDiscount,
        image: imageUrl,
        available: true
    });

    return res.status(201).json(
        new ApiResponse(201, product, "Product created successfully")
    );
});

// Update product
export const updateProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { name, description, price, category, isAvailable, stock, discount } = req.body;

    const sellerId = req.seller._id;

    // First find the product
    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Verify the product belongs to a shop owned by the seller
    const shop = await Shop.findOne({ _id: product.shopId, sellerId });
    if (!shop) {
        throw new ApiError(404, "Product not found");
    }

    // Handle image upload if provided
    let imageUrl = product.image; // Keep existing image if no new one
    if (req.file) {
        const localImagePath = req.file.path;
        const result = await uploadOnCloudinary(localImagePath);
        imageUrl = result?.url;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
            $set: {
                ...(name && { name }),
                ...(description && { description }),
                ...(price && { price: parseFloat(price) }),
                ...(category && { category }),
                ...(typeof isAvailable === 'boolean' && { available: isAvailable }),
                ...(stock && { stock: parseInt(stock) }),
                ...(discount && { discount: parseFloat(discount) }),
                ...(imageUrl && { image: imageUrl })
            }
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
    );
});

// Delete product
export const deleteProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const sellerId = req.seller._id;

    // First find the product
    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Verify the product belongs to a shop owned by the seller
    const shop = await Shop.findOne({ _id: product.shopId, sellerId });
    if (!shop) {
        throw new ApiError(404, "Product not found");
    }

    await Product.findByIdAndDelete(productId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Product deleted successfully")
    );
});







// Get seller home data (comprehensive data for dashboard)
export const getSellerHome = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;
    console.log('🔍 Seller ID:', sellerId);

    // Get seller's shops
    const shops = await Shop.find({ sellerId })
        .select('name description state city location pincode contactNumber openingHours closingHours isActive isApproved productId')
        .populate('productId', 'name price image');

    console.log('🔍 Seller shops found:', shops.length);
    console.log('🔍 Shop data:', shops);

    // Get shop IDs to find products
    const shopIds = shops.map(shop => shop._id);
    
    // Get total products across all shops
    const totalProducts = await Product.countDocuments({ shopId: { $in: shopIds } });

    // Get total offers
    const totalOffers = await Offer.countDocuments({ sellerId });

    // Get total orders
    const totalOrders = await Order.countDocuments({
        'shops.shopId': { $in: shopIds }
    });

    // Get recent products
    const recentProducts = await Product.find({ shopId: { $in: shopIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name price image');

    // Get recent offers
    const recentOffers = await Offer.find({ sellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title discountPercentage');

    // Get recent orders
    const recentOrders = await Order.find({
        'shops.shopId': { $in: shopIds }
    })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email mobile')
        .populate('shops.shopId', 'name')
        .populate('shops.products.productId', 'name price image');

    const homeData = {
        shop: shops[0] || null, // Most sellers have one shop
        productCount: totalProducts,
        offerCount: totalOffers,
        orderCount: totalOrders,
        recentProducts,
        recentOffers,
        recentOrders
    };

    console.log('🔍 Home data being sent:', homeData);
    console.log('🔍 Shop being sent:', homeData.shop);

    return res.status(200).json(
        new ApiResponse(200, homeData, "Home data fetched successfully")
    );
});

// Get seller statistics
export const getSellerStats = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;

    const totalShops = await Shop.countDocuments({ sellerId });
    
    // Get shop IDs to count products
    const shopIds = await Shop.find({ sellerId }).select('_id');
    const totalProducts = await Product.countDocuments({ shopId: { $in: shopIds } });
    
    const totalOffers = await Offer.countDocuments({ sellerId });
    const activeShops = await Shop.countDocuments({ sellerId, isActive: true });

    const stats = {
        totalShops,
        totalProducts,
        totalOffers,
        activeShops
    };

    return res.status(200).json(
        new ApiResponse(200, stats, "Statistics fetched successfully")
    );
});

// Get seller orders
export const getSellerOrders = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;
    console.log('🧾 [SellerOrders] Fetch begin', { sellerId: sellerId?.toString(), ts: new Date().toISOString() });
    
    // Get all shops of the seller
    const sellerShops = await Shop.find({ sellerId }).select('_id name sellerId');
    const shopIds = sellerShops.map(shop => shop._id);
    console.log('🧾 [SellerOrders] Shops resolved', { count: sellerShops.length, shopIds: shopIds.map(id => id.toString()) });
    
    // Find regular orders that contain products from seller's shops
    const orders = await Order.find({
        'shops.shopId': { $in: shopIds }
    })
    .populate('user', 'name email mobile')
    .populate('shops.shopId', 'name')
    .populate('shops.products.productId', 'name price image')
    .sort({ createdAt: -1 });

    // Get drone orders for this seller (fallback also by shopIds embedded in orderDetails)
    const { DroneOrder } = await import('../models/droneOrderModel.js');
    const droneOrders = await DroneOrder.find({
        $or: [
            { sellerId },
            { 'orderDetails.shops.shopId': { $in: shopIds } }
        ]
    })
        .populate('userId', 'name email mobile')
        .populate('droneId', 'droneId name model status location battery')
        .sort({ createdAt: -1 });



    // Group orders by status for frontend compatibility
    const groupedOrders = {
      arrived: [],
      preparing: [],
      ready: [],
      inTransit: [],
      delivered: [],
      cancelled: []
    };

    // Process regular orders
    orders.forEach(order => {
      // Find the shop status for this seller's shop
      const sellerShop = order.shops.find(shop => {
        const shopId = shop.shopId._id || shop.shopId;
        // Convert to string for comparison
        const shopIdStr = shopId.toString();
        const shopIdsStr = shopIds.map(id => id.toString());
        const isMatch = shopIdsStr.includes(shopIdStr);
        return isMatch;
      });
      
      if (sellerShop) {
        const status = sellerShop.status;
        
        switch (status) {
          case 'arrived':
            groupedOrders.arrived.push(order);
            break;
          case 'preparing':
            groupedOrders.preparing.push(order);
            break;
          case 'ready':
            groupedOrders.ready.push(order);
            break;
          case 'delivered':
            groupedOrders.delivered.push(order);
            break;
          case 'cancelled':
            groupedOrders.cancelled.push(order);
            break;
          default:
            groupedOrders.arrived.push(order);
        }
      }
    });

    // Process drone orders and add them to the appropriate groups
    for (const droneOrder of droneOrders) {
        const status = droneOrder.status;

        // Extract order details from the drone order
        const orderDetails = droneOrder.orderDetails || {};
        const shops = orderDetails.shops || [];

        // Resolve a real shopId for UI/actions: prefer embedded shopId, else seller's first shop
        const embeddedShopId = shops?.[0]?.shopId || null;
        const sellerShopFallback = sellerShops?.[0]?._id || null;
        const resolvedShopId = embeddedShopId || sellerShopFallback;
        const resolvedShopName = (() => {
            if (embeddedShopId) {
                const match = sellerShops.find(s => s._id?.toString() === embeddedShopId?.toString());
                if (match) return match.name;
            }
            const first = sellerShops?.[0];
            return first?.name || 'Shop';
        })();

        // Populate product details for each product in shops
        const allProductIds = [];
        for (const shop of shops) {
            for (const item of (shop.products || [])) {
                if (item.productId) {
                    allProductIds.push(item.productId);
                }
            }
        }

        let productIdToDoc = new Map();
        if (allProductIds.length > 0) {
            const uniqueIds = [...new Set(allProductIds.map(id => id.toString()))];
            const products = await Product.find({ _id: { $in: uniqueIds } }).select('name price image');
            productIdToDoc = new Map(products.map(p => [p._id.toString(), p]));
        }

        // Convert drone order to a format compatible with regular orders
        const formattedDroneOrder = {
            _id: droneOrder._id,
            orderId: droneOrder._id, // Use drone order ID as order ID
            orderNumber: droneOrder.orderNumber,
            deliveryType: 'drone',
            orderType: 'drone',
            status: status,
            totalPrice: droneOrder.pricing?.totalPrice || orderDetails.totalPrice || 0,
            totalQuantity: orderDetails.totalQuantity || 0,
            isPaid: orderDetails.isPaid || false,
            orderToken: orderDetails.orderToken,
            payment: orderDetails.payment || {},
            user: droneOrder.userId,
            shops: shops.map(shop => ({
                shopId: {
                    _id: resolvedShopId,
                    name: resolvedShopName
                },
                status: shop.status || 'arrived',
                products: (shop.products || []).map(item => ({
                    productId: productIdToDoc.get((item.productId || '').toString()) || item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    totalPrice: item.totalPrice,
                    variant: item.variant
                })),
                totalQuantity: shop.totalQuantity || 0,
                totalPrice: shop.totalPrice || 0
            })),
            pickupLocation: droneOrder.location?.pickup,
            deliveryLocation: droneOrder.location?.delivery,
            createdAt: droneOrder.createdAt,
            updatedAt: droneOrder.updatedAt,
            drone: droneOrder.droneId,
            droneOrder: droneOrder
        };

        // Map drone order status to seller UI groups (introduce inTransit)
        switch (status) {
            case 'pending':
            case 'weather_blocked':
                groupedOrders.arrived.push(formattedDroneOrder);
                break;
            case 'preparing':
                groupedOrders.preparing.push(formattedDroneOrder);
                break;
            case 'ready_for_pickup':
                groupedOrders.ready.push(formattedDroneOrder);
                break;
            case 'assigned':
            case 'drone_en_route':
            case 'picked_up':
            case 'in_transit':
            case 'approaching_delivery':
                groupedOrders.inTransit.push(formattedDroneOrder);
                break;
            case 'delivered':
                groupedOrders.delivered.push(formattedDroneOrder);
                break;
            case 'cancelled':
            case 'failed':
                groupedOrders.cancelled.push(formattedDroneOrder);
                break;
            default:
                groupedOrders.arrived.push(formattedDroneOrder);
        }
    }

    try {
      console.log('🧾 [SellerOrders] Grouped summary', {
        counts: {
          arrived: groupedOrders.arrived.length,
          preparing: groupedOrders.preparing.length,
          ready: groupedOrders.ready.length,
          inTransit: groupedOrders.inTransit.length,
          delivered: groupedOrders.delivered.length,
          cancelled: groupedOrders.cancelled.length
        },
        sampleIds: {
          arrived: groupedOrders.arrived.slice(0, 3).map(o => o._id?.toString()),
          preparing: groupedOrders.preparing.slice(0, 3).map(o => o._id?.toString()),
          ready: groupedOrders.ready.slice(0, 3).map(o => o._id?.toString())
        }
      });
    } catch {}

    const legacyShape = {
      arrivedOrders: groupedOrders.arrived,
      processingOrders: groupedOrders.preparing,
      readyOrders: groupedOrders.ready,
      deliveredOrders: groupedOrders.delivered,
      cancelledOrders: groupedOrders.cancelled
    };

    return res.status(200).json(
        new ApiResponse(200, { ...groupedOrders, ...legacyShape }, "Orders fetched successfully")
    );
});

// Update order status (Accept → Process → Ready → Cancel) - Updated for both regular and drone orders
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderId, shopId, status, cancelReason } = req.body;
    const sellerId = req.seller._id;
    console.log('🧾 [SellerOrders] Update request', { orderId, shopId, status, sellerId: sellerId?.toString(), cancelReason });

    // Validate status
    const allowedStatuses = ['arrived', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
        throw new ApiError('Invalid status', 400, 'Status must be one of: arrived, preparing, ready, delivered, cancelled');
    }

    // First: handle DroneOrder by direct id with ownership checks
    try {
        const { DroneOrder } = await import('../models/droneOrderModel.js');
        const droneOrder = await DroneOrder.findOne({
            _id: orderId,
            $or: [ { sellerId }, { 'orderDetails.shops.shopId': shopId } ]
        }).populate('userId', 'name email mobile');

        if (droneOrder) {
            let droneStatus = droneOrder.status;
            let isReadyForPickup = false;

            switch (status) {
                case 'preparing':
                    droneStatus = 'preparing';
                    break;
                case 'ready':
                    droneStatus = 'ready_for_pickup';
                    isReadyForPickup = true;
                    break;
                case 'cancelled':
                    droneStatus = 'cancelled';
                    break;
                default:
                    throw new ApiError('Invalid status update for drone order', 400, "Sellers can only mark drone orders as 'preparing', 'ready', or 'cancelled'.");
            }

            console.log('🧾 [SellerOrders] Drone order status map', { from: status, to: droneStatus, droneOrderId: droneOrder._id.toString() });
            await droneOrder.updateStatus(droneStatus, cancelReason || 'Status updated by seller', sellerId, 'Seller');

            // Optional: notify user when ready
            if (isReadyForPickup) {
                try {
                    const { Notification } = await import('../models/notificationModel.js');
                    await Notification.create({
                        userId: droneOrder.userId,
                        userModel: 'User',
                        type: 'order',
                        title: 'Your Order is Ready!',
                        message: `Your order #${droneOrder.orderNumber} is now ready for drone pickup.`,
                        metadata: { droneOrderId: droneOrder._id }
                    });
                } catch {}
            }

            return res.status(200).json(new ApiResponse(200, droneOrder, 'Drone order status updated successfully'));
        }
    } catch (e) {
        // fall through to regular order handling
    }

    // Regular Order handling
    const order = await Order.findOne({ _id: orderId, 'shops.shopId': shopId })
        .populate('user', 'name email mobile')
        .populate('shops.shopId', 'name')
        .populate('shops.products.productId', 'name price image');

    if (!order) {
        throw new ApiError('Order not found or you do not have permission to update it', 404);
    }

    const shopIndex = order.shops.findIndex(s => (s.shopId._id || s.shopId).toString() === shopId.toString());
    if (shopIndex === -1) {
        throw new ApiError('Shop not found within this order', 404);
    }

    order.shops[shopIndex].status = status;
    if (cancelReason) {
        order.shops[shopIndex].cancelReason = cancelReason;
    }
    await order.save();

    // Sync top-level status
    try {
        const statusMap = {
            arrived: 'confirmed',
            preparing: 'preparing',
            ready: 'ready',
            delivered: 'delivered',
            cancelled: 'cancelled'
        };
        const mapped = statusMap[status] || order?.status?.current || 'pending';
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                'status.current': mapped,
                'status.lastUpdated': new Date()
            },
            $push: {
                'status.history': {
                    status: mapped,
                    timestamp: new Date(),
                    updatedBy: sellerId,
                    updatedByModel: 'Seller',
                    notes: cancelReason || ''
                }
            }
        });
    } catch (syncErr) {
        console.warn('⚠️ Failed to sync top-level order status:', syncErr?.message);
    }

    // Archive on delivered
    if (status === 'delivered') {
        try {
            const { archiveOrder } = await import('../utils/orderUtils.js');
            await archiveOrder(order._id);
        } catch (err) {
            console.warn('⚠️ Failed to archive delivered order:', err?.message);
        }
    }

    return res.status(200).json(new ApiResponse(200, order, 'Order status updated successfully'));
});

// Delete seller account
export const deleteSellerAccount = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;
    const { password } = req.body;

    if (!password) {
        throw new ApiError(400, "Password is required to delete account");
    }

    // Verify password
    const seller = await Seller.findById(sellerId);
    if (!seller) {
        throw new ApiError(404, "Seller not found");
    }

    const isPasswordValid = await seller.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid password");
    }

    // Check if seller has active shops with products
    const activeShops = await Shop.find({ sellerId, isActive: true });
    for (const shop of activeShops) {
        const productCount = await Product.countDocuments({ shopId: shop._id });
        if (productCount > 0) {
            throw new ApiError(400, "Cannot delete account with active shops and products. Please delete all products and shops first.");
        }
    }

    // Delete all shops
    await Shop.deleteMany({ sellerId });
    
    // Delete all products
    await Product.deleteMany({ sellerId });
    
    // Delete all offers
    await Offer.deleteMany({ sellerId });
    
    // Delete seller account
    await Seller.findByIdAndDelete(sellerId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Account deleted successfully")
    );
});
