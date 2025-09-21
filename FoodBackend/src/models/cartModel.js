import mongoose from 'mongoose';
import cartSchema from './schemas/cartSchema.js';
import * as cartMethods from './methods/cartMethods.js';
import * as cartIndexes from './indexes/cartIndexes.js';
import * as cartVirtuals from './virtuals/cartVirtuals.js';

// Apply methods to schema
Object.values(cartMethods).forEach(method => {
  cartSchema.methods[method.name] = method;
});

// Apply virtuals to schema
Object.values(cartVirtuals).forEach(virtual => {
  cartSchema.virtual(virtual.name).get(virtual);
});

// Apply indexes to schema
Object.entries(cartIndexes).forEach(([name, index]) => {
  cartSchema.index(index, { name });
});

// Pre-save middleware
cartSchema.pre('save', function(next) {
  // Update last activity on save
  this.lastActivity = new Date();
  
  // Check expiry before saving
  if (this.isExpired) {
    this.clearCart();
  }
  
  next();
});

// Pre-find middleware
cartSchema.pre('find', function() {
  // Always check expiry when querying
  this.where('cartExpiry').gt(new Date());
});

cartSchema.pre('findOne', function() {
  this.where('cartExpiry').gt(new Date());
});

// Create and export the model
const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
