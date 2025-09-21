// Cart Methods - All cart-related functionality

// Method to add item to cart
export const addItem = function(productId, shopId, quantity, price, variant = null, notes = '') {
  const existingItemIndex = this.items.findIndex(item => 
    item.productId.toString() === productId.toString() &&
    item.shopId.toString() === shopId.toString() &&
    JSON.stringify(item.variant) === JSON.stringify(variant)
  );

  if (existingItemIndex !== -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
    this.items[existingItemIndex].lastUpdated = new Date();
  } else {
    // Add new item
    this.items.push({
      productId,
      shopId,
      quantity,
      price,
      variant,
      totalPrice: price * quantity,
      notes,
      addedAt: new Date(),
      lastUpdated: new Date(),
      isAvailable: true
    });
  }

  this.lastActivity = new Date();
  return this.save();
};

// Method to update item quantity
export const updateItemQuantity = function(itemId, quantity) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    this.items.splice(itemIndex, 1);
  } else {
    this.items[itemIndex].quantity = quantity;
    this.items[itemIndex].totalPrice = this.items[itemIndex].price * quantity;
    this.items[itemIndex].lastUpdated = new Date();
  }

  this.lastActivity = new Date();
  return this.save();
};

// Method to remove item from cart
export const removeItem = function(itemId) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  this.items.splice(itemIndex, 1);
  this.lastActivity = new Date();
  return this.save();
};

// Method to add item to saved for later
export const addToSavedForLater = function(itemId) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  const item = this.items[itemIndex];
  
  // Check if item already exists in saved for later
  const existingSavedIndex = this.savedForLater.findIndex(savedItem => 
    savedItem.productId.toString() === item.productId.toString() &&
    savedItem.shopId.toString() === item.shopId.toString() &&
    JSON.stringify(savedItem.variant) === JSON.stringify(item.variant)
  );

  if (existingSavedIndex !== -1) {
    // Update existing saved item
    this.savedForLater[existingSavedIndex].quantity += item.quantity;
  } else {
    // Add new saved item
    this.savedForLater.push({
      productId: item.productId,
      shopId: item.shopId,
      quantity: item.quantity,
      price: item.price,
      variant: item.variant,
      notes: item.notes,
      addedAt: new Date()
    });
  }

  // Remove from active items
  this.items.splice(itemIndex, 1);
  this.lastActivity = new Date();
  
  return this.save();
};

// Method to move item from saved for later to cart
export const moveToCart = function(savedItemId) {
  const savedItemIndex = this.savedForLater.findIndex(item => 
    item._id.toString() === savedItemId.toString()
  );

  if (savedItemIndex === -1) {
    throw new Error('Item not found in saved for later');
  }

  const savedItem = this.savedForLater[savedItemIndex];
  
  // Check if item already exists in cart
  const existingCartIndex = this.items.findIndex(cartItem => 
    cartItem.productId.toString() === savedItem.productId.toString() &&
    cartItem.shopId.toString() === savedItem.shopId.toString() &&
    JSON.stringify(cartItem.variant) === JSON.stringify(savedItem.variant)
  );

  if (existingCartIndex !== -1) {
    // Update existing cart item
    this.items[existingCartIndex].quantity += savedItem.quantity;
    this.items[existingCartIndex].totalPrice = this.items[existingCartIndex].price * this.items[existingCartIndex].quantity;
    this.items[existingCartIndex].lastUpdated = new Date();
  } else {
    // Add new cart item
    this.items.push({
      productId: savedItem.productId,
      shopId: savedItem.shopId,
      quantity: savedItem.quantity,
      price: savedItem.price,
      variant: savedItem.variant,
      totalPrice: savedItem.price * savedItem.quantity,
      notes: savedItem.notes,
      addedAt: new Date(),
      lastUpdated: new Date(),
      isAvailable: true
    });
  }

  // Remove from saved for later
  this.savedForLater.splice(savedItemIndex, 1);
  this.lastActivity = new Date();
  
  return this.save();
};

// Method to clear cart
export const clearCart = function() {
  this.items = [];
  this.savedForLater = [];
  this.totals = {
    subtotal: 0,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    total: 0
  };
  this.totalQty = 0;
  this.totalCost = 0;
  this.appliedOffers = [];
  this.lastActivity = new Date();
  
  return this.save();
};

// Method to apply offer
export const applyOffer = function(offer) {
  // Remove existing offers
  this.appliedOffers = [];
  
  if (offer) {
    this.appliedOffers.push({
      offerId: offer._id,
      code: offer.code || 'OFFER',
      discountAmount: offer.discountValue,
      discountType: offer.discountType,
      appliedAt: new Date()
    });
    
    // Calculate discount
    if (offer.discountType === 'percentage') {
      this.totals.discount = (this.totals.subtotal * offer.discountValue) / 100;
    } else {
      this.totals.discount = Math.min(offer.discountValue, this.totals.subtotal);
    }
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to check if cart is empty
export const isEmpty = function() {
  return this.items.length === 0;
};

// Method to get cart summary
export const getSummary = function() {
  return {
    itemCount: this.items.length,
    totalQuantity: this.totalQty,
    subtotal: this.totals.subtotal,
    tax: this.totals.tax,
    deliveryFee: this.totals.deliveryFee,
    discount: this.totals.discount,
    total: this.totals.total,
    savedForLaterCount: this.savedForLater.length,
    isExpired: this.isExpired,
    daysUntilExpiry: this.daysUntilExpiry
  };
};

// Method to validate cart items
export const validateItems = async function() {
  for (let i = this.items.length - 1; i >= 0; i--) {
    const item = this.items[i];
    
    // Check if product still exists and is available
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(item.productId);
      
      if (!product || !product.available) {
        item.isAvailable = false;
        item.availabilityMessage = 'Product no longer available';
        continue;
      }

      // Check stock
      if (product.stock < item.quantity) {
        if (product.stock === 0) {
          item.isAvailable = false;
          item.availabilityMessage = 'Out of stock';
        } else {
          item.quantity = product.stock;
          item.totalPrice = item.price * product.stock;
          item.availabilityMessage = `Only ${product.stock} available`;
        }
      } else {
        item.isAvailable = true;
        item.availabilityMessage = null;
      }
    } catch (error) {
      item.isAvailable = false;
      item.availabilityMessage = 'Product validation failed';
    }
  }
  
  return this.save();
};

// Method to calculate totals
export const calculateTotals = function() {
  let subtotal = 0;
  let totalQty = 0;

  // Calculate from available items only
  for (const item of this.items) {
    if (item.isAvailable) {
      subtotal += item.totalPrice;
      totalQty += item.quantity;
    }
  }

  // Calculate discount from applied offers
  let discount = 0;
  for (const appliedOffer of this.appliedOffers) {
    discount += appliedOffer.discountAmount;
  }

  // Calculate other fees
  const taxRate = 0.10; // 10% tax
  const tax = subtotal * taxRate;
  const deliveryFee = subtotal > 50 ? 0 : 5; // Free delivery over $50
  const total = subtotal + tax + deliveryFee - discount;

  // Update totals
  this.totals = {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100
  };

  this.totalQty = totalQty;
  this.totalCost = total;
  
  return this.save();
};

// Method to check if cart is expired
export const checkExpiry = function() {
  const now = new Date();
  const expiryDate = new Date(this.cartExpiry);
  
  if (now > expiryDate) {
    // Cart is expired, clear it
    return this.clearCart();
  }
  
  return this;
};

// Method to update last activity
export const updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to share cart
export const shareCart = function(shareType, recipientEmail = '', message = '') {
  const shareToken = Math.random().toString(36).substr(2, 15);
  const shareExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  this.isShared = true;
  this.shareToken = shareToken;
  this.shareExpiry = shareExpiry;
  this.shareHistory.push({
    sharedAt: new Date(),
    shareType,
    recipientEmail,
    message,
    shareToken
  });

  this.analytics.shareCount += 1;
  this.lastActivity = new Date();
  
  return this.save();
};
