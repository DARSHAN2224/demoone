import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import  Comment  from '../models/commentModel.js';
import { User } from '../models/userModel.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { Notification } from '../models/notificationModel.js';

// ==================== COMMENT CRUD OPERATIONS ====================

// Create a new comment
export const createComment = asyncHandler(async (req, res) => {
    const { content, targetType, targetId, parentCommentId, isAnonymous } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!content || !targetType || !targetId) {
        throw new ApiError(400, "Content, target type, and target ID are required");
    }

    // Validate target type
    const validTargetTypes = ['product', 'shop', 'seller', 'order', 'delivery'];
    if (!validTargetTypes.includes(targetType)) {
        throw new ApiError(400, "Invalid target type");
    }

    // Check if target exists
    let targetExists = false;
    switch (targetType) {
        case 'product':
            targetExists = await Product.findById(targetId);
            break;
        case 'shop':
            targetExists = await Shop.findById(targetId);
            break;
        case 'seller':
            targetExists = await User.findById(targetId);
            break;
        // Add other target validations as needed
    }

    if (!targetExists) {
        throw new ApiError(404, "Target not found");
    }

    // Check parent comment if replying
    let parentComment = null;
    let depth = 0;
    if (parentCommentId) {
        parentComment = await Comment.findById(parentCommentId);
        if (!parentComment) {
            throw new ApiError(404, "Parent comment not found");
        }
        if (parentComment.depth >= 5) {
            throw new ApiError(400, "Maximum comment nesting depth reached");
        }
        depth = parentComment.depth + 1;
    }

    // Get user info
    const user = await User.findById(userId).select('name avatar');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Create comment
    const comment = await Comment.create({
        content,
        author: {
            userId,
            name: isAnonymous ? 'Anonymous' : user.name,
            avatar: isAnonymous ? null : user.avatar,
            isAnonymous: isAnonymous || false
        },
        target: {
            type: targetType,
            id: targetId
        },
        parentComment: parentCommentId || null,
        depth,
        status: 'pending' // Requires moderation for new comments
    });

    // Update parent comment replies
    if (parentCommentId) {
        await Comment.findByIdAndUpdate(parentCommentId, {
            $push: { replies: comment._id }
        });
    }

    // Create notification for target owner
    try {
        let targetOwnerId = null;
        switch (targetType) {
            case 'product':
                const product = await Product.findById(targetId).populate('sellerId');
                targetOwnerId = product?.sellerId?._id;
                break;
            case 'shop':
                const shop = await Shop.findById(targetId);
                targetOwnerId = shop?.sellerId;
                break;
        }

        if (targetOwnerId && targetOwnerId.toString() !== userId.toString()) {
            await Notification.create({
                userId: targetOwnerId,
                type: 'comment',
                title: 'New Comment',
                message: `Someone commented on your ${targetType}`,
                data: {
                    commentId: comment._id,
                    targetType,
                    targetId,
                    authorName: isAnonymous ? 'Anonymous' : user.name
                },
                priority: 'medium'
            });
        }
    } catch (error) {
        console.error('Failed to create notification:', error);
    }

    // Populate author info for response
    await comment.populate('author.userId', 'name avatar');

    res.status(201).json(new ApiResponse(201, { comment }, 'Comment created successfully'));
});

// Get comments for a target
export const getComments = asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;
    const { page = 1, limit = 20, sort = 'newest', status = 'approved' } = req.query;

    // Validate target type
    const validTargetTypes = ['product', 'shop', 'seller', 'order', 'delivery'];
    if (!validTargetTypes.includes(targetType)) {
        throw new ApiError(400, "Invalid target type");
    }

    // Build query
    const query = {
        'target.type': targetType,
        'target.id': targetId,
        status: status === 'all' ? { $ne: 'deleted' } : status,
        parentComment: null // Only top-level comments
    };

    // Build sort options
    let sortOptions = {};
    switch (sort) {
        case 'newest':
            sortOptions = { createdAt: -1 };
            break;
        case 'oldest':
            sortOptions = { createdAt: 1 };
            break;
        case 'popular':
            sortOptions = { 
                $expr: { 
                    $subtract: [
                        { $size: '$likes' }, 
                        { $size: '$dislikes' }
                    ]
                }
            };
            break;
        case 'relevance':
            sortOptions = { score: -1, createdAt: -1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const comments = await Comment.find(query)
        .populate('author.userId', 'name avatar')
        .populate('replies', 'content author status createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

    // Get total count
    const total = await Comment.countDocuments(query);

    // Calculate engagement metrics
    const engagementMetrics = await Comment.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: { $size: '$likes' } },
                totalDislikes: { $sum: { $size: '$dislikes' } },
                totalReplies: { $sum: { $size: '$replies' } }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        comments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        },
        engagement: engagementMetrics[0] || {
            totalLikes: 0,
            totalDislikes: 0,
            totalReplies: 0
        }
    }, 'Comments retrieved successfully'));
});

// Get comment by ID with replies
export const getCommentById = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
        .populate('author.userId', 'name avatar')
        .populate('parentComment', 'content author status')
        .populate({
            path: 'replies',
            populate: {
                path: 'author.userId',
                select: 'name avatar'
            }
        });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.status === 'deleted') {
        throw new ApiError(404, "Comment not found");
    }

    res.status(200).json(new ApiResponse(200, { comment }, 'Comment retrieved successfully'));
});

// Update comment
export const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check ownership or admin privileges
    if (comment.author.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, "You can only edit your own comments");
    }

    // Check if comment can be edited (not deleted, not too old)
    if (comment.status === 'deleted') {
        throw new ApiError(400, "Cannot edit deleted comment");
    }

    const commentAge = Date.now() - comment.createdAt.getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
    if (commentAge > maxEditAge) {
        throw new ApiError(400, "Comments can only be edited within 24 hours");
    }

    // Update comment
    comment.content = content;
    comment.status = 'pending'; // Requires re-moderation
    comment.moderationHistory.push({
        action: 'edited',
        moderatorId: userId,
        moderatorModel: req.user.role === 'admin' ? 'Admin' : 'User',
        timestamp: new Date(),
        reason: 'User edit'
    });

    await comment.save();

    // Populate author info for response
    await comment.populate('author.userId', 'name avatar');

    res.status(200).json(new ApiResponse(200, { comment }, 'Comment updated successfully'));
});

// Delete comment
export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check ownership or admin privileges
    if (comment.author.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
        throw new ApiError(403, "You can only delete your own comments");
    }

    // Soft delete - mark as deleted
    comment.status = 'deleted';
    comment.moderationHistory.push({
        action: 'deleted',
        moderatorId: userId,
        moderatorModel: req.user.role === 'admin' ? 'Admin' : 'User',
        timestamp: new Date(),
        reason: reason || 'User deletion'
    });

    await comment.save();

    res.status(200).json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});

// ==================== COMMENT ENGAGEMENT ====================

// Like comment
export const likeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.status === 'deleted') {
        throw new ApiError(400, "Cannot interact with deleted comment");
    }

    // Check if already liked
    const alreadyLiked = comment.likes.some(like => like.userId.toString() === userId.toString());
    if (alreadyLiked) {
        throw new ApiError(400, "Comment already liked");
    }

    // Remove from dislikes if exists
    comment.dislikes = comment.dislikes.filter(dislike => dislike.userId.toString() !== userId.toString());

    // Add like
    comment.likes.push({ userId, likedAt: new Date() });
    await comment.save();

    res.status(200).json(new ApiResponse(200, { 
        likes: comment.likes.length,
        dislikes: comment.dislikes.length
    }, 'Comment liked successfully'));
});

// Unlike comment
export const unlikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Remove like
    comment.likes = comment.likes.filter(like => like.userId.toString() !== userId.toString());
    await comment.save();

    res.status(200).json(new ApiResponse(200, { 
        likes: comment.likes.length,
        dislikes: comment.dislikes.length
    }, 'Comment unliked successfully'));
});

// Dislike comment
export const dislikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.status === 'deleted') {
        throw new ApiError(400, "Cannot interact with deleted comment");
    }

    // Check if already disliked
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.userId.toString() === userId.toString());
    if (alreadyDisliked) {
        throw new ApiError(400, "Comment already disliked");
    }

    // Remove from likes if exists
    comment.likes = comment.likes.filter(like => like.userId.toString() !== userId.toString());

    // Add dislike
    comment.dislikes.push({ userId, dislikedAt: new Date() });
    await comment.save();

    res.status(200).json(new ApiResponse(200, { 
        likes: comment.likes.length,
        dislikes: comment.dislikes.length
    }, 'Comment disliked successfully'));
});

// Remove dislike
export const removeDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Remove dislike
    comment.dislikes = comment.dislikes.filter(dislike => dislike.userId.toString() !== userId.toString());
    await comment.save();

    res.status(200).json(new ApiResponse(200, { 
        likes: comment.likes.length,
        dislikes: comment.dislikes.length
    }, 'Dislike removed successfully'));
});

// ==================== COMMENT MODERATION ====================

// Moderate comment (Admin/Seller only)
export const moderateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { action, reason } = req.body;
    const moderatorId = req.user._id;

    if (!['approve', 'reject', 'flag', 'delete'].includes(action)) {
        throw new ApiError(400, "Invalid moderation action");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check moderation permissions
    if (req.user.role === 'seller') {
        // Sellers can only moderate comments on their own products/shops
        const canModerate = await checkSellerModerationRights(req.user._id, comment);
        if (!canModerate) {
            throw new ApiError(403, "You can only moderate comments on your own content");
        }
    } else if (req.user.role !== 'admin') {
        throw new ApiError(403, "Insufficient permissions for moderation");
    }

    // Update comment status
    const statusMap = {
        'approve': 'approved',
        'reject': 'rejected',
        'flag': 'flagged',
        'delete': 'deleted'
    };

    comment.status = statusMap[action];
    comment.moderationHistory.push({
        action,
        moderatorId,
        moderatorModel: req.user.role === 'admin' ? 'Admin' : 'Seller',
        timestamp: new Date(),
        reason: reason || `Moderated by ${req.user.role}`
    });

    await comment.save();

    // Create notification for comment author
    try {
        if (action === 'reject' || action === 'delete') {
            await Notification.create({
                userId: comment.author.userId,
                type: 'comment_moderation',
                title: 'Comment Moderation',
                message: `Your comment has been ${action}d${reason ? `: ${reason}` : ''}`,
                data: {
                    commentId: comment._id,
                    action,
                    reason
                },
                priority: 'medium'
            });
        }
    } catch (error) {
        console.error('Failed to create moderation notification:', error);
    }

    res.status(200).json(new ApiResponse(200, { comment }, 'Comment moderated successfully'));
});

// Get comments requiring moderation
export const getCommentsForModeration = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const userId = req.user._id;

    let query = { status };
    
    // Sellers can only see comments on their content
    if (req.user.role === 'seller') {
        const sellerContent = await getSellerContent(userId);
        query['target.id'] = { $in: sellerContent };
    }

    const skip = (page - 1) * limit;
    const comments = await Comment.find(query)
        .populate('author.userId', 'name avatar')
        .populate('target.id', 'name title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json(new ApiResponse(200, {
        comments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }, 'Comments for moderation retrieved successfully'));
});

// ==================== HELPER FUNCTIONS ====================

// Check if seller can moderate a comment
const checkSellerModerationRights = async (sellerId, comment) => {
    switch (comment.target.type) {
        case 'product':
            const product = await Product.findById(comment.target.id);
            return product && product.sellerId.toString() === sellerId.toString();
        case 'shop':
            const shop = await Shop.findById(comment.target.id);
            return shop && shop.sellerId.toString() === sellerId.toString();
        default:
            return false;
    }
};

// Get seller's content IDs for moderation
const getSellerContent = async (sellerId) => {
    const products = await Product.find({ sellerId }).select('_id');
    const shops = await Shop.find({ sellerId }).select('_id');
    
    return [
        ...products.map(p => p._id),
        ...shops.map(s => s._id)
    ];
};

// ==================== COMMENT ANALYTICS ====================

// Get comment analytics
export const getCommentAnalytics = asyncHandler(async (req, res) => {
    const { period = '7d', targetType, targetId } = req.query;
    const userId = req.user._id;

    // Check permissions
    if (req.user.role === 'seller') {
        const canAccess = await checkSellerModerationRights(userId, { target: { type: targetType, id: targetId } });
        if (!canAccess) {
            throw new ApiError(403, "Insufficient permissions");
        }
    } else if (req.user.role !== 'admin') {
        throw new ApiError(403, "Insufficient permissions");
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
        case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build match query
    const matchQuery = {
        createdAt: { $gte: startDate }
    };

    if (targetType && targetId) {
        matchQuery['target.type'] = targetType;
        matchQuery['target.id'] = targetId;
    }

    // Get analytics
    const analytics = await Comment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: {
                    status: '$status',
                    targetType: '$target.type',
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                },
                count: { $sum: 1 },
                totalLikes: { $sum: { $size: '$likes' } },
                totalDislikes: { $sum: { $size: '$dislikes' } },
                totalReplies: { $sum: { $size: '$replies' } }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        targetType: '$_id.targetType',
                        count: '$count',
                        totalLikes: '$totalLikes',
                        totalDislikes: '$totalDislikes',
                        totalReplies: '$totalReplies'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    res.status(200).json(new ApiResponse(200, {
        period,
        analytics,
        summary: {
            totalComments: analytics.reduce((sum, day) => 
                sum + day.statuses.reduce((daySum, status) => daySum + status.count, 0), 0
            ),
            totalLikes: analytics.reduce((sum, day) => 
                sum + day.statuses.reduce((daySum, status) => daySum + status.totalLikes, 0), 0
            ),
            totalDislikes: analytics.reduce((sum, day) => 
                sum + day.statuses.reduce((daySum, status) => daySum + status.totalDislikes, 0), 0
            ),
            totalReplies: analytics.reduce((sum, day) => 
                sum + day.statuses.reduce((daySum, status) => daySum + status.totalReplies, 0), 0
            )
        }
    }, 'Comment analytics retrieved successfully'));
});
