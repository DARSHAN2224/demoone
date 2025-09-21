import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['User', 'Seller', 'Admin']
  },
  type: {
    type: String,
    required: true,
    enum: ['success', 'error', 'warning', 'info', 'order', 'delivery', 'payment', 'system', 'promotion']
  },
  category: {
    type: String,
    required: true,
    enum: ['order_update', 'delivery_status', 'payment_confirmation', 'system_alert', 'promotional', 'security', 'general']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  shortMessage: {
    type: String,
    trim: true,
    maxlength: 100
  },
  icon: {
    type: String,
    default: 'info'
  },
  image: {
    type: String,
    default: null
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  actions: [{
    label: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['link', 'function', 'button'],
      default: 'link'
    },
    style: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'danger', 'warning', 'info'],
      default: 'primary'
    },
    icon: String
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  sentVia: [{
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push', 'webhook'],
      default: 'in_app'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    errorMessage: String
  }],
  deliveryPreferences: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  relatedEntities: [{
    type: {
      type: String,
      enum: ['order', 'product', 'shop', 'user', 'delivery']
    },
    id: mongoose.Schema.Types.ObjectId
  }],
  userInteraction: {
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date,
    dismissed: {
      type: Boolean,
      default: false
    },
    dismissedAt: Date,
    actionTaken: {
      type: String,
      default: null
    }
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

// Method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

export const Notification = mongoose.model('Notification', notificationSchema);
