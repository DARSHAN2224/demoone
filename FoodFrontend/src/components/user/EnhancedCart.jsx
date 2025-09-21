import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  ShoppingCart, Package, Heart, Filter, Search, Share2, Gift, 
  Trash2, Move, Copy, Star, Plus, Minus, Eye, Clock, Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const EnhancedCart = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cart, cartTotal, isLoading, error, updateCartItemQuantity, removeFromCart, createOrder } = useAppStore();
  
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [showSavedForLater, setShowSavedForLater] = useState(false);
  const [savedForLater, setSavedForLater] = useState([]);
  const [appliedOffers, setAppliedOffers] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [showOffers, setShowOffers] = useState(false);
  const [deliveryType, setDeliveryType] = useState('regular');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  useEffect(() => {
    loadCartData();
  }, [cart]);

  const loadCartData = async () => {
    // Load saved for later, offers, etc.
    setSavedForLater([
      { id: 'saved1', name: 'Margherita Pizza', price: 18.99, image: null },
      { id: 'saved2', name: 'Chicken Burger', price: 12.99, image: null }
    ]);
    
    setAvailableOffers([
      { code: 'SAVE20', discount: 20, type: 'percentage', minAmount: 30 },
      { code: 'FREEDEL', discount: 5, type: 'fixed', minAmount: 25 }
    ]);
  };

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cart.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.map(item => item._id));
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItemQuantity(itemId, newQuantity);
    }
  };

  const moveToSavedForLater = (itemId) => {
    const item = cart.find(cartItem => cartItem._id === itemId);
    if (item) {
      setSavedForLater(prev => [...prev, { ...item, id: `saved_${Date.now()}` }]);
      removeFromCart(itemId);
      toast.success(`${item.name} moved to Saved for Later`);
    }
  };

  const moveToCart = (savedItemId) => {
    const savedItem = savedForLater.find(item => item.id === savedItemId);
    if (savedItem) {
      // Add to cart logic here
      setSavedForLater(prev => prev.filter(item => item.id !== savedItemId));
      toast.success(`${savedItem.name} moved to cart`);
    }
  };

  const applyOffer = (offerCode) => {
    const offer = availableOffers.find(o => o.code === offerCode);
    if (offer && cartTotal >= offer.minAmount) {
      if (!appliedOffers.find(o => o.code === offerCode)) {
        setAppliedOffers(prev => [...prev, offer]);
        toast.success(`Offer ${offerCode} applied successfully!`);
      }
    } else {
      toast.error('Offer cannot be applied. Check minimum amount requirement.');
    }
  };

  const removeOffer = (offerCode) => {
    setAppliedOffers(prev => prev.filter(o => o.code !== offerCode));
    toast.success('Offer removed');
  };

  const calculateDiscount = () => {
    let totalDiscount = 0;
    for (const offer of appliedOffers) {
      if (offer.type === 'percentage') {
        totalDiscount += (cartTotal * offer.discount) / 100;
      } else {
        totalDiscount += offer.discount;
      }
    }
    return totalDiscount;
  };

  const calculateDeliveryFee = () => {
    switch (deliveryType) {
      case 'drone': return 8.99;
      case 'express': return 4.99;
      default: return 2.99;
    }
  };

  const finalTotal = cartTotal + calculateDeliveryFee() - calculateDiscount();

  const filteredCart = cart.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCart = [...filteredCart].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'price': return a.price - b.price;
      case 'quantity': return a.quantity - b.quantity;
      case 'added':
      default: return 0;
    }
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Cart</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-600">
                {cart.length} item{cart.length !== 1 ? 's' : ''} in your cart
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowOffers(!showOffers)}
              >
                <Gift className="w-4 h-4 mr-2" />
                Offers
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <Button onClick={() => navigate('/')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Cart Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Cart Items</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === cart.length}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Search and Sort */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search items in cart..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border rounded-md px-3 py-2"
                    >
                      <option value="added">Recently Added</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="quantity">Quantity</option>
                    </select>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-4">
                    {sortedCart.map((item) => (
                      <div key={item._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={() => handleItemSelect(item._id)}
                          className="rounded"
                        />

                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-full h-full text-gray-400 p-2" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                          <p className="text-sm text-gray-500">${item.price}</p>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-lg">${(item.price * item.quantity).toFixed(2)}</div>
                          <div className="text-sm text-gray-500">${item.price} each</div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveToSavedForLater(item._id)}
                            title="Save for later"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromCart(item._id)}
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Saved for Later */}
              {savedForLater.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span>Saved for Later</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {savedForLater.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-full h-full text-gray-400 p-2" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500">${item.price}</p>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => moveToCart(item.id)}
                          >
                            <Move className="w-4 h-4 mr-1" />
                            Move to Cart
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Section */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delivery Options */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Delivery Type</h4>
                    <div className="space-y-2">
                      {[
                        { value: 'regular', label: 'Regular Delivery', price: 2.99, time: '30-45 min' },
                        { value: 'express', label: 'Express Delivery', price: 4.99, time: '15-25 min' },
                        { value: 'drone', label: 'Drone Delivery', price: 8.99, time: '10-15 min' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="deliveryType"
                            value={option.value}
                            checked={deliveryType === option.value}
                            onChange={(e) => setDeliveryType(e.target.value)}
                            className="text-primary-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.time} • ${option.price}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Applied Offers */}
                  {appliedOffers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Applied Offers</h4>
                      {appliedOffers.map((offer) => (
                        <div key={offer.code} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">{offer.code}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOffer(offer.code)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({cart.length} items)</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>${calculateDeliveryFee().toFixed(2)}</span>
                    </div>
                    {calculateDiscount() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${calculateDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button 
                    className="w-full"
                    onClick={() => createOrder()}
                    disabled={cart.length === 0}
                  >
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCart;
