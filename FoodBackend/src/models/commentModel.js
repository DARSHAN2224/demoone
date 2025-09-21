import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  // Basic comment information
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Comment author
  author: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    avatar: String,
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },
  
  // Comment target (what the comment is about)
  target: {
    type: {
      type: String,
      enum: ['product', 'shop', 'seller', 'order', 'delivery'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  
  // Comment threading and replies
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  depth: {
    type: Number,
    default: 0,
    max: 5 // Maximum nesting depth
  },
  
  // Comment engagement
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dislikes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dislikedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comment moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged', 'deleted'],
    default: 'pending'
  },
  moderationHistory: [{
    action: {
      type: String,
      enum: ['created', 'approved', 'rejected', 'flagged', 'deleted', 'edited']
    },
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'moderationHistory.moderatorModel'
    },
    moderatorModel: {
      type: String,
      enum: ['Admin', 'Seller', 'System']
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comment flags and reports
  flags: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'false_information', 'other']
    },
    description: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    },
    reviewed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Comment metadata
  metadata: {
    language: {
      type: String,
      default: 'en'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    hasImages: {
      type: Boolean,
      default: false
    },
    hasLinks: {
      type: Boolean,
      default: false
    },
    wordCount: {
      type: Number,
      default: 0
    }
  },
  
  // Comment attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document']
    },
    url: String,
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comment analytics
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    dislikeCount: {
      type: Number,
      default: 0
    },
    flagCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    }
  },
  
  // Comment visibility and access control
  visibility: {
    type: String,
    enum: ['public', 'private', 'friends_only', 'shop_only'],
    default: 'public'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    editReason: String
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware
commentSchema.pre('save', function(next) {
  // Update word count
  this.metadata.wordCount = this.content.split(/\s+/).length;
  
  // Update reply count
  this.analytics.replyCount = this.replies.length;
  
  // Update like/dislike counts
  this.analytics.likeCount = this.likes.length;
  this.analytics.dislikeCount = this.dislikes.length;
  this.analytics.flagCount = this.flags.length;
  
  // Update last activity
  this.lastActivityAt = new Date();
  
  // Set published date if status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate depth based on parent
  if (this.parentComment) {
    this.depth = 1; // Will be updated by parent comment
  }
  
  next();
});

// Indexes for performance
commentSchema.index({ 'target.type': 1, 'target.id': 1, status: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, depth: 1 });
commentSchema.index({ status: 1, createdAt: -1 });
commentSchema.index({ 'flags.reviewed': 1, 'flags.flaggedAt': -1 });
commentSchema.index({ publishedAt: -1 });
commentSchema.index({ 'analytics.likeCount': -1, createdAt: -1 });

// Virtual for total engagement
commentSchema.virtual('totalEngagement').get(function() {
  return this.analytics.likeCount + this.analytics.replyCount + this.analytics.shareCount;
});

// Virtual for is flagged
commentSchema.virtual('isFlagged').get(function() {
  return this.flags.length > 0;
});

// Virtual for is moderated
commentSchema.virtual('isModerated').get(function() {
  return this.status !== 'pending';
});

// Virtual for comment age
commentSchema.virtual('commentAge').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to add like
commentSchema.methods.addLike = function(userId) {
  // Remove dislike if exists
  this.dislikes = this.dislikes.filter(dislike => dislike.userId.toString() !== userId.toString());
  
  // Add like if not already liked
  if (!this.likes.some(like => like.userId.toString() === userId.toString())) {
    this.likes.push({ userId, likedAt: new Date() });
  }
  
  return this.save();
};

// Method to add dislike
commentSchema.methods.addDislike = function(userId) {
  // Remove like if exists
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  
  // Add dislike if not already disliked
  if (!this.dislikes.some(dislike => dislike.userId.toString() === userId.toString())) {
    this.dislikes.push({ userId, dislikedAt: new Date() });
  }
  
  return this.save();
};

// Method to add reply
commentSchema.methods.addReply = function(replyCommentId) {
  if (!this.replies.includes(replyCommentId)) {
    this.replies.push(replyCommentId);
  }
  
  return this.save();
};

// Method to flag comment
commentSchema.methods.flagComment = function(userId, reason, description = '') {
  // Check if user already flagged
  const existingFlag = this.flags.find(flag => flag.userId.toString() === userId.toString());
  
  if (existingFlag) {
    // Update existing flag
    existingFlag.reason = reason;
    existingFlag.description = description;
    existingFlag.flaggedAt = new Date();
  } else {
    // Add new flag
    this.flags.push({
      userId,
      reason,
      description,
      flaggedAt: new Date()
    });
  }
  
  // Auto-flag if multiple flags
  if (this.flags.length >= 3) {
    this.status = 'flagged';
    this.moderationHistory.push({
      action: 'flagged',
      moderatorId: null,
      moderatorModel: 'System',
      reason: 'Auto-flagged due to multiple user reports',
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Method to moderate comment
commentSchema.methods.moderate = function(action, moderatorId, moderatorModel, reason = '') {
  this.status = action;
  
  this.moderationHistory.push({
    action,
    moderatorId,
    moderatorModel,
    reason,
    timestamp: new Date()
  });
  
  if (action === 'approved' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  return this.save();
};

// Method to edit comment
commentSchema.methods.editComment = function(newContent, editReason = '') {
  // Store edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
    editReason: editReason
  });
  
  // Update content
  this.content = newContent;
  this.isEdited = true;
  this.updatedAt = new Date();
  
  return this.save();
};

// Method to get comment tree
commentSchema.methods.getCommentTree = function() {
  return {
    comment: this,
    replies: this.replies,
    depth: this.depth,
    totalReplies: this.replies.length
  };
};

// Method to check if user can edit
commentSchema.methods.canEdit = function(userId) {
  return this.author.userId.toString() === userId.toString() && 
         this.status === 'approved' && 
         this.replies.length === 0;
};

// Method to check if user can delete
commentSchema.methods.canDelete = function(userId, userRole) {
  return this.author.userId.toString() === userId.toString() || 
         userRole === 'admin' || 
         userRole === 'seller';
};

// Static method to get comments by target
commentSchema.statics.getByTarget = function(targetType, targetId, options = {}) {
  const {
    status = 'approved',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 20,
    skip = 0,
    includeReplies = false
  } = options;
  
  let query = this.find({
    'target.type': targetType,
    'target.id': targetId,
    status: status,
    parentComment: null // Only top-level comments
  });
  
  if (includeReplies) {
    query = query.populate({
      path: 'replies',
      match: { status: 'approved' },
      options: { sort: { createdAt: 'asc' } }
    });
  }
  
  return query
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit)
    .populate('author.userId', 'name avatar')
    .exec();
};

// Static method to get pending moderation comments
commentSchema.statics.getPendingModeration = function(options = {}) {
  const {
    limit = 50,
    skip = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  return this.find({
    $or: [
      { status: 'pending' },
      { status: 'flagged' }
    ]
  })
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit)
    .populate('author.userId', 'name avatar')
    .populate('target.id')
    .exec();
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
