import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    discount:{
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    discountedPrice: {
        type: Number,
        min: 0
    },
    shopId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    available: { 
        type: Boolean, 
        default: true 
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    image:  {
        type: String,
    },
    
    // Enhanced Product Features (Industry Standard)
    variants: [{
        name: {
            type: String,
            required: true,
            trim: true
        }, // e.g., "Size", "Color", "Spice Level"
        options: [{
            value: {
                type: String,
                required: true,
                trim: true
            }, // e.g., "Small", "Red", "Mild"
            priceAdjustment: {
                type: Number,
                default: 0
            }, // Price difference from base price
            stock: {
                type: Number,
                default: 0,
                min: 0
            }, // Stock for this specific variant
            available: {
                type: Boolean,
                default: true
            }
        }]
    }],
    
    // Enhanced Inventory Management
    inventory: {
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: 0
        },
        outOfStock: {
            type: Boolean,
            default: false
        },
        backorderAvailable: {
            type: Boolean,
            default: false
        },
        reorderPoint: {
            type: Number,
            default: 5,
            min: 0
        },
        supplierInfo: {
            name: String,
            contact: String,
            leadTime: Number // in days
        }
    },
    
    // Nutritional Information (Industry Standard for Food)
    nutritionalInfo: {
        calories: {
            type: Number,
            min: 0
        },
        protein: {
            type: Number,
            min: 0
        },
        carbs: {
            type: Number,
            min: 0
        },
        fat: {
            type: Number,
            min: 0
        },
        fiber: {
            type: Number,
            min: 0
        },
        sugar: {
            type: Number,
            min: 0
        },
        sodium: {
            type: Number,
            min: 0
        },
        allergens: [String], // e.g., ["nuts", "dairy", "gluten"]
        dietaryTags: [String] // e.g., ["vegetarian", "vegan", "organic"]
    },
    
    // Product Specifications
    specifications: {
        weight: {
            value: Number,
            unit: {
                type: String,
                enum: ['g', 'kg', 'ml', 'l', 'pieces'],
                default: 'g'
            }
        },
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
            unit: {
                type: String,
                enum: ['cm', 'inches'],
                default: 'cm'
            }
        },
        preparationTime: Number, // in minutes
        shelfLife: Number, // in days
        storageInstructions: String
    },
    
    // SEO and Marketing
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String],
        slug: {
            type: String,
            unique: true,
            sparse: true
        }
    },
    
    // Admin approval fields
    isApproved: {
        type: Boolean,
        default: false
    },
    rejectionReason: {
        type: String,
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAt: {
        type: Date
    },
    
    // Rating and engagement fields
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    totalFavorites: {
        type: Number,
        default: 0
    },
    totalComments: {
        type: Number,
        default: 0
    },
    
    // Sales and Performance Metrics
    salesMetrics: {
        totalSold: {
            type: Number,
            default: 0
        },
        revenue: {
            type: Number,
            default: 0
        },
        viewCount: {
            type: Number,
            default: 0
        },
        lastSoldAt: Date
    },
    
    // Product Status and Flags
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued', 'draft'],
        default: 'active'
    },
    featured: {
        type: Boolean,
        default: false
    },
    trending: {
        type: Boolean,
        default: false
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
},{timestamps:true});

// Pre-save middleware to calculate discounted price
productSchema.pre('save', function(next) {
    if (this.discount > 0) {
        this.discountedPrice = this.price - (this.price * this.discount / 100);
    } else {
        this.discountedPrice = this.price;
    }
    
    // Update outOfStock flag based on stock
    this.outOfStock = this.stock <= 0;
    
    // Update available flag
    this.available = this.stock > 0 && this.isApproved && this.status === 'active';
    
    next();
});

// Indexes for performance
productSchema.index({ shopId: 1, isApproved: 1, available: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ averageRating: -1, totalRatings: -1 });
productSchema.index({ 'salesMetrics.totalSold': -1 });
productSchema.index({ featured: 1, trending: 1 });
productSchema.index({ 'seo.slug': 1 });

// Virtual for current price
productSchema.virtual('currentPrice').get(function() {
    return this.discountedPrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
    if (this.discount > 0) {
        return Math.round((this.discount / this.price) * 100);
    }
    return 0;
});

// Method to check if product is low on stock
productSchema.methods.isLowStock = function() {
    return this.stock <= this.inventory.lowStockThreshold;
};

// Method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'decrease') {
    if (operation === 'decrease') {
        this.stock = Math.max(0, this.stock - quantity);
    } else if (operation === 'increase') {
        this.stock += quantity;
    }
    
    this.outOfStock = this.stock <= 0;
    this.available = this.stock > 0 && this.isApproved && this.status === 'active';
    
    return this.save();
};

export const Product = mongoose.model('Product', productSchema);
