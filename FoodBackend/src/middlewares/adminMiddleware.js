import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Middleware to check if user is an admin
export const onlyAdminAccess = asyncHandler(async (req, res, next) => {
    console.log('🔍 Admin middleware check:', { 
        hasAdmin: Boolean(req.admin), 
        hasUser: Boolean(req.user), 
        userRole: req.user?.role,
        adminId: req.admin?._id 
    });
    
    const isAdmin = Boolean(req.admin) || req.user?.role === 1;
    if (!isAdmin) {
        throw new ApiError("Access denied", 403, "You have not permission to access this route!");
    }
    
    console.log('✅ Admin access granted');
    return next();
});