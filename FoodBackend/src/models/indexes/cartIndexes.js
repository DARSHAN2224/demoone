// Cart Database Indexes - Performance optimization

// User index for fast cart retrieval
export const userIndex = {
  user: 1
};

// Compound index for cart items
export const cartItemsIndex = {
  user: 1,
  'items.productId': 1,
  'items.shopId': 1
};

// Index for saved for later items
export const savedForLaterIndex = {
  user: 1,
  'savedForLater.productId': 1,
  'savedForLater.shopId': 1
};

// Index for applied offers
export const appliedOffersIndex = {
  user: 1,
  'appliedOffers.offerId': 1
};

// Index for cart expiry
export const cartExpiryIndex = {
  cartExpiry: 1
};

// Index for last activity
export const lastActivityIndex = {
  lastActivity: 1
};

// Index for shared carts
export const sharedCartIndex = {
  isShared: 1,
  shareToken: 1,
  shareExpiry: 1
};

// Index for cart analytics
export const cartAnalyticsIndex = {
  user: 1,
  'analytics.viewCount': 1,
  'analytics.shareCount': 1
};

// Text index for search functionality
export const cartSearchIndex = {
  'items.notes': 'text',
  'savedForLater.notes': 'text'
};

// Index for cart validation
export const cartValidationIndex = {
  user: 1,
  'items.isAvailable': 1,
  'items.lastUpdated': 1
};

// Index for cart totals
export const cartTotalsIndex = {
  user: 1,
  'totals.total': 1,
  'totals.subtotal': 1
};

// Index for cart preferences
export const cartPreferencesIndex = {
  user: 1,
  'preferences.autoSave': 1,
  'preferences.notifications': 1
};
