import mongoose from 'mongoose';

const DroneSchema = new mongoose.Schema({
  // Basic identification
  droneId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: 50
  },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  model: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  serialNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  
  // MAVSDK port for this drone instance
  mavsdkPort: {
    type: Number,
    required: true,
    unique: true
  },
  
  // Current status and telemetry
  status: { 
    type: String, 
    enum: ['idle', 'assigned', 'launched', 'in_flight', 'delivering', 'returning', 'landed', 'maintenance', 'error', 'stopped'], 
    default: 'idle' 
  },
  operationalStatus: {
    type: String,
    enum: ['operational', 'maintenance_required', 'out_of_service', 'emergency'],
    default: 'operational'
  },
  
  // Location and movement
  homeLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, trim: true }
  },
  
  location: {
    lat: { type: Number, default: 0, required: true },
    lng: { type: Number, default: 0, required: true },
    altitude: { type: Number, default: 0, min: 0, max: 400 }, // Max 400m for safety
    heading: { type: Number, default: 0, min: 0, max: 360 }, // Degrees
    speed: { type: Number, default: 0, min: 0, max: 30 }, // m/s
    verticalSpeed: { type: Number, default: 0 }, // m/s
  },
  
  // Flight parameters
  flightMode: { 
    type: String, 
    enum: ['MANUAL', 'GUIDED', 'AUTO', 'RTL', 'LAND', 'LOITER', 'CIRCLE'],
    default: 'MANUAL'
  },
  armed: { type: Boolean, default: false },
  inAir: { type: Boolean, default: false },
  
  // Battery and power
  battery: { 
    type: Number, 
    default: 100, 
    min: 0, 
    max: 100,
    required: true
  },
  batteryVoltage: { type: Number, min: 0 },
  batteryCurrent: { type: Number },
  batteryTemperature: { type: Number },
  estimatedFlightTime: { type: Number, min: 0 }, // minutes
  
  // Safety and limits
  maxAltitude: { type: Number, default: 120, min: 0, max: 400 }, // meters
  maxSpeed: { type: Number, default: 20, min: 0, max: 30 }, // m/s
  maxPayload: { type: Number, default: 2.5, min: 0 }, // kg
  maxRange: { type: Number, default: 10, min: 0 }, // km
  
  // Weather and environmental
  weatherConditions: {
    windSpeed: { type: Number, min: 0 },
    windDirection: { type: Number, min: 0, max: 360 },
    temperature: { type: Number },
    humidity: { type: Number, min: 0, max: 100 },
    visibility: { type: Number, min: 0 },
    precipitation: { type: Boolean, default: false }
  },
  
  // Maintenance and health
  maintenance: {
    lastMaintenance: { type: Date },
    nextMaintenance: { type: Date },
    totalFlightHours: { type: Number, default: 0, min: 0 },
    totalFlights: { type: Number, default: 0, min: 0 },
    lastInspection: { type: Date },
    inspectionDue: { type: Date },
    healthScore: { type: Number, default: 100, min: 0, max: 100 }
  },
  
  // Safety systems
  safetyFeatures: {
    obstacleAvoidance: { type: Boolean, default: true },
    returnToHome: { type: Boolean, default: true },
    geofencing: { type: Boolean, default: true },
    emergencyLanding: { type: Boolean, default: true },
    lowBatteryReturn: { type: Boolean, default: true }
  },
  
  // Current assignment
  currentAssignment: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DroneOrder' },
    assignedAt: { type: Date },
    estimatedPickupTime: { type: Date },
    estimatedDeliveryTime: { type: Date },
    actualPickupTime: { type: Date },
    actualDeliveryTime: { type: Date }
  },
  
  // Performance metrics
  performance: {
    averageDeliveryTime: { type: Number, default: 0 }, // minutes
    successfulDeliveries: { type: Number, default: 0, min: 0 },
    failedDeliveries: { type: Number, default: 0, min: 0 },
    totalDistance: { type: Number, default: 0, min: 0 }, // km
    efficiency: { type: Number, default: 0, min: 0, max: 100 } // percentage
  },
  
  // Error tracking
  errors: [{
    code: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolution: String
  }],
  
  // Communication
  communication: {
    lastHeartbeat: { type: Date, default: Date.now },
    signalStrength: { type: Number, min: 0, max: 100 },
    connectionStatus: { type: String, enum: ['connected', 'disconnected', 'weak'], default: 'connected' }
  },
  
  // Operational history
  lastOperation: {
    type: { type: String, enum: ['takeoff', 'landing', 'delivery', 'return', 'maintenance'] },
    timestamp: { type: Date },
    location: {
      lat: Number,
      lng: Number,
      altitude: Number
    },
    duration: { type: Number }, // minutes
    success: { type: Boolean }
  },
  
  // Regulatory compliance
  compliance: {
    registrationNumber: { type: String, trim: true },
    operatorLicense: { type: String, trim: true },
    insuranceValid: { type: Boolean, default: true },
    insuranceExpiry: { type: Date },
    lastInspection: { type: Date },
    nextInspection: { type: Date }
  },
  
  // Created and updated timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
DroneSchema.index({ status: 1, operationalStatus: 1 });
DroneSchema.index({ 'location.lat': 1, 'location.lng': 1 });
DroneSchema.index({ battery: 1 });
DroneSchema.index({ 'maintenance.healthScore': 1 });
DroneSchema.index({ 'currentAssignment.orderId': 1 });
DroneSchema.index({ lastActive: -1 });

// Virtual for delivery success rate
DroneSchema.virtual('deliverySuccessRate').get(function() {
  const total = this.performance.successfulDeliveries + this.performance.failedDeliveries;
  return total > 0 ? (this.performance.successfulDeliveries / total) * 100 : 0;
});

// Virtual for battery status
DroneSchema.virtual('batteryStatus').get(function() {
  if (this.battery <= 20) return 'critical';
  if (this.battery <= 40) return 'low';
  if (this.battery <= 70) return 'medium';
  return 'good';
});

// Virtual for operational readiness
DroneSchema.virtual('isOperational').get(function() {
  return this.operationalStatus === 'operational' && 
         this.battery > 20 && 
         this.maintenance.healthScore > 70 &&
         this.compliance.insuranceValid;
});

// Pre-save middleware
DroneSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActive = new Date();
  
  // Update health score based on various factors
  let healthScore = 100;
  
  if (this.battery < 20) healthScore -= 20;
  if (this.battery < 40) healthScore -= 10;
  
  if (this.errors.filter(e => !e.resolved && e.severity === 'critical').length > 0) healthScore -= 30;
  if (this.errors.filter(e => !e.resolved && e.severity === 'high').length > 0) healthScore -= 20;
  
  if (this.maintenance.totalFlightHours > 1000) healthScore -= 10;
  if (this.maintenance.totalFlightHours > 2000) healthScore -= 20;
  
  this.maintenance.healthScore = Math.max(0, healthScore);
  
  next();
});

// Static method to find available drones
DroneSchema.statics.findAvailable = function(criteria = {}) {
  return this.find({
    status: 'idle',
    operationalStatus: 'operational',
    battery: { $gt: 30 },
    'maintenance.healthScore': { $gt: 70 },
    'compliance.insuranceValid': true,
    ...criteria
  }).sort({ 'maintenance.healthScore': -1, battery: -1 });
};

// Static method to find drones needing maintenance
DroneSchema.statics.findNeedingMaintenance = function() {
  return this.find({
    $or: [
      { 'maintenance.healthScore': { $lt: 70 } },
      { 'maintenance.nextMaintenance': { $lte: new Date() } },
      { 'maintenance.inspectionDue': { $lte: new Date() } }
    ]
  });
};

// Method to update telemetry
DroneSchema.methods.updateTelemetry = function(telemetryData) {
  Object.assign(this.location, telemetryData.location || {});
  this.battery = telemetryData.battery || this.battery;
  this.flightMode = telemetryData.flightMode || this.flightMode;
  this.armed = telemetryData.armed || this.armed;
  this.inAir = telemetryData.inAir || this.inAir;
  this.lastActive = new Date();
  
  if (telemetryData.batteryVoltage) this.batteryVoltage = telemetryData.batteryVoltage;
  if (telemetryData.batteryCurrent) this.batteryCurrent = telemetryData.batteryCurrent;
  if (telemetryData.batteryTemperature) this.batteryTemperature = telemetryData.batteryTemperature;
  
  return this.save();
};

// Method to assign to order
DroneSchema.methods.assignToOrder = function(orderId, pickupLocation, deliveryLocation) {
  this.status = 'assigned';
  this.currentAssignment = {
    orderId,
    assignedAt: new Date(),
    estimatedPickupTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    estimatedDeliveryTime: new Date(Date.now() + 25 * 60 * 1000) // 25 minutes from now
  };
  
  return this.save();
};

// Method to release from assignment
DroneSchema.methods.releaseFromAssignment = function() {
  this.status = 'idle';
  this.currentAssignment = {};
  
  return this.save();
};

// Method to log error
DroneSchema.methods.logError = function(code, message, severity = 'medium') {
  this.errors.push({ code, message, severity, timestamp: new Date() });
  
  if (severity === 'critical') {
    this.operationalStatus = 'emergency';
  } else if (severity === 'high' && this.operationalStatus === 'operational') {
    this.operationalStatus = 'maintenance_required';
  }
  
  return this.save();
};

const Drone = mongoose.model('Drone', DroneSchema);

export { Drone };


