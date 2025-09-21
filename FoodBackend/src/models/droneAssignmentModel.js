import mongoose from 'mongoose';

const DroneAssignmentSchema = new mongoose.Schema({
  // Basic assignment information
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DroneOrder', 
    required: true 
  },
  droneId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Drone', 
    required: true 
  },
  
  // Assignment details
  assignmentType: { 
    type: String, 
    enum: ['automatic', 'manual', 'priority', 'emergency'], 
    default: 'automatic' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent', 'emergency'], 
    default: 'normal' 
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: [
      'pending', 'assigned', 'preparing', 'ready', 'launched', 'in_transit',
      'picked_up', 'delivering', 'delivered', 'returning', 'completed', 'cancelled', 'failed'
    ], 
    default: 'pending' 
  },
  
  // Status history
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
  assignedAt: { type: Date, default: Date.now },
    estimatedPickupTime: { type: Date },
    actualPickupTime: { type: Date },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    estimatedReturnTime: { type: Date },
    actualReturnTime: { type: Date },
    totalDuration: { type: Number, min: 0 }, // minutes
    pickupDuration: { type: Number, min: 0 }, // minutes
    deliveryDuration: { type: Number, min: 0 }, // minutes
    returnDuration: { type: Number, min: 0 } // minutes
  },
  
  // Route planning
  route: {
    pickupRoute: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      speed: Number,
      timestamp: Date,
      type: { type: String, enum: ['waypoint', 'pickup', 'delivery'] }
    }],
    deliveryRoute: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      speed: Number,
      timestamp: Date,
      type: { type: String, enum: ['waypoint', 'pickup', 'delivery'] }
    }],
    returnRoute: [{
      lat: Number,
      lng: Number,
      altitude: Number,
      speed: Number,
      timestamp: Date,
      type: { type: String, enum: ['waypoint', 'return'] }
    }],
    totalDistance: { type: Number, min: 0 }, // km
    estimatedDuration: { type: Number, min: 0 }, // minutes
    actualDistance: { type: Number, min: 0 }, // km
    actualDuration: { type: Number, min: 0 } // minutes
  },
  
  // Safety and compliance
  safety: {
    preFlightCheck: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'safety.preFlightCheck.completedByModel'
      },
      completedByModel: {
        type: String,
        enum: ['Admin', 'Seller', 'System']
      },
      checklist: [{
        item: String,
        status: { type: String, enum: ['pass', 'fail', 'warning'] },
        notes: String,
        timestamp: { type: Date, default: Date.now }
      }]
    },
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
    airspaceCheck: {
      isClear: { type: Boolean, default: true },
      restrictions: [String],
      noFlyZones: [String],
      checkedAt: { type: Date, default: Date.now }
    }
  },
  
  // Operational parameters
  operational: {
    maxAltitude: { type: Number, default: 120, min: 0, max: 400 }, // meters
    maxSpeed: { type: Number, default: 20, min: 0, max: 30 }, // m/s
    flightMode: { type: String, enum: ['AUTO', 'GUIDED', 'MANUAL'], default: 'AUTO' },
    emergencyProcedures: {
      returnToHome: { type: Boolean, default: true },
      emergencyLanding: { type: Boolean, default: true },
      obstacleAvoidance: { type: Boolean, default: true }
    }
  },
  
  // Communication and monitoring
  communication: {
    lastHeartbeat: { type: Date, default: Date.now },
    signalStrength: { type: Number, min: 0, max: 100 },
    connectionStatus: { type: String, enum: ['connected', 'disconnected', 'weak'], default: 'connected' },
    telemetryUpdates: [{
      timestamp: { type: Date, default: Date.now },
      location: {
        lat: Number,
        lng: Number,
        altitude: Number
      },
      battery: Number,
      speed: Number,
      heading: Number,
      status: String
    }]
  },
  
  // Incident tracking
  incidents: [{
    type: { type: String, enum: ['weather', 'technical', 'safety', 'communication', 'other'] },
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number,
      altitude: Number
    },
    resolved: { type: Boolean, default: false },
    resolution: String,
    resolutionTime: Date,
    actionRequired: String
  }],
  
  // Performance metrics
  performance: {
    pickupAccuracy: { type: Number, min: 0, max: 100 }, // percentage
    deliveryAccuracy: { type: Number, min: 0, max: 100 }, // percentage
    timeEfficiency: { type: Number, min: 0, max: 100 }, // percentage
    fuelEfficiency: { type: Number, min: 0 }, // km/kWh
    customerSatisfaction: { type: Number, min: 1, max: 5 }
  },
  
  // Notifications and alerts
  notifications: {
    sent: [{
      type: { type: String, required: true },
      recipient: String,
      method: { type: String, enum: ['email', 'sms', 'push', 'in_app'] },
      sentAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['sent', 'delivered', 'failed'] }
    }],
    alerts: [{
      type: { type: String, enum: ['warning', 'error', 'critical', 'info'] },
      message: String,
      timestamp: { type: Date, default: Date.now },
      acknowledged: { type: Boolean, default: false },
      acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'notifications.alerts.acknowledgedByModel'
      },
      acknowledgedByModel: {
        type: String,
        enum: ['User', 'Seller', 'Admin']
      }
    }]
  },
  
  // Audit trail
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audit.createdByModel'
    },
    createdByModel: {
      type: String,
      enum: ['User', 'Seller', 'Admin', 'System']
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
DroneAssignmentSchema.index({ orderId: 1 });
DroneAssignmentSchema.index({ droneId: 1 });
DroneAssignmentSchema.index({ status: 1 });
DroneAssignmentSchema.index({ priority: 1 });
DroneAssignmentSchema.index({ 'timing.assignedAt': -1 });
DroneAssignmentSchema.index({ 'timing.estimatedDeliveryTime': 1 });
DroneAssignmentSchema.index({ 'safety.preFlightCheck.completed': 1 });

// Virtual for assignment progress
DroneAssignmentSchema.virtual('assignmentProgress').get(function() {
  const statusOrder = [
    'pending', 'assigned', 'preparing', 'ready', 'launched', 'in_transit',
    'picked_up', 'delivering', 'delivered', 'returning', 'completed'
  ];
  
  const currentIndex = statusOrder.indexOf(this.status);
  return currentIndex >= 0 ? (currentIndex / (statusOrder.length - 1)) * 100 : 0;
});

// Virtual for is overdue
DroneAssignmentSchema.virtual('isOverdue').get(function() {
  if (!this.timing.estimatedDeliveryTime) return false;
  return new Date() > this.timing.estimatedDeliveryTime && this.status !== 'delivered';
});

// Virtual for time remaining
DroneAssignmentSchema.virtual('timeRemaining').get(function() {
  if (!this.timing.estimatedDeliveryTime) return null;
  const now = new Date();
  const estimated = new Date(this.timing.estimatedDeliveryTime);
  const diff = estimated - now;
  return diff > 0 ? Math.ceil(diff / (1000 * 60)) : 0; // minutes
});

// Virtual for assignment health
DroneAssignmentSchema.virtual('assignmentHealth').get(function() {
  let health = 100;
  
  // Reduce health for incidents
  const criticalIncidents = this.incidents.filter(i => i.severity === 'critical' && !i.resolved).length;
  const highIncidents = this.incidents.filter(i => i.severity === 'high' && !i.resolved).length;
  
  health -= (criticalIncidents * 30) + (highIncidents * 15);
  
  // Reduce health for overdue assignments
  if (this.isOverdue) health -= 20;
  
  // Reduce health for communication issues
  if (this.communication.connectionStatus === 'disconnected') health -= 25;
  if (this.communication.connectionStatus === 'weak') health -= 10;
  
  return Math.max(0, health);
});

// Pre-save middleware
DroneAssignmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      location: null, // Will be updated by drone telemetry
      notes: `Status changed to ${this.status}`,
      updatedBy: this.audit?.lastModifiedBy,
      updatedByModel: this.audit?.lastModifiedByModel || 'System'
    });
  }
  
  // Calculate durations
  if (this.timing.actualPickupTime && this.timing.assignedAt) {
    this.timing.pickupDuration = Math.round(
      (this.timing.actualPickupTime - this.timing.assignedAt) / (1000 * 60)
    );
  }
  
  if (this.timing.actualDeliveryTime && this.timing.actualPickupTime) {
    this.timing.deliveryDuration = Math.round(
      (this.timing.actualDeliveryTime - this.timing.actualPickupTime) / (1000 * 60)
    );
  }
  
  if (this.timing.actualReturnTime && this.timing.actualDeliveryTime) {
    this.timing.returnDuration = Math.round(
      (this.timing.actualReturnTime - this.timing.actualDeliveryTime) / (1000 * 60)
    );
  }
  
  if (this.timing.actualReturnTime && this.timing.assignedAt) {
    this.timing.totalDuration = Math.round(
      (this.timing.actualReturnTime - this.timing.assignedAt) / (1000 * 60)
    );
  }
  
  next();
});

// Static method to find assignments by status
DroneAssignmentSchema.statics.findByStatus = function(status, options = {}) {
  return this.find({ status }, null, options)
    .populate('orderId', 'status location timing')
    .populate('droneId', 'droneId name model status location battery')
    .sort({ 'timing.assignedAt': -1 });
};

// Static method to find assignments by drone
DroneAssignmentSchema.statics.findByDrone = function(droneId, options = {}) {
  return this.find({ droneId }, null, options)
    .populate('orderId', 'status location timing')
    .sort({ 'timing.assignedAt': -1 });
};

// Static method to find active assignments
DroneAssignmentSchema.statics.findActive = function(options = {}) {
  return this.find({
    status: { $in: ['assigned', 'preparing', 'ready', 'launched', 'in_transit', 'picked_up', 'delivering', 'returning'] }
  }, null, options)
    .populate('orderId', 'status location timing')
    .populate('droneId', 'droneId name model status location battery')
    .sort({ priority: -1, 'timing.assignedAt': -1 });
};

// Method to update status
DroneAssignmentSchema.methods.updateStatus = function(newStatus, notes = '', updatedBy = null, updatedByModel = 'System') {
  this.status = newStatus;
  this.audit.lastModifiedBy = updatedBy;
  this.audit.lastModifiedByModel = updatedByModel;
  
  if (notes) {
    this.statusHistory[this.statusHistory.length - 1].notes = notes;
  }
  
  return this.save();
};

// Method to add incident
DroneAssignmentSchema.methods.addIncident = function(type, description, severity = 'medium', location = null) {
  this.incidents.push({ type, description, severity, location });
  return this.save();
};

// Method to resolve incident
DroneAssignmentSchema.methods.resolveIncident = function(incidentIndex, resolution) {
  if (this.incidents[incidentIndex]) {
    this.incidents[incidentIndex].resolved = true;
    this.incidents[incidentIndex].resolution = resolution;
    this.incidents[incidentIndex].resolutionTime = new Date();
  }
  return this.save();
};

// Method to add telemetry update
DroneAssignmentSchema.methods.addTelemetryUpdate = function(telemetryData) {
  this.communication.telemetryUpdates.push({
    timestamp: new Date(),
    location: telemetryData.location || {},
    battery: telemetryData.battery,
    speed: telemetryData.speed,
    heading: telemetryData.heading,
    status: telemetryData.status
  });
  
  // Keep only last 100 telemetry updates
  if (this.communication.telemetryUpdates.length > 100) {
    this.communication.telemetryUpdates = this.communication.telemetryUpdates.slice(-100);
  }
  
  this.communication.lastHeartbeat = new Date();
  
  return this.save();
};

// Method to complete pre-flight check
DroneAssignmentSchema.methods.completePreFlightCheck = function(checklist, completedBy, completedByModel) {
  this.safety.preFlightCheck = {
    completed: true,
    completedAt: new Date(),
    completedBy,
    completedByModel,
    checklist
  };
  
  return this.save();
};

const DroneAssignment = mongoose.model('DroneAssignment', DroneAssignmentSchema);

export { DroneAssignment };


