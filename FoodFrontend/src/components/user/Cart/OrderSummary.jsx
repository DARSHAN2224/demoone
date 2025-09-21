import React, { useState } from 'react';
import { Store, Truck, Zap, Tag, X } from 'lucide-react';

const OrderSummary = ({
  cart,
  cartTotal,
  deliveryType,
  setDeliveryType,
  deliveryAddress,
  setDeliveryAddress,
  deliveryInstructions,
  setDeliveryInstructions,
  pickupLocation,
  setPickupLocation,
  deliveryLocation,
  setDeliveryLocation,
  userLocation,
  locationError,
  isGettingLocation,
  getUserLocation,
  shopLocation,
  cartNotes,
  setCartNotes,
  appliedOffers,
  removeOffer,
  availableOffers,
  showOffers,
  setShowOffers,
  applyOffer,
  onPlaceOrder
}) => {

  const calculateDiscount = () => {
    let totalDiscount = 0;
    for (const offer of appliedOffers) {
      if (offer.discountType === 'percentage') {
        const discount = (cartTotal * offer.discountValue) / 100;
        totalDiscount += Math.min(discount, offer.maximumDiscount || discount);
      } else {
        totalDiscount += Math.min(offer.discountValue, offer.maximumDiscount || offer.discountValue);
      }
    }
    return totalDiscount;
  };

  const finalTotal = cartTotal + (deliveryType === 'drone' ? 50 : 0) - calculateDiscount();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
      
      {/* Shop Information - Amazon Style */}
      {cart.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <Store className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Shop Details</h3>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Shop Name:</span> {cart[0]?.shopName || 'Unknown Shop'}</p>
            <p><span className="font-medium">Location:</span> {cart[0]?.shopCity || 'Unknown City'}, {cart[0]?.shopState || 'Unknown State'}</p>
            <p><span className="font-medium">Items:</span> {cart.length} product{cart.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Applied Offers */}
      {appliedOffers.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
            <Tag className="w-5 h-5" />
            <span>Applied Offers</span>
          </h3>
          <div className="space-y-2">
            {appliedOffers.map((offer) => (
              <div key={offer._id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-green-800">{offer.code}</span>
                  <p className="text-green-600 text-xs">{offer.title}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-800 font-medium">
                    -₹{calculateDiscount().toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeOffer(offer._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Offers */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Available Offers</h3>
          <button
            onClick={() => setShowOffers(!showOffers)}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            {showOffers ? 'Hide' : 'View'}
          </button>
        </div>
        
        {showOffers && (
          <div className="space-y-2">
            {availableOffers.map((offer) => (
              <div key={offer._id} className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-primary-900">{offer.code}</span>
                  <button
                    onClick={() => applyOffer(offer.code)}
                    className="btn-primary-enhanced px-3 py-1 text-sm"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-sm text-primary-700">{offer.description}</p>
                <p className="text-xs text-primary-600 mt-1">
                  Min order: ₹{offer.minimumOrderAmount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Type Selection - Amazon Style */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-base">Delivery Type</h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-4 cursor-pointer p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <input
              type="radio"
              name="deliveryType"
              value="regular"
              checked={deliveryType === 'regular'}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <div className="flex items-center space-x-3 flex-1">
              <Truck className="w-5 h-5 text-gray-600" />
              <div>
                <span className="text-gray-900 font-medium">Regular Delivery</span>
                <p className="text-sm text-gray-500">Standard delivery time</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-600">Free</span>
            </div>
          </label>
          
          <label className="flex items-center space-x-4 cursor-pointer p-3 border border-primary-200 rounded-lg bg-primary-50 hover:border-primary-300 transition-colors">
            <input
              type="radio"
              name="deliveryType"
              value="drone"
              checked={deliveryType === 'drone'}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <div className="flex items-center space-x-3 flex-1">
              <Zap className="w-5 h-5 text-primary-600" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900 font-medium">Drone Delivery</span>
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full font-medium">Fast</span>
                </div>
                <p className="text-sm text-gray-500">Ultra-fast delivery</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-primary-600">₹50</span>
            </div>
          </label>
        </div>
      </div>

      {/* Delivery Information - Amazon Style */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-base">Delivery Information</h3>
        
        <div className="space-y-4">
          {deliveryType === 'drone' ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location *
                  </label>
                  <div className="space-y-2">
                    {shopLocation ? (
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">🏪</span>
                          <span className="font-medium">Shop Location Auto-Selected</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {shopLocation.address}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">⚠️</span>
                          <span className="font-medium">Shop Location Not Available</span>
                        </div>
                        <div className="text-sm text-yellow-600 mt-1">
                          Please contact support or try a different shop
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Location *
                  </label>
                  <div className="space-y-2">
                    <textarea
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      placeholder="Enter your delivery address (e.g., 456 Oak Ave, City)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows="2"
                    />
                    <div className="flex space-x-3">
                      {userLocation && (
                        <button
                          type="button"
                          onClick={() => setDeliveryLocation(`Current Location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`)}
                          className="text-sm text-primary-600 hover:text-primary-700 underline font-medium"
                        >
                          📍 Use my current location
                        </button>
                      )}
                      {!userLocation && !locationError && (
                        <button
                          type="button"
                          onClick={getUserLocation}
                          disabled={isGettingLocation}
                          className="text-sm text-primary-600 hover:text-primary-700 underline font-medium disabled:opacity-50"
                        >
                          {isGettingLocation ? '🔄 Getting location...' : '📍 Get my current location'}
                        </button>
                      )}
                    </div>
                    {locationError && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{locationError}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <div className="space-y-2">
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows="3"
                />
                <div className="flex space-x-3">
                  {userLocation && (
                    <button
                      type="button"
                      onClick={() => setDeliveryAddress(`Current Location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`)}
                      className="text-sm text-primary-600 hover:text-primary-700 underline font-medium"
                    >
                      📍 Use my current location
                    </button>
                  )}
                  {!userLocation && !locationError && (
                    <button
                      type="button"
                      onClick={getUserLocation}
                      disabled={isGettingLocation}
                      className="text-sm text-primary-600 hover:text-primary-700 underline font-medium disabled:opacity-50"
                    >
                      {isGettingLocation ? '🔄 Getting location...' : '📍 Get my current location'}
                    </button>
                  )}
                </div>
                {locationError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{locationError}</p>
                )}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Instructions (Optional)
            </label>
            <textarea
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Any special instructions for delivery?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Notes (Optional)
            </label>
            <textarea
              value={cartNotes}
              onChange={(e) => setCartNotes(e.target.value)}
              placeholder="Any special requests or notes for your order?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="2"
            />
          </div>
        </div>
      </div>

      {/* Price Breakdown - Amazon Style */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-base">Price Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({cart.length} items)</span>
            <span className="text-gray-900 font-medium">₹{cartTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-gray-900 font-medium">
              {deliveryType === 'drone' ? '₹50' : 'Free'}
            </span>
          </div>
          {appliedOffers.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Discount</span>
              <span className="text-green-600 font-medium">-₹{calculateDiscount().toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900 font-medium">₹0</span>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Button - Amazon Style */}
      <button
        onClick={onPlaceOrder}
        disabled={
          deliveryType === 'drone' 
            ? (!pickupLocation.trim() || !deliveryLocation.trim())
            : !deliveryAddress.trim()
        }
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 text-lg font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        Place Order - ₹{finalTotal.toFixed(2)}
      </button>

      {/* Additional Info - Amazon Style */}
      <div className="mt-6 text-xs text-gray-500 text-center space-y-2">
        <p>By placing this order, you agree to our terms and conditions</p>
        {deliveryType === 'drone' && (
          <div className="mt-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div className="text-primary-700 space-y-1">
              <p className="font-medium">🚁 Drone Delivery Features:</p>
              <p>• Weather safety checks and real-time tracking</p>
              <p>• Addresses automatically geocoded for precise delivery</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
