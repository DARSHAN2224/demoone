import  mongoose from 'mongoose';
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  orderToken: {
    type: String, // Common token for all products in the same order
    required: true,
    unique: true
  },
  orderNumber: {
    type: String, // Human-readable order number (e.g., ORD-2024-001)
    required: true,
    unique: true
  },
  user: {
    type: Schema.Types.ObjectId, // Reference to the user who placed the order
    ref: 'User',
    required: true
  },
  shops: [{
    shopId: {
      type: Schema.Types.ObjectId, // Reference to each shop
      ref: 'Shop',
      required: true
    },
    status: {
      type: String,
      enum: ['arrived', 'preparing', 'cancelled','ready', 'delivered'], // Status per shop
      default: 'arrived'
    },
    cancelReason: {
      type: String, // Store the reason if a shop cancels the order
      default: null
    },
    products: [{
      productId: {
        type: Schema.Types.ObjectId, // Reference to each product from the shop
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
        name: String, // e.g., "Size", "Color"
        value: String, // e.g., "Large", "Red"
        priceAdjustment: Number
      },
      totalPrice: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    deliveredAt: {
      type: Date // Date the entire order is marked as delivered (if needed)
    },  
    totalQuantity: {
      type: Number, // Total quantity of all products in the order
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number, // Total price of all products in the order
      required: true,
      min: 0
    },
    shopNotes: String, // Notes from the shop
    estimatedReadyTime: Date // When the shop expects the order to be ready
  }],
  totalQuantity: {
    type: Number, // Total quantity of all products in the order
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number, // Total price of all products in the order
    required: true,
    min: 0
  },
  
  // Enhanced Payment Information (Industry Standard)
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'pending'],
      default: 'pending'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    amount: {
      subtotal: {
        type: Number,
        required: true,
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
        min: 0
      }
    },
    paidAt: Date,
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundReason: String,
    refundedAt: Date
  },
  
  // Enhanced Delivery Information
  delivery: {
    type: {
      type: String,
      enum: ['regular', 'drone', 'pickup'],
      default: 'regular'
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'out-for-delivery', 'nearby', 'delivered', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['home_delivery', 'pickup', 'curbside'],
      default: 'home_delivery'
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      },
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    instructions: String,
    timeSlot: {
      start: Date,
      end: Date
    },
    contactless: {
      type: Boolean,
      default: true
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    deliveryPartner: {
      name: String,
      phone: String,
      vehicle: String,
      vehicleNumber: String,
      photo: String
    }
  },
  
  // Enhanced Order Status and Tracking
  status: {
    current: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
      default: 'pending'
    },
    history: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        refPath: 'status.history.updatedByModel'
      },
      updatedByModel: {
        type: String,
        enum: ['User', 'Seller', 'Admin', 'System']
      },
      notes: String
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Enhanced Customer Information
  customer: {
    name: String,
    phone: String,
    email: String,
    preferences: {
      contactMethod: {
        type: String,
        enum: ['phone', 'email', 'sms'],
        default: 'phone'
      },
      language: {
        type: String,
        default: 'en'
      }
    }
  },
  
  // Enhanced Order Management
  isPaid: {
    type: Boolean, 
    default: false 
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  cancellationReason: String,
  cancelledBy: {
    type: Schema.Types.ObjectId,
    refPath: 'cancelledByModel'
  },
  cancelledByModel: {
    type: String,
    enum: ['User', 'Seller', 'Admin']
  },
  cancelledAt: Date,
  
  // Enhanced Analytics and Metrics
  metrics: {
    orderValue: Number,
    customerLifetimeValue: Number,
    repeatCustomer: {
      type: Boolean,
      default: false
    },
    orderRating: {
      rating: Number,
      comment: String,
      ratedAt: Date
    },
    deliveryRating: {
      rating: Number,
      comment: String,
      ratedAt: Date
    }
  },
  
  // Enhanced Notifications
  notifications: {
    sent: [{
      type: String, // 'order_confirmation', 'preparation_started', 'out_for_delivery', 'delivered'
      sentAt: Date,
      method: String // 'email', 'sms', 'push'
    }],
    lastSent: Date
  },
  
  // Enhanced Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  preparedAt: Date,
  readyAt: Date,
  outForDeliveryAt: Date,
  deliveredAt: Date,
  
  // Drone delivery only - all orders are drone orders
  deliveryType: {
    type: String,
    enum: ['drone'],
    default: 'drone'
  },
  fallbackReason: {
    type: String,
    default: null
  },
  droneOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'DroneOrder',
    default: null
  },
  deliveryLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  pickupLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'preparing', 'out-for-delivery', 'nearby', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryPartner: {
    name: String,
    phone: String,
    vehicle: String,
    vehicleNumber: String
  }
},{timestamps:true});

// Pre-save middleware to update timestamps and status
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update status history if status changed
  if (this.isModified('status.current')) {
    this.status.history.push({
      status: this.status.current,
      timestamp: new Date(),
      updatedBy: this.status.history.length > 0 ? this.status.history[this.status.history.length - 1].updatedBy : null,
      updatedByModel: this.status.history.length > 0 ? this.status.history[this.status.history.length - 1].updatedByModel : 'System'
    });
    this.status.lastUpdated = new Date();
  }
  
  // Update specific timestamps based on status
  if (this.status.current === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  if (this.status.current === 'preparing' && !this.preparedAt) {
    this.preparedAt = new Date();
  }
  if (this.status.current === 'ready' && !this.readyAt) {
    this.readyAt = new Date();
  }
  if (this.status.current === 'out_for_delivery' && !this.outForDeliveryAt) {
    this.outForDeliveryAt = new Date();
  }
  if (this.status.current === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  
  next();
});

// Indexes for performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'shops.shopId': 1, 'shops.status': 1 });
orderSchema.index({ 'delivery.status': 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderToken: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for is overdue
orderSchema.virtual('isOverdue').get(function() {
  if (this.delivery.estimatedDeliveryTime) {
    return Date.now() > this.delivery.estimatedDeliveryTime.getTime();
  }
  return false;
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, updatedBy, updatedByModel, notes = '') {
  this.status.current = newStatus;
  this.status.history.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: updatedBy,
    updatedByModel: updatedByModel,
    notes: notes
  });
  this.status.lastUpdated = new Date();
  
  return this.save();
};

// Method to cancel order
orderSchema.methods.cancelOrder = function(reason, cancelledBy, cancelledByModel) {
  this.isCancelled = true;
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledByModel = cancelledByModel;
  this.cancelledAt = new Date();
  this.status.current = 'cancelled';
  
  return this.save();
};

// Method to calculate total amount
orderSchema.methods.calculateTotal = function() {
  let subtotal = 0;
  this.shops.forEach(shop => {
    shop.products.forEach(product => {
      subtotal += product.totalPrice;
    });
  });
  
  this.payment.amount.subtotal = subtotal;
  this.payment.amount.total = subtotal + this.payment.amount.tax + this.payment.amount.deliveryFee - this.payment.amount.discount;
  
  return this.payment.amount.total;
};

export default mongoose.model('Order', orderSchema);
