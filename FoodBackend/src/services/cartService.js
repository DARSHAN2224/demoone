import { Cart } from '../models/cartModel.js';
import { Product } from '../models/productsModel.js';
import { ApiError } from '../utils/ApiError.js';

class CartService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Get or create user cart
  async getUserCart(userId) {
    try {
      let cart = await Cart.findOne({ userId }).populate('items.productId');
      
      if (!cart) {
        cart = new Cart({ userId, items: [] });
        await cart.save();
      }
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Add item to cart
  async addToCart(userId, itemData) {
    try {
      const cart = await this.getUserCart(userId);
      
      // Validate product
      const product = await Product.findById(itemData.productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Check inventory
      if (product.inventory < itemData.quantity) {
        throw new ApiError(400, 'Insufficient inventory');
      }

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === itemData.productId
      );

      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex].quantity += itemData.quantity;
        cart.items[existingItemIndex].price = product.price;
        cart.items[existingItemIndex].variantId = itemData.variantId;
        cart.items[existingItemIndex].customizations = itemData.customizations;
      } else {
        // Add new item
        cart.items.push({
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: product.price,
          variantId: itemData.variantId,
          customizations: itemData.customizations || {},
          addedAt: new Date()
        });
      }

      // Recalculate totals
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Update cart item
  async updateCartItem(userId, itemId, updateData) {
    try {
      const cart = await this.getUserCart(userId);
      
      const itemIndex = cart.items.findIndex(
        item => item._id.toString() === itemId
      );

      if (itemIndex === -1) {
        throw new ApiError(404, 'Cart item not found');
      }

      // Update item
      if (updateData.quantity !== undefined) {
        // Validate inventory
        const product = await Product.findById(cart.items[itemIndex].productId);
        if (product.inventory < updateData.quantity) {
          throw new ApiError(400, 'Insufficient inventory');
        }
        cart.items[itemIndex].quantity = updateData.quantity;
      }

      if (updateData.variantId !== undefined) {
        cart.items[itemIndex].variantId = updateData.variantId;
      }

      if (updateData.customizations !== undefined) {
        cart.items[itemIndex].customizations = updateData.customizations;
      }

      // Recalculate totals
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(userId, itemId) {
    try {
      const cart = await this.getUserCart(userId);
      
      cart.items = cart.items.filter(
        item => item._id.toString() !== itemId
      );

      // Recalculate totals
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Clear cart
  async clearCart(userId) {
    try {
      const cart = await this.getUserCart(userId);
      
      cart.items = [];
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Save item for later
  async saveForLater(userId, itemId) {
    try {
      const cart = await this.getUserCart(userId);
      
      const itemIndex = cart.items.findIndex(
        item => item._id.toString() === itemId
      );

      if (itemIndex === -1) {
        throw new ApiError(404, 'Cart item not found');
      }

      const item = cart.items[itemIndex];
      
      // Remove from cart
      cart.items.splice(itemIndex, 1);
      
      // Add to saved items
      if (!cart.savedForLater) {
        cart.savedForLater = [];
      }
      
      cart.savedForLater.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        variantId: item.variantId,
        customizations: item.customizations,
        savedAt: new Date()
      });

      // Recalculate totals
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Move saved item back to cart
  async moveToCart(userId, savedItemId) {
    try {
      const cart = await this.getUserCart(userId);
      
      const savedItemIndex = cart.savedForLater.findIndex(
        item => item._id.toString() === savedItemId
      );

      if (savedItemIndex === -1) {
        throw new ApiError(404, 'Saved item not found');
      }

      const savedItem = cart.savedForLater[savedItemIndex];
      
      // Remove from saved items
      cart.savedForLater.splice(savedItemIndex, 1);
      
      // Add back to cart
      cart.items.push({
        productId: savedItem.productId,
        quantity: savedItem.quantity,
        price: savedItem.price,
        variantId: savedItem.variantId,
        customizations: savedItem.customizations,
        addedAt: new Date()
      });

      // Recalculate totals
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Apply offer to cart
  async applyOffer(userId, offerCode) {
    try {
      const cart = await this.getUserCart(userId);
      
      // Validate offer (this would integrate with offers service)
      const offer = await this.validateOffer(offerCode, cart.totalAmount);
      
      if (!offer) {
        throw new ApiError(400, 'Invalid or expired offer code');
      }

      // Apply offer
      cart.appliedOffer = {
        code: offerCode,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        minAmount: offer.minAmount,
        maxDiscount: offer.maxDiscount,
        appliedAt: new Date()
      };

      // Recalculate totals with offer
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Remove offer from cart
  async removeOffer(userId) {
    try {
      const cart = await this.getUserCart(userId);
      
      cart.appliedOffer = null;
      
      // Recalculate totals without offer
      this.calculateCartTotals(cart);
      
      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Share cart
  async shareCart(userId, shareData) {
    try {
      const cart = await this.getUserCart(userId);
      
      // Generate share link
      const shareId = this.generateShareId();
      
      cart.shared = {
        shareId,
        sharedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        sharedWith: shareData.sharedWith || [],
        message: shareData.message || ''
      };

      await cart.save();
      
      // Clear cache
      this.clearCache();
      
      return {
        shareId,
        shareUrl: `${process.env.FRONTEND_URL}/shared-cart/${shareId}`,
        expiresAt: cart.shared.expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Get shared cart
  async getSharedCart(shareId) {
    try {
      const cart = await Cart.findOne({
        'shared.shareId': shareId,
        'shared.expiresAt': { $gt: new Date() }
      }).populate('items.productId');

      if (!cart) {
        throw new ApiError(404, 'Shared cart not found or expired');
      }

      return cart;
    } catch (error) {
      throw error;
    }
  }

  // Clone shared cart to user cart
  async cloneSharedCart(userId, shareId) {
    try {
      const sharedCart = await this.getSharedCart(shareId);
      const userCart = await this.getUserCart(userId);

      // Add items from shared cart
      for (const item of sharedCart.items) {
        await this.addToCart(userId, {
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId,
          customizations: item.customizations
        });
      }

      return userCart;
    } catch (error) {
      throw error;
    }
  }

  // Get cart summary
  async getCartSummary(userId) {
    try {
      const cart = await this.getUserCart(userId);
      
      return {
        itemCount: cart.items.length,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: cart.subtotal,
        tax: cart.tax,
        deliveryFee: cart.deliveryFee,
        discount: cart.discount,
        total: cart.total,
        appliedOffer: cart.appliedOffer,
        savedForLaterCount: cart.savedForLater?.length || 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  calculateCartTotals(cart) {
    // Calculate subtotal
    cart.subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate tax (example: 8.5%)
    cart.tax = cart.subtotal * 0.085;

    // Calculate delivery fee (example: $5 for orders under $50)
    cart.deliveryFee = cart.subtotal < 50 ? 5 : 0;

    // Apply offer discount
    if (cart.appliedOffer) {
      let discount = 0;
      
      if (cart.appliedOffer.discountType === 'percentage') {
        discount = cart.subtotal * (cart.appliedOffer.discountValue / 100);
        if (cart.appliedOffer.maxDiscount) {
          discount = Math.min(discount, cart.appliedOffer.maxDiscount);
        }
      } else if (cart.appliedOffer.discountType === 'fixed') {
        discount = cart.appliedOffer.discountValue;
      }

      cart.discount = discount;
    } else {
      cart.discount = 0;
    }

    // Calculate total
    cart.total = cart.subtotal + cart.tax + cart.deliveryFee - cart.discount;

    // Update last updated timestamp
    cart.updatedAt = new Date();
  }

  async validateOffer(offerCode, cartAmount) {
    // This would integrate with offers service
    // For now, return a mock offer
    const mockOffers = {
      'SAVE10': {
        discountType: 'percentage',
        discountValue: 10,
        minAmount: 25,
        maxDiscount: 20
      },
      'FREEDEL': {
        discountType: 'fixed',
        discountValue: 5,
        minAmount: 30,
        maxDiscount: 5
      }
    };

    const offer = mockOffers[offerCode];
    if (offer && cartAmount >= offer.minAmount) {
      return offer;
    }

    return null;
  }

  generateShareId() {
    return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

export const cartService = new CartService();
export default cartService;
