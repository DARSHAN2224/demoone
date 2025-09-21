// Cart Virtual Properties - Computed fields

// Virtual for cart expiry status
export const cartExpiryVirtual = function() {
  const now = new Date();
  const expiryDate = new Date(this.cartExpiry);
  return now > expiryDate;
};

// Virtual for days until cart expiry
export const daysUntilExpiryVirtual = function() {
  const now = new Date();
  const expiryDate = new Date(this.cartExpiry);
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Virtual for cart status
export const cartStatusVirtual = function() {
  if (this.items.length === 0) return 'empty';
  if (this.isExpired) return 'expired';
  if (this.items.some(item => !item.isAvailable)) return 'has_unavailable_items';
  return 'active';
};

// Virtual for cart value tier
export const cartValueTierVirtual = function() {
  const total = this.totals.total;
  if (total >= 100) return 'premium';
  if (total >= 50) return 'standard';
  if (total >= 25) return 'basic';
  return 'small';
};

// Virtual for delivery eligibility
export const deliveryEligibilityVirtual = function() {
  const subtotal = this.totals.subtotal;
  if (subtotal >= 100) return 'free_delivery';
  if (subtotal >= 50) return 'reduced_delivery';
  return 'standard_delivery';
};

// Virtual for cart item count
export const cartItemCountVirtual = function() {
  return this.items.length;
};

// Virtual for saved for later count
export const savedForLaterCountVirtual = function() {
  return this.savedForLater.length;
};

// Virtual for total quantity
export const totalQuantityVirtual = function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
};

// Virtual for available items count
export const availableItemsCountVirtual = function() {
  return this.items.filter(item => item.isAvailable).length;
};

// Virtual for unavailable items count
export const unavailableItemsCountVirtual = function() {
  return this.items.filter(item => !item.isAvailable).length;
};

// Virtual for cart age
export const cartAgeVirtual = function() {
  const now = new Date();
  const createdAt = this.createdAt;
  const diffTime = now - createdAt;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Virtual for last activity age
export const lastActivityAgeVirtual = function() {
  const now = new Date();
  const lastActivity = this.lastActivity;
  const diffTime = now - lastActivity;
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  return diffHours;
};

// Virtual for cart health score
export const cartHealthScoreVirtual = function() {
  let score = 100;
  
  // Deduct points for unavailable items
  const unavailableCount = this.unavailableItemsCount;
  score -= unavailableCount * 10;
  
  // Deduct points for old cart
  const cartAge = this.cartAge;
  if (cartAge > 7) score -= 20;
  if (cartAge > 14) score -= 30;
  
  // Deduct points for inactivity
  const activityAge = this.lastActivityAge;
  if (activityAge > 24) score -= 15;
  if (activityAge > 48) score -= 25;
  
  return Math.max(0, score);
};

// Virtual for cart recommendations
export const cartRecommendationsVirtual = function() {
  const recommendations = [];
  
  if (this.cartHealthScore < 50) {
    recommendations.push('Consider clearing your cart and starting fresh');
  }
  
  if (this.unavailableItemsCount > 0) {
    recommendations.push('Remove unavailable items to improve cart health');
  }
  
  if (this.cartAge > 7) {
    recommendations.push('Your cart is getting old, consider completing your order');
  }
  
  if (this.totals.subtotal < 50) {
    recommendations.push('Add more items to qualify for free delivery');
  }
  
  if (this.appliedOffers.length === 0 && this.totals.subtotal > 30) {
    recommendations.push('Check for available offers and discounts');
  }
  
  return recommendations;
};

// Virtual for cart summary
export const cartSummaryVirtual = function() {
  return {
    status: this.cartStatus,
    valueTier: this.cartValueTier,
    deliveryEligibility: this.deliveryEligibility,
    itemCount: this.cartItemCount,
    savedForLaterCount: this.savedForLaterCount,
    totalQuantity: this.totalQuantity,
    availableItemsCount: this.availableItemsCount,
    unavailableItemsCount: this.unavailableItemsCount,
    cartAge: this.cartAge,
    lastActivityAge: this.lastActivityAge,
    healthScore: this.cartHealthScore,
    recommendations: this.cartRecommendations
  };
};
