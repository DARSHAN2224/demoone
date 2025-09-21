import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { ApiError } from '../utils/ApiError.js';

class ProductService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Create new product with variants
  async createProduct(productData, sellerId) {
    try {
      // Validate shop ownership
      const shop = await Shop.findOne({ sellerId });
      if (!shop) {
        throw new ApiError(404, 'Shop not found');
      }

      // Create product with variants
      const product = new Product({
        ...productData,
        sellerId,
        shopId: shop._id,
        variants: productData.variants || [],
        inventory: this.calculateTotalInventory(productData.variants),
        seo: this.generateSEOData(productData),
        status: 'pending'
      });

      await product.save();
      
      // Clear cache
      this.clearCache();
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  // Update product
  async updateProduct(productId, updateData, sellerId) {
    try {
      const product = await Product.findOne({ _id: productId, sellerId });
      if (!product) {
        throw new ApiError(404, 'Product not found or unauthorized');
      }

      // Update variants and recalculate inventory
      if (updateData.variants) {
        updateData.inventory = this.calculateTotalInventory(updateData.variants);
      }

      // Update SEO if name/description changed
      if (updateData.name || updateData.description) {
        updateData.seo = this.generateSEOData({
          name: updateData.name || product.name,
          description: updateData.description || product.description,
          category: updateData.category || product.category
        });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      // Clear cache
      this.clearCache();
      
      return updatedProduct;
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID with full details
  async getProductById(productId, includeVariants = true) {
    try {
      const cacheKey = `product_${productId}_${includeVariants}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let query = Product.findById(productId);
      
      if (includeVariants) {
        query = query.populate('variants');
      }

      const product = await query.populate('shopId', 'name location rating');
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Add to cache
      this.addToCache(cacheKey, product);
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  // Get products by shop with filtering and pagination
  async getProductsByShop(shopId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const { category, minPrice, maxPrice, inStock, rating, search } = filters;

      let query = { shopId, status: 'approved' };

      // Apply filters
      if (category) query.category = category;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = minPrice;
        if (maxPrice) query.price.$lte = maxPrice;
      }
      if (inStock) query.inventory = { $gt: 0 };
      if (rating) query.rating = { $gte: rating };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const products = await Product.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('shopId', 'name location rating');

      const total = await Product.countDocuments(query);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Search products across all shops
  async searchProducts(searchParams, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = pagination;
      const { query, category, minPrice, maxPrice, location, rating } = searchParams;

      let searchQuery = { status: 'approved' };

      // Text search
      if (query) {
        searchQuery.$text = { $search: query };
      }

      // Apply filters
      if (category) searchQuery.category = category;
      if (minPrice || maxPrice) {
        searchQuery.price = {};
        if (minPrice) searchQuery.price.$gte = minPrice;
        if (maxPrice) searchQuery.price.$lte = maxPrice;
      }
      if (rating) searchQuery.rating = { $gte: rating };

      // Location-based search
      if (location) {
        searchQuery['shopId.location'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: location.radius || 10000 // 10km default
          }
        };
      }

      // Determine sort order
      let sort = {};
      if (sortBy === 'relevance' && query) {
        sort = { score: { $meta: 'textScore' } };
      } else {
        sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      }

      const products = await Product.find(searchQuery)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('shopId', 'name location rating');

      const total = await Product.countDocuments(searchQuery);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get product variants
  async getProductVariants(productId) {
    try {
      const product = await Product.findById(productId).populate('variants');
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      return product.variants;
    } catch (error) {
      throw error;
    }
  }

  // Update product inventory
  async updateInventory(productId, variantId, quantity, operation = 'decrease') {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      if (variantId) {
        // Update specific variant inventory
        const variant = product.variants.id(variantId);
        if (!variant) {
          throw new ApiError(404, 'Variant not found');
        }

        if (operation === 'decrease') {
          if (variant.inventory < quantity) {
            throw new ApiError(400, 'Insufficient inventory');
          }
          variant.inventory -= quantity;
        } else {
          variant.inventory += quantity;
        }

        await product.save();
      } else {
        // Update main product inventory
        if (operation === 'decrease') {
          if (product.inventory < quantity) {
            throw new ApiError(400, 'Insufficient inventory');
          }
          product.inventory -= quantity;
        } else {
          product.inventory += quantity;
        }

        await product.save();
      }

      // Clear cache
      this.clearCache();
      
      return { success: true, message: 'Inventory updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get product analytics
  async getProductAnalytics(productId, timeRange = '30d') {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Calculate analytics based on time range
      const analytics = {
        views: product.views || 0,
        sales: product.sales || 0,
        revenue: product.revenue || 0,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        inventory: product.inventory,
        variants: product.variants?.length || 0,
        lastUpdated: product.updatedAt
      };

      return analytics;
    } catch (error) {
      throw error;
    }
  }

  // Approve/reject product
  async updateProductStatus(productId, status, adminId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      product.status = status;
      product.approvedBy = adminId;
      product.approvedAt = new Date();

      await product.save();
      
      // Clear cache
      this.clearCache();
      
      return product;
    } catch (error) {
      throw error;
    }
  }

  // Delete product
  async deleteProduct(productId, sellerId) {
    try {
      const product = await Product.findOne({ _id: productId, sellerId });
      if (!product) {
        throw new ApiError(404, 'Product not found or unauthorized');
      }

      await Product.findByIdAndDelete(productId);
      
      // Clear cache
      this.clearCache();
      
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get trending products
  async getTrendingProducts(limit = 10) {
    try {
      const cacheKey = `trending_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const products = await Product.find({ status: 'approved' })
        .sort({ views: -1, sales: -1, rating: -1 })
        .limit(limit)
        .populate('shopId', 'name location rating');

      // Add to cache
      this.addToCache(cacheKey, products);
      
      return products;
    } catch (error) {
      throw error;
    }
  }

  // Get recommended products
  async getRecommendedProducts(userId, limit = 10) {
    try {
      // This would integrate with a recommendation engine
      // For now, return trending products
      return await this.getTrendingProducts(limit);
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  calculateTotalInventory(variants) {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((total, variant) => total + (variant.inventory || 0), 0);
  }

  generateSEOData(productData) {
    return {
      title: `${productData.name} - ${productData.category}`,
      description: productData.description?.substring(0, 160) || '',
      keywords: [
        productData.name,
        productData.category,
        ...(productData.tags || [])
      ].join(', '),
      slug: this.generateSlug(productData.name)
    };
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  addToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

export const productService = new ProductService();
export default productService;
