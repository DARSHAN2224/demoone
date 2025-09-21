import mongoose from 'mongoose';

const droneLogSchema = new mongoose.Schema({
    droneId: {
        type: String,
        required: true,
        index: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    missionId: {
        type: String,
        index: true
    },
    logType: {
        type: String,
        enum: ['flight', 'mission', 'error', 'system'],
        default: 'flight'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    processing: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
            index: true
        },
        startedAt: { type: Date },
        completedAt: { type: Date },
        error: { type: String }
    },
    reports: [{
        type: {
            type: String,
            enum: ['altitude', 'battery', 'velocity', 'trajectory', 'generic']
        },
        title: { type: String },
        path: { type: String, required: true },
        size: { type: Number },
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes for efficient querying
droneLogSchema.index({ droneId: 1, uploadedAt: -1 });
droneLogSchema.index({ missionId: 1 });
droneLogSchema.index({ logType: 1 });
droneLogSchema.index({ 'processing.status': 1 });

const DroneLog = mongoose.model('DroneLog', droneLogSchema);

export default DroneLog;
