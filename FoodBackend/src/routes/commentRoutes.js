import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import {
    createComment,
    getComments,
    getCommentById,
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    dislikeComment,
    removeDislike,
    moderateComment,
    getCommentsForModeration,
    getCommentAnalytics
} from '../controllers/commentController.js';

const router = express.Router();

// ==================== PUBLIC COMMENT ROUTES ====================
// These routes can be accessed by authenticated users

// Get comments for a target (product, shop, etc.)
router.get('/:targetType/:targetId', verifyJWT, getComments);

// Get specific comment with replies
router.get('/:commentId', verifyJWT, getCommentById);

// ==================== USER COMMENT ROUTES ====================
// All user routes require JWT authentication

// Create a new comment
router.post('/', verifyJWT, createComment);

// Update own comment
router.patch('/:commentId', verifyJWT, updateComment);

// Delete own comment
router.delete('/:commentId', verifyJWT, deleteComment);

// ==================== COMMENT ENGAGEMENT ROUTES ====================
// Like/unlike and dislike/remove dislike

router.post('/:commentId/like', verifyJWT, likeComment);
router.delete('/:commentId/like', verifyJWT, unlikeComment);
router.post('/:commentId/dislike', verifyJWT, dislikeComment);
router.delete('/:commentId/dislike', verifyJWT, removeDislike);

// ==================== MODERATION ROUTES ====================
// Admin and seller moderation routes

// Get comments requiring moderation
router.get('/moderation/queue', verifyJWT, getCommentsForModeration);

// Moderate a comment (approve, reject, flag, delete)
router.patch('/:commentId/moderate', verifyJWT, moderateComment);

// ==================== ANALYTICS ROUTES ====================
// Comment analytics for admins and sellers

router.get('/analytics/overview', verifyJWT, getCommentAnalytics);

export default router;
