import mongoose from 'mongoose';

const DroneOrderSchema = new mongoose.Schema({
  // Basic order information
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: false // optional in drone-only flow
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seller', 
    required: true 
  },
  
  // Drone assignment
  droneId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Drone' 
  },
  assignedAt: { type: Date },
  
  // Delivery details
  deliveryType: { 
    type: String, 
    enum: ['drone', 'hybrid'], // hybrid = drone to hub, then ground delivery
    default: 'drone',
    required: true
  },
  
  // Location information
  location: {
    pickup: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
      instructions: String,
      contactPerson: String,
      contactPhone: String,
      pincode: { type: String, required: true }
    },
    delivery: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
      instructions: String,
      contactPerson: String,
      contactPhone: String,
      pincode: { type: String, required: true },
      accessCode: String, // For secure delivery
      deliveryWindow: {
        start: { type: Date },
        end: { type: Date }
      }
    },
    hub: { // For hybrid delivery
      lat: Number,
      lng: Number,
      address: String,
      name: String
    }
  },
  
  // Route and navigation
  route: {
    distance: { type: Number, min: 0 }, // km
    estimatedDuration: { type: Number, min: 0 }, // minutes
    waypoints: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      type: { type: String, enum: ['pickup', 'delivery', 'waypoint', 'hub'] },
      order: Number
    }],
    optimizedPath: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      speed: Number,
      timestamp: Date
    }],
    actualPath: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      speed: Number,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: [
      'pending', 'weather_blocked', 'assigned', 'preparing', 'ready_for_pickup',
      'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery',
      'delivery_attempt', 'delivered', 'failed', 'cancelled', 'returned'
    ], 
    default: 'pending' 
  },
  
  // Status history with timestamps
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number,
      altitude: Number
    },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'Seller', 'Admin', 'System', 'Drone']
    }
  }],
  
  // Timing information
  timing: {
    requestedAt: { type: Date, default: Date.now },
    estimatedPickupTime: { type: Date },
    actualPickupTime: { type: Date },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    totalDuration: { type: Number, min: 0 }, // minutes
    deliveryWindow: {
      start: { type: Date },
      end: { type: Date }
    }
  },
  
  // Weather and safety
  weatherCheck: {
    isSafe: { type: Boolean, default: true },
    windSpeed: Number,
    windDirection: Number,
    temperature: Number,
    humidity: Number,
    visibility: Number,
    precipitation: Boolean,
    weatherAlert: String,
    checkedAt: { type: Date, default: Date.now }
  },
  
  // Safety and compliance
  safety: {
    weight: { type: Number, min: 0, max: 2.5 }, // kg (drone payload limit)
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 }
    },
    isFragile: { type: Boolean, default: false },
    requiresSpecialHandling: { type: Boolean, default: false },
    hazardousMaterials: { type: Boolean, default: false },
    temperatureSensitive: { type: Boolean, default: false },
    insuranceRequired: { type: Boolean, default: false }
  },
  
  // Delivery preferences
  preferences: {
    contactlessDelivery: { type: Boolean, default: true },
    signatureRequired: { type: Boolean, default: false },
    photoConfirmation: { type: Boolean, default: true },
    deliveryInstructions: String,
    preferredTimeSlot: String,
    allowRescheduling: { type: Boolean, default: true },
    allowSubstituteDelivery: { type: Boolean, default: false }
  },
  
  // QR code and verification
  qrCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  qrCodeExpiry: { type: Date },
  deliveryVerification: {
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'deliveryVerification.verifiedByModel'
    },
    verifiedByModel: {
      type: String,
      enum: ['User', 'Seller', 'Admin', 'Drone']
    },
    verificationMethod: {
      type: String,
      enum: ['qr_scan', 'otp', 'signature', 'photo', 'manual']
    },
    photoUrl: String,
    signatureUrl: String,
    notes: String
  },
  
  // Communication and notifications
  notifications: {
    sent: [{
      type: { type: String, required: true },
      sentAt: { type: Date, default: Date.now },
      recipient: String,
      method: { type: String, enum: ['email', 'sms', 'push', 'in_app'] },
      status: { type: String, enum: ['sent', 'delivered', 'failed'] }
    }],
    lastSent: { type: Date }
  },
  
  // Cost and pricing
  pricing: {
    basePrice: { type: Number, min: 0, required: true },
    distanceSurcharge: { type: Number, min: 0, default: 0 },
    weatherSurcharge: { type: Number, min: 0, default: 0 },
    prioritySurcharge: { type: Number, min: 0, default: 0 },
    totalPrice: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR' }
  },
  
  // Order details (since we're not creating regular orders)
  orderDetails: {
    shops: [{
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
      },
      status: {
        type: String,
        enum: ['arrived', 'preparing', 'cancelled', 'ready', 'delivered'],
        default: 'arrived'
      },
      cancelReason: String,
      products: [{
        productId: {
          type: mongoose.Schema.Types.ObjectId,
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
          priceAdjustment: Number
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0
        }
      }],
      deliveredAt: Date,
      totalQuantity: {
        type: Number,
        required: true,
        min: 1
      },
      totalPrice: {
        type: Number,
        required: true,
        min: 0
      },
      shopNotes: String,
      estimatedReadyTime: Date
    }],
    totalQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    orderToken: {
      type: String,
      required: true,
      unique: true
    },
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
        subtotal: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        deliveryFee: { type: Number, default: 0, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 }
      },
      paidAt: Date,
      refundAmount: { type: Number, default: 0, min: 0 },
      refundReason: String,
      refundedAt: Date
    }
  },
  
  // Customer feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    submittedAt: Date,
    deliveryExperience: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor', 'terrible']
    },
    wouldRecommend: Boolean
  },
  
  // Error handling and incidents
  incidents: [{
    type: { type: String, enum: ['weather', 'technical', 'delivery_failure', 'safety', 'other'] },
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolution: String,
    resolutionTime: Date
  }],
  
  // Analytics and metrics
  metrics: {
    actualDistance: { type: Number, min: 0 }, // km
    actualDuration: { type: Number, min: 0 }, // minutes
    fuelEfficiency: { type: Number, min: 0 }, // km/kWh
    customerSatisfaction: { type: Number, min: 0, max: 100 },
    deliveryAccuracy: { type: Number, min: 0, max: 100 } // percentage
  },
  
  // Audit trail
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audit.createdByModel'
    },
    createdByModel: {
      type: String,
      enum: ['User', 'Seller', 'Admin']
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audit.lastModifiedByModel'
    },
    lastModifiedByModel: {
      type: String,
      enum: ['User', 'Seller', 'Admin', 'System']
    },
    lastModifiedAt: { type: Date, default: Date.now },
    modificationHistory: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now },
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'audit.modificationHistory.modifiedByModel'
      },
      modifiedByModel: {
        type: String,
        enum: ['User', 'Seller', 'Admin', 'System']
      }
    }]
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
DroneOrderSchema.index({ orderId: 1 });
DroneOrderSchema.index({ userId: 1 });
DroneOrderSchema.index({ sellerId: 1 });
DroneOrderSchema.index({ droneId: 1 });
DroneOrderSchema.index({ status: 1 });
DroneOrderSchema.index({ 'location.delivery.pincode': 1 });
DroneOrderSchema.index({ createdAt: -1 });
DroneOrderSchema.index({ 'timing.estimatedDeliveryTime': 1 });
DroneOrderSchema.index({ qrCode: 1 });

// Virtual for delivery progress
DroneOrderSchema.virtual('deliveryProgress').get(function() {
  const statusOrder = [
    'pending', 'weather_blocked', 'assigned', 'preparing', 'ready_for_pickup',
    'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery',
    'delivery_attempt', 'delivered'
  ];
  
  const currentIndex = statusOrder.indexOf(this.status);
  return currentIndex >= 0 ? (currentIndex / (statusOrder.length - 1)) * 100 : 0;
});

// Virtual for is overdue
DroneOrderSchema.virtual('isOverdue').get(function() {
  if (!this.timing.estimatedDeliveryTime) return false;
  return new Date() > this.timing.estimatedDeliveryTime && this.status !== 'delivered';
});

// Virtual for delivery time remaining
DroneOrderSchema.virtual('timeRemaining').get(function() {
  if (!this.timing.estimatedDeliveryTime) return null;
  const now = new Date();
  const estimated = new Date(this.timing.estimatedDeliveryTime);
  const diff = estimated - now;
  return diff > 0 ? Math.ceil(diff / (1000 * 60)) : 0; // minutes
});

// Pre-save middleware
DroneOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      location: this.droneId ? {
        lat: 0, // Will be updated by drone telemetry
        lng: 0,
        altitude: 0
      } : null,
      notes: `Status changed to ${this.status}`,
      updatedBy: this.audit?.lastModifiedBy,
      updatedByModel: this.audit?.lastModifiedByModel || 'System'
    });
  }
  
  // Calculate total duration if both pickup and delivery times are available
  if (this.timing.actualPickupTime && this.timing.actualDeliveryTime) {
    this.timing.totalDuration = Math.round(
      (this.timing.actualDeliveryTime - this.timing.actualPickupTime) / (1000 * 60)
    );
  }
  
  next();
});

// Static method to find orders by status
DroneOrderSchema.statics.findByStatus = function(status, options = {}) {
  return this.find({ status }, null, options)
    .populate('userId', 'name email mobile')
    .populate('sellerId', 'name email')
    .populate('droneId', 'droneId name model status')
    .sort({ createdAt: -1 });
};

// Static method to find orders by user
DroneOrderSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ userId }, null, options)
    .populate('droneId', 'droneId name model status location')
    .sort({ createdAt: -1 });
};

// Static method to find orders by seller
DroneOrderSchema.statics.findBySeller = function(sellerId, options = {}) {
  return this.find({ sellerId }, null, options)
    .populate('userId', 'name email mobile')
    .populate('droneId', 'droneId name model status')
    .sort({ createdAt: -1 });
};

// Method to update status
DroneOrderSchema.methods.updateStatus = async function(newStatus, notes = '', updatedBy = null, updatedByModel = 'System') {
  this.status = newStatus;
  this.audit.lastModifiedBy = updatedBy;
  this.audit.lastModifiedByModel = updatedByModel;
  
  if (notes) {
    this.statusHistory[this.statusHistory.length - 1].notes = notes;
  }
  
  // Save drone order first
  await this.save();
  
  // Sync with regular Order model
  try {
    const { default: Order } = await import('./ordersModel.js');
    const order = await Order.findById(this.orderId);
    
    if (order) {
      // Map drone order status to regular order status
      let orderStatus = 'pending';
      switch (newStatus) {
        case 'pending':
        case 'weather_blocked':
          orderStatus = 'arrived';
          break;
        case 'assigned':
          orderStatus = 'preparing';
          break;
        case 'ready_for_pickup':
          orderStatus = 'ready';
          break;
        case 'picked_up':
        case 'in_transit':
        case 'approaching_delivery':
          orderStatus = 'out_for_delivery';
          break;
        case 'delivered':
          orderStatus = 'delivered';
          break;
        case 'cancelled':
        case 'failed':
          orderStatus = 'cancelled';
          break;
        default:
          orderStatus = 'pending';
      }
      
      // Update order status
      order.status = {
        current: orderStatus,
        history: order.status?.history || [],
        lastUpdated: new Date()
      };
      
      // Add to history
      order.status.history.push({
        status: orderStatus,
        timestamp: new Date(),
        updatedBy: updatedBy,
        updatedByModel: updatedByModel,
        notes: notes
      });
      
      await order.save();
      console.log(`🔄 Synced drone order status ${newStatus} to order status ${orderStatus} for order ${this.orderId}`);
    }
  } catch (error) {
    console.error('❌ Failed to sync drone order status with Order model:', error);
    // Don't throw error - drone order update should still succeed
  }
  
  return this;
};

// Method to add incident
DroneOrderSchema.methods.addIncident = function(type, description, severity = 'medium') {
  this.incidents.push({ type, description, severity });
  return this.save();
};

// Method to resolve incident
DroneOrderSchema.methods.resolveIncident = function(incidentIndex, resolution) {
  if (this.incidents[incidentIndex]) {
    this.incidents[incidentIndex].resolved = true;
    this.incidents[incidentIndex].resolution = resolution;
    this.incidents[incidentIndex].resolutionTime = new Date();
  }
  return this.save();
};

const DroneOrder = mongoose.model('DroneOrder', DroneOrderSchema);

export { DroneOrder };
