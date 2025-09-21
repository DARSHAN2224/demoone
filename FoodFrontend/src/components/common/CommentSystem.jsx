import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ThumbsUp, ThumbsDown, Reply, Edit, Trash2, Flag, MoreVertical, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

const CommentSystem = ({ 
    targetType, 
    targetId, 
    showComments = true, 
    allowAnonymous = false,
    maxDepth = 3,
    onCommentCountChange 
}) => {
    const { user, userRole, accessToken } = useAuthStore();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [moderationQueue, setModerationQueue] = useState([]);
    const [showModeration, setShowModeration] = useState(false);

    const commentFormRef = useRef(null);
    const commentInputRef = useRef(null);

    const [formData, setFormData] = useState({
        content: '',
        isAnonymous: false,
        parentCommentId: null
    });

    // Fetch comments
    const fetchComments = async (pageNum = 1, reset = false) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/v1/comments/${targetType}/${targetId}?page=${pageNum}&sort=${sortBy}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch comments');

            const data = await response.json();
            const newComments = data.data.comments || [];

            if (reset) {
                setComments(newComments);
                setPage(1);
            } else {
                setComments(prev => [...prev, ...newComments]);
            }

            setHasMore(newComments.length === 10);
            if (onCommentCountChange) {
                onCommentCountChange(data.data.totalComments || 0);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    // Submit comment
    const submitComment = async (e) => {
        e.preventDefault();
        if (!formData.content.trim()) return;

        try {
            setSubmitting(true);
            const response = await fetch('/api/v1/comments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: formData.content,
                    targetType,
                    targetId,
                    parentCommentId: formData.parentCommentId,
                    isAnonymous: formData.isAnonymous
                })
            });

            if (!response.ok) throw new Error('Failed to create comment');

            toast.success('Comment posted successfully');
            
            // Reset form and refresh comments
            setFormData({ content: '', isAnonymous: false, parentCommentId: null });
            setReplyTo(null);
            fetchComments(1, true);
        } catch (error) {
            console.error('Error creating comment:', error);
            toast.error('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    // Update comment
    const updateComment = async (commentId, content) => {
        try {
            const response = await fetch(`/api/v1/comments/${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Failed to update comment');

            toast.success('Comment updated successfully');
            setEditingComment(null);
            fetchComments(1, true);
        } catch (error) {
            console.error('Error updating comment:', error);
            toast.error('Failed to update comment');
        }
    };

    // Delete comment
    const deleteComment = async (commentId) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await fetch(`/api/v1/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to delete comment');

            toast.success('Comment deleted successfully');
            fetchComments(1, true);
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    // Like/Unlike comment
    const toggleLike = async (commentId, action) => {
        try {
            const response = await fetch(`/api/v1/comments/${commentId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Failed to ${action} comment`);

            fetchComments(1, true);
        } catch (error) {
            console.error(`Error ${action}ing comment:`, error);
            toast.error(`Failed to ${action} comment`);
        }
    };

    // Handle reply
    const handleReply = (comment) => {
        setReplyTo(comment);
        setFormData(prev => ({ ...prev, parentCommentId: comment._id }));
        commentInputRef.current?.focus();
    };

    // Load more comments
    const loadMore = () => {
        if (hasMore && !loading) {
            fetchComments(page + 1);
            setPage(prev => prev + 1);
        }
    };

    // Render comment tree
    const renderCommentTree = (commentList, parentId = null, depth = 0) => {
        if (depth > maxDepth) return null;

        return commentList
            .filter(comment => comment.parentCommentId === parentId)
            .map(comment => (
                <CommentItem
                    key={comment._id}
                    comment={comment}
                    depth={depth}
                    onReply={handleReply}
                    onEdit={updateComment}
                    onDelete={deleteComment}
                    onLike={() => toggleLike(comment._id, 'like')}
                    onUnlike={() => toggleLike(comment._id, 'unlike')}
                    onDislike={() => toggleLike(comment._id, 'dislike')}
                    onRemoveDislike={() => toggleLike(comment._id, 'remove-dislike')}
                    userRole={userRole}
                    currentUserId={user?._id}
                />
            ));
    };

    // Comment item component
    const CommentItem = ({ 
        comment, 
        depth, 
        onReply, 
        onEdit, 
        onDelete, 
        onLike, 
        onUnlike, 
        onDislike, 
        onRemoveDislike,
        userRole,
        currentUserId
    }) => {
        const [showReplies, setShowReplies] = useState(true);
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState(comment.content);
        const [showActions, setShowActions] = useState(false);

        const isOwner = comment.author._id === currentUserId;
        const hasLiked = comment.likes?.includes(currentUserId);
        const hasDisliked = comment.dislikes?.includes(currentUserId);
        const canEdit = isOwner && comment.status === 'approved';
        const canDelete = isOwner || ['seller', 'admin'].includes(userRole);

        const handleEdit = () => {
            setIsEditing(true);
            setEditContent(comment.content);
        };

        const handleSaveEdit = () => {
            if (editContent.trim() && editContent !== comment.content) {
                onEdit(comment._id, editContent);
            }
            setIsEditing(false);
        };

        const handleCancelEdit = () => {
            setIsEditing(false);
            setEditContent(comment.content);
        };

        return (
            <div className={`border-l-2 border-gray-200 pl-4 mb-4 ${depth > 0 ? 'ml-4' : ''}`}>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    {/* Comment header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            {comment.isAnonymous ? (
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-600" />
                                </div>
                            ) : (
                                <img 
                                    src={comment.author.profilePicture || '/default-avatar.png'} 
                                    alt={comment.author.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            )}
                            <div>
                                <span className="font-medium text-gray-900">
                                    {comment.isAnonymous ? 'Anonymous' : comment.author.name}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                                {comment.status !== 'approved' && (
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                        comment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {comment.status}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {showActions && (
                                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                                    {canEdit && (
                                        <button
                                            onClick={handleEdit}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span>Edit</span>
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => onDelete(comment._id)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comment content */}
                    {isEditing ? (
                        <div className="mb-3">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-2 border rounded-lg resize-none"
                                rows="3"
                            />
                            <div className="flex space-x-2 mt-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-800 mb-3">{comment.content}</p>
                    )}

                    {/* Comment actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Like/Unlike */}
                            <button
                                onClick={hasLiked ? onUnlike : onLike}
                                className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 ${
                                    hasLiked ? 'text-primary-600' : 'text-gray-500'
                                }`}
                            >
                                <ThumbsUp className="w-4 h-4" />
                                <span>{comment.likes?.length || 0}</span>
                            </button>

                            {/* Dislike/Remove dislike */}
                            <button
                                onClick={hasDisliked ? onRemoveDislike : onDislike}
                                className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 ${
                                    hasDisliked ? 'text-red-600' : 'text-gray-500'
                                }`}
                            >
                                <ThumbsDown className="w-4 h-4" />
                                <span>{comment.dislikes?.length || 0}</span>
                            </button>

                            {/* Reply */}
                            <button
                                onClick={() => onReply(comment)}
                                className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
                            >
                                <Reply className="w-4 h-4" />
                                <span>Reply</span>
                            </button>
                        </div>

                        {/* Show replies toggle */}
                        {comment.replies && comment.replies.length > 0 && (
                            <button
                                onClick={() => setShowReplies(!showReplies)}
                                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {showReplies ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span>{comment.replies.length} replies</span>
                            </button>
                        )}
                    </div>

                    {/* Replies */}
                    {showReplies && comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3">
                            {renderCommentTree(comment.replies, comment._id, depth + 1)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Load comments on mount
    useEffect(() => {
        if (showComments) {
            fetchComments(1, true);
        }
    }, [targetType, targetId, sortBy, showComments]);

    // Close actions menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowActions(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    if (!showComments) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Comments ({comments.length})
                    </h3>
                </div>

                {/* Sort options */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1 border rounded-lg text-sm"
                >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="most_liked">Most Liked</option>
                    <option value="most_replied">Most Replied</option>
                </select>
            </div>

            {/* Comment form */}
            {user && (
                <form onSubmit={submitComment} ref={commentFormRef} className="bg-white rounded-lg p-4 shadow-sm border">
                    {replyTo && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-blue-700">
                                    Replying to {replyTo.isAnonymous ? 'Anonymous' : replyTo.author.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setReplyTo(null)}
                                    className="text-primary-600 hover:text-primary-800 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <textarea
                        ref={commentInputRef}
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Write a comment..."
                        className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        required
                    />

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-4">
                            {allowAnonymous && (
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isAnonymous}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-gray-600">Post anonymously</span>
                                </label>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !formData.content.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            )}

            {/* Comments list */}
            <div className="space-y-4">
                {loading && page === 1 ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading comments...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                ) : (
                    <>
                        {renderCommentTree(comments)}
                        
                        {/* Load more button */}
                        {hasMore && (
                            <div className="text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                >
                                    {loading ? 'Loading...' : 'Load More Comments'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CommentSystem;
