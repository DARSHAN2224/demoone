import mongoose from 'mongoose';
const { Schema } = mongoose;

// Cart Item Schema
const cartItemSchema = new Schema({
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  variant: {
    name: String,
    value: String,
    priceAdjustment: {
      type: Number,
      default: 0
    }
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: String,
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilityMessage: String
});

// Saved For Later Item Schema
const savedForLaterSchema = new Schema({
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  variant: {
    name: String,
    value: String,
    priceAdjustment: {
      type: Number,
      default: 0
    }
  },
  notes: String,
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Applied Offer Schema
const appliedOfferSchema = new Schema({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

// Cart Totals Schema
const cartTotalsSchema = new Schema({
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
});

// Share History Schema
const shareHistorySchema = new Schema({
  sharedAt: {
    type: Date,
    default: Date.now
  },
  shareType: {
    type: String,
    enum: ['email', 'link', 'qr'],
    required: true
  },
  recipientEmail: String,
  message: String,
  shareToken: String
});

// Main Cart Schema
const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  savedForLater: [savedForLaterSchema],
  totals: {
    type: cartTotalsSchema,
    required: true,
    default: () => ({
      subtotal: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0
    })
  },
  totalQty: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  appliedOffers: [appliedOfferSchema],
  isShared: {
    type: Boolean,
    default: false
  },
  shareToken: String,
  shareExpiry: Date,
  shareHistory: [shareHistorySchema],
  cartExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  preferences: {
    autoSave: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

export default cartSchema;
