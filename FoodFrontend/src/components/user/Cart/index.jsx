import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../stores/appStore';
import { useAuthStore } from '../../../stores/authStore';
import { ShoppingCart, Package, Heart, Filter, Search, Share2, Gift, Trash2, Move, Copy, Star } from 'lucide-react';
import LoadingSpinner from '../../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

// Import cart components
import CartHeader from './CartHeader';
import CartItem from './CartItem';
import SavedItem from './SavedItem';
import OrderSummary from './OrderSummary';
import ShareCartModal from './ShareCartModal';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cart, cartTotal, isLoading, error, updateCartItemQuantity, removeFromCart, createOrder: storeCreateOrder, getShopById } = useAppStore();
  
  // Ensure cart is always an array to prevent errors
  const safeCart = Array.isArray(cart) ? cart : [];
  const safeCartTotal = cartTotal || 0;
  
  // Enhanced state for comprehensive features
  const [selectedShop, setSelectedShop] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryType, setDeliveryType] = useState('regular');
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [shopLocation, setShopLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkOperation, setBulkOperation] = useState('');
  const [showSavedForLater, setShowSavedForLater] = useState(false);
  const [savedForLater, setSavedForLater] = useState([]);
  const [appliedOffers, setAppliedOffers] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [showOffers, setShowOffers] = useState(false);
  const [cartNotes, setCartNotes] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  
  // New enhanced features
  const [showVariants, setShowVariants] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});

  // Get shop location data
  const getShopLocation = async (shopId) => {
    try {
      const result = await getShopById(shopId);
      
      if (result.success && result.shopData) {
        // Check if shop has coordinates
        if (result.shopData.latitude && result.shopData.longitude) {
          const location = {
            address: result.shopData.location || 'Shop Location',
            lat: parseFloat(result.shopData.latitude),
            lng: parseFloat(result.shopData.longitude)
          };
          setShopLocation(location);
          console.log('✅ Shop location fetched with coordinates:', location);
          return location;
        } else {
          // Shop doesn't have coordinates, use geocoding as fallback
          console.log('⚠️ Shop does not have coordinates, attempting geocoding...');
          const address = result.shopData.location || 'Default Shop Location';
          try {
            const geocodedLocation = await geocodeAddress(address);
            setShopLocation(geocodedLocation);
            console.log('✅ Shop location geocoded:', geocodedLocation);
            return geocodedLocation;
          } catch (geocodeError) {
            console.warn('Geocoding failed, using default location:', geocodeError);
            const defaultLocation = {
              address: address,
              lat: 12.9716, // Default Bangalore coordinates
              lng: 77.5946
            };
            setShopLocation(defaultLocation);
            return defaultLocation;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shop location:', error);
    }
    return null;
  };

  // Get user's current location
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setIsGettingLocation(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location'
          };
          setUserLocation(location);
          setIsGettingLocation(false);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          setLocationError(errorMessage);
          setIsGettingLocation(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Geocode an address to get coordinates
  const geocodeAddress = async (address) => {
    try {
      // Skip geocoding for very short addresses, empty strings, or if it looks like coordinates
      if (!address || typeof address !== 'string' || address.trim().length < 5 || 
          /^\d+\.\d+,\s*\d+\.\d+/.test(address) || 
          /^(Shop Location|Current Location|Default Location)/.test(address.trim()) ||
          address.includes('(') && address.includes(')')) {
        console.log('Skipping geocoding for invalid/short address or pre-formatted location:', address);
        return {
          address: address || 'Default Location',
          lat: 12.9716,
          lng: 77.5946
        };
      }

      console.log('🌍 Attempting to geocode address:', address);
      // Using a free geocoding service (Nominatim - OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding service error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const location = {
          address: result.display_name || address,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        console.log('✅ Geocoding successful:', location);
        return location;
      } else {
        console.warn('⚠️ No geocoding results found for:', address);
        throw new Error('Address not found');
      }
    } catch (error) {
      console.warn('⚠️ Geocoding failed for address:', address, 'Error:', error.message);
      // Fallback to default coordinates if geocoding fails
      return {
        address: address,
        lat: 12.9716, // Default to Bangalore
        lng: 77.5946
      };
    }
  };

  // Local createOrder function that passes delivery information
  const createOrder = async () => {
    console.log('🛒 Cart: Creating order with delivery info:', {
      deliveryType,
      deliveryAddress,
      deliveryInstructions,
      pickupLocation,
      deliveryLocation
    });
    
    // Format locations properly for drone delivery
    const formatLocation = async (locationString, isPickup = false) => {
      console.log(`🔍 formatLocation called with:`, { locationString, isPickup, type: typeof locationString });
      
      if (!locationString || locationString.trim() === '') {
        console.log('📍 No location string provided, using fallbacks');
        // For pickup, use shop location if available
        if (isPickup && shopLocation) {
          console.log('📍 Using shop location for pickup:', shopLocation);
          return shopLocation;
        }
        // For delivery, use user's current location if available
        if (!isPickup && userLocation) {
          console.log('📍 Using user location for delivery:', userLocation);
          return userLocation;
        }
        console.log('📍 Using default location');
        return { address: 'Default Location', lat: 12.9716, lng: 77.5946 };
      }
      
      // If it's already an object, return as is
      if (typeof locationString === 'object') {
        console.log('📍 Location is already an object:', locationString);
        return locationString;
      }
      
      // If it's a string, check if it contains coordinates in parentheses
      if (typeof locationString === 'string') {
        // Check if the string contains coordinates in parentheses like "Location (lat, lng)"
        const coordMatch = locationString.match(/\(([0-9.-]+),\s*([0-9.-]+)\)/);
        if (coordMatch) {
          console.log('📍 Location string contains coordinates, extracting them:', locationString);
          return {
            address: locationString,
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2])
          };
        }
        
        // Otherwise, geocode it to get coordinates
        console.log('📍 Geocoding string location:', locationString);
        try {
          const geocodedLocation = await geocodeAddress(locationString);
          console.log('📍 Geocoding successful:', geocodedLocation);
          return geocodedLocation;
        } catch (error) {
          console.warn('📍 Geocoding failed, using fallback:', error.message);
          // Fallback to default coordinates
          return {
            address: locationString,
            lat: 12.9716,
            lng: 77.5946
          };
        }
      }
    };
    
    // Validate and format locations
    const validatedPickupLocation = pickupLocation && pickupLocation.trim() ? pickupLocation.trim() : '';
    const validatedDeliveryLocation = deliveryLocation && deliveryLocation.trim() ? deliveryLocation.trim() : '';
    const validatedDeliveryAddress = deliveryAddress && deliveryAddress.trim() ? deliveryAddress.trim() : '';
    
    console.log('🛒 Validated locations:', {
      pickup: validatedPickupLocation,
      delivery: validatedDeliveryLocation,
      deliveryAddress: validatedDeliveryAddress
    });
    
    const formattedPickupLocation = await formatLocation(validatedPickupLocation, true);
    const formattedDeliveryLocation = await formatLocation(validatedDeliveryLocation, false);
    const formattedDeliveryAddress = await formatLocation(validatedDeliveryAddress, false);
    
    const deliveryInfo = {
      deliveryType,
      deliveryAddress: deliveryAddress, // Keep as user input for regular delivery
      deliveryInstructions,
      pickupLocation: formattedPickupLocation,
      deliveryLocation: formattedDeliveryLocation
    };
    
    console.log('🛒 Cart: Formatted delivery info:', {
      deliveryType,
      deliveryAddress: deliveryAddress,
      pickupLocation: formattedPickupLocation,
      deliveryLocation: formattedDeliveryLocation
    });
    
    return await storeCreateOrder(deliveryInfo);
  };
  const [cartHistory, setCartHistory] = useState([]);
  const [showCartHistory, setShowCartHistory] = useState(false);
  const [cartAnalytics, setCartAnalytics] = useState({});
  const [showCartAnalytics, setShowCartAnalytics] = useState(false);
  const [cartExpiry, setCartExpiry] = useState(null);
  const [cartStatus, setCartStatus] = useState('active');
  const [cartTags, setCartTags] = useState([]);
  const [cartPriority, setCartPriority] = useState('normal');
  const [cartReminders, setCartReminders] = useState([]);
  const [showCartReminders, setShowCartReminders] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🛒 Cart component: cart changed:', safeCart);
    if (safeCart.length > 0) {
      console.log('🛒 Cart component: cart items with shop details:');
      safeCart.forEach((item, index) => {
        console.log(`  Item ${index}:`, {
          id: item._id,
          name: item.name,
          shopId: item.shopId,
          shopName: item.shopName,
          shopCity: item.shopCity,
          shopState: item.shopState,
          price: item.price,
          quantity: item.quantity,
          variants: item.variants
        });
      });
    }
  }, [safeCart]);

  useEffect(() => {
    // Group cart items by shop
    if (safeCart.length > 0) {
      const shopId = safeCart[0].shopId;
      setSelectedShop(shopId);
    }
    
    // Load comprehensive cart data
    loadSavedForLater();
    loadAvailableOffers();
    loadCartHistory();
    loadCartAnalytics();
    loadCartExpiry();
    loadCartTags();
    loadCartReminders();
    
    // Get user's location when component mounts
    getUserLocation().catch(error => {
      console.log('Could not get user location:', error.message);
    });
    
    // Get shop location if cart has items
    if (safeCart.length > 0) {
      const shopId = safeCart[0].shopId;
      getShopLocation(shopId).then(shopLoc => {
        if (shopLoc) {
          // Automatically set pickup location for drone delivery only
          if (deliveryType === 'drone' && !pickupLocation) {
            setPickupLocation(`Shop Location (${shopLoc.lat.toFixed(4)}, ${shopLoc.lng.toFixed(4)})`);
          }
        }
      });
    }
  }, [safeCart, deliveryType, deliveryAddress, pickupLocation]);

  const loadSavedForLater = async () => {
    try {
      // Enhanced saved for later with variants and shop details
      setSavedForLater([
        {
          _id: 'saved1',
          name: 'Premium Coffee Beans',
          price: 25.99,
          originalPrice: 29.99,
          shopName: 'Coffee Corner',
          shopId: 'shop1',
          image: '/coffee-beans.jpg',
          quantity: 1,
          variants: [
            { name: 'Size', value: '500g', price: 25.99 },
            { name: 'Size', value: '1kg', price: 45.99 }
          ],
          category: 'Beverages',
          tags: ['organic', 'premium', 'coffee'],
          expiryDate: '2024-12-31',
          stockAvailable: true
        },
        {
          _id: 'saved2',
          name: 'Artisan Bread',
          price: 8.99,
          originalPrice: 10.99,
          shopName: 'Bakery Delights',
          shopId: 'shop2',
          image: '/bread.jpg',
          quantity: 2,
          variants: [
            { name: 'Type', value: 'Sourdough', price: 8.99 },
            { name: 'Type', value: 'Whole Wheat', price: 9.99 }
          ],
          category: 'Bakery',
          tags: ['fresh', 'artisan', 'bread'],
          expiryDate: '2024-01-15',
          stockAvailable: true
        }
      ]);
    } catch (error) {
      console.error('Error loading saved for later:', error);
    }
  };

  const loadAvailableOffers = async () => {
    try {
      // Enhanced offers with conditions and benefits
      setAvailableOffers([
        {
          _id: 'offer1',
          code: 'SAVE20',
          title: '20% Off on Orders Above $50',
          description: 'Get 20% discount on orders above $50',
          discountType: 'percentage',
          discountValue: 20,
          minOrderAmount: 50,
          maxDiscount: 25,
          applicableCategories: ['Beverages', 'Bakery', 'Snacks'],
          applicableShops: ['shop1', 'shop2'],
          validFrom: '2024-01-01',
          validUntil: '2024-12-31',
          usageLimit: 1,
          usageCount: 0,
          isStackable: false,
          conditions: ['Minimum order amount', 'Valid categories only'],
          benefits: ['Instant discount', 'No minimum items']
        },
        {
          _id: 'offer2',
          code: 'FREEDEL',
          title: 'Free Delivery on Orders Above $30',
          description: 'Free delivery for orders above $30',
          discountType: 'delivery',
          discountValue: 100,
          minOrderAmount: 30,
          maxDiscount: 10,
          applicableCategories: ['All'],
          applicableShops: ['shop1', 'shop2', 'shop3'],
          validFrom: '2024-01-01',
          validUntil: '2024-12-31',
          usageLimit: 3,
          usageCount: 1,
          isStackable: true,
          conditions: ['Minimum order amount', 'Delivery orders only'],
          benefits: ['Free delivery', 'Stackable with other offers']
        }
      ]);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  const loadCartHistory = async () => {
    try {
      // Load user's cart history
      setCartHistory([
        {
          _id: 'history1',
          date: '2024-01-10',
          items: [
            { name: 'Coffee Beans', quantity: 2, price: 25.99 },
            { name: 'Bread', quantity: 1, price: 8.99 }
          ],
          total: 60.97,
          status: 'completed',
          shopName: 'Coffee Corner'
        },
        {
          _id: 'history2',
          date: '2024-01-08',
          items: [
            { name: 'Milk', quantity: 1, price: 4.99 },
            { name: 'Eggs', quantity: 12, price: 6.99 }
          ],
          total: 11.98,
          status: 'completed',
          shopName: 'Fresh Market'
        }
      ]);
    } catch (error) {
      console.error('Error loading cart history:', error);
    }
  };

  const loadCartAnalytics = async () => {
    try {
      // Load cart analytics
      setCartAnalytics({
        totalOrders: 15,
        averageOrderValue: 45.67,
        favoriteCategories: ['Beverages', 'Bakery', 'Snacks'],
        favoriteShops: ['Coffee Corner', 'Bakery Delights'],
        totalSavings: 89.45,
        itemsInCart: safeCart.length,
        cartValue: safeCartTotal,
        estimatedDelivery: '2-3 days',
        carbonFootprint: '0.5 kg CO2'
      });
    } catch (error) {
      console.error('Error loading cart analytics:', error);
    }
  };

  const loadCartExpiry = async () => {
    try {
      // Calculate cart expiry (24 hours from first item added)
      const firstItemDate = safeCart.length > 0 ? new Date(safeCart[0].addedAt || Date.now()) : new Date();
      const expiryDate = new Date(firstItemDate.getTime() + 24 * 60 * 60 * 1000);
      setCartExpiry(expiryDate);
      
      // Check if cart is expired
      if (expiryDate < new Date()) {
        setCartStatus('expired');
        toast.error('Your cart has expired. Items have been cleared.');
        // Clear expired cart
        clearExpiredCart();
      }
    } catch (error) {
      console.error('Error loading cart expiry:', error);
    }
  };

  const loadCartTags = async () => {
    try {
      // Generate tags based on cart contents
      const tags = [];
      safeCart.forEach(item => {
        if (item.tags) {
          tags.push(...item.tags);
        }
        if (item.category) {
          tags.push(item.category);
        }
      });
      setCartTags([...new Set(tags)]);
    } catch (error) {
      console.error('Error loading cart tags:', error);
    }
  };

  const loadCartReminders = async () => {
    try {
      // Load cart reminders
      setCartReminders([
        {
          _id: 'reminder1',
          type: 'expiry',
          message: 'Your cart expires in 2 hours',
          time: new Date(Date.now() + 2 * 60 * 60 * 1000),
          isActive: true
        },
        {
          _id: 'reminder2',
          type: 'offer',
          message: 'SAVE20 offer expires in 1 day',
          time: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true
        }
      ]);
    } catch (error) {
      console.error('Error loading cart reminders:', error);
    }
  };

  // Enhanced cart operations
  const handleVariantSelection = (itemId, variant) => {
    setSelectedVariants(prev => ({
      ...prev,
      [itemId]: variant
    }));
    
    // Update item price based on variant
    const item = safeCart.find(cartItem => cartItem._id === itemId);
    if (item && item.variants) {
      const selectedVariant = item.variants.find(v => v.value === variant.value);
      if (selectedVariant) {
        updateCartItemQuantity(itemId, item.quantity, selectedVariant.price);
      }
    }
  };

  const moveToSavedForLater = async (itemId) => {
    try {
      const item = safeCart.find(cartItem => cartItem._id === itemId);
      if (item) {
        // Add to saved for later
        setSavedForLater(prev => [...prev, { ...item, _id: `saved_${Date.now()}` }]);
        
        // Remove from cart
        removeFromCart(itemId);
        
        toast.success(`${item.name} moved to Saved for Later`);
      }
    } catch (error) {
      console.error('Error moving item to saved for later:', error);
      toast.error('Failed to move item to Saved for Later');
    }
  };

  const moveToCart = async (savedItemId) => {
    try {
      const savedItem = savedForLater.find(item => item._id === savedItemId);
      if (savedItem) {
        // Add to cart
        // This would call the backend API to add item to cart
        
        // Remove from saved for later
        setSavedForLater(prev => prev.filter(item => item._id !== savedItemId));
        
        toast.success(`${savedItem.name} moved to cart`);
      }
    } catch (error) {
      console.error('Error moving item to cart:', error);
      toast.error('Failed to move item to cart');
    }
  };

  const applyOffer = async (offerCode) => {
    try {
      const offer = availableOffers.find(o => o.code === offerCode);
      if (offer) {
        // Check if offer is applicable
        if (cartTotal < offer.minOrderAmount) {
          toast.error(`Minimum order amount of $${offer.minOrderAmount} required for this offer`);
          return;
        }
        
        // Apply offer
        setAppliedOffers(prev => [...prev, offer]);
        
        // Update available offers
        setAvailableOffers(prev => 
          prev.map(o => 
            o._id === offer._id 
              ? { ...o, usageCount: o.usageCount + 1 }
              : o
          )
        );
        
        toast.success(`Offer ${offer.code} applied successfully!`);
      }
    } catch (error) {
      console.error('Error applying offer:', error);
      toast.error('Failed to apply offer');
    }
  };

  const removeOffer = async (offerId) => {
    try {
      setAppliedOffers(prev => prev.filter(offer => offer._id !== offerId));
      toast.success('Offer removed successfully');
    } catch (error) {
      console.error('Error removing offer:', error);
      toast.error('Failed to remove offer');
    }
  };

  const handleBulkOperation = async (operation) => {
    try {
      if (selectedItems.length === 0) {
        toast.error('Please select items for bulk operation');
        return;
      }
      
      switch (operation) {
        case 'moveToSaved':
          selectedItems.forEach(itemId => moveToSavedForLater(itemId));
          setSelectedItems([]);
          break;
        case 'remove':
          selectedItems.forEach(itemId => removeFromCart(itemId));
          setSelectedItems([]);
          toast.success('Selected items removed from cart');
          break;
        case 'updateQuantity':
          // Show quantity update modal
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast.error('Bulk operation failed');
    }
  };

  const clearExpiredCart = async () => {
    try {
      // Clear all cart items
      safeCart.forEach(item => removeFromCart(item._id));
      setCartStatus('cleared');
      toast.success('Expired cart cleared');
    } catch (error) {
      console.error('Error clearing expired cart:', error);
    }
  };

  const shareCart = async () => {
    try {
      setIsSharing(true);
      // Generate shareable cart link
      const shareData = {
        items: safeCart,
        total: safeCartTotal,
        message: shareMessage,
        recipient: shareRecipient
      };
      
      // This would call the backend API to create a shareable cart
      console.log('Sharing cart:', shareData);
      
      toast.success('Cart shared successfully!');
      setIsSharing(false);
    } catch (error) {
      console.error('Error sharing cart:', error);
      toast.error('Failed to share cart');
      setIsSharing(false);
    }
  };

  const duplicateCart = async () => {
    try {
      // Create a duplicate of current cart
      const duplicateData = {
        items: safeCart,
        total: safeCartTotal,
        notes: cartNotes,
        tags: cartTags
      };
      
      // This would call the backend API to duplicate the cart
      console.log('Duplicating cart:', duplicateData);
      
      toast.success('Cart duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating cart:', error);
      toast.error('Failed to duplicate cart');
    }
  };

  const exportCart = async (format = 'json') => {
    try {
      const cartData = {
        items: safeCart,
        total: safeCartTotal,
        appliedOffers,
        notes: cartNotes,
        tags: cartTags,
        exportedAt: new Date().toISOString()
      };
      
      if (format === 'json') {
        const dataStr = JSON.stringify(cartData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cart_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      toast.success('Cart exported successfully!');
    } catch (error) {
      console.error('Error exporting cart:', error);
      toast.error('Failed to export cart');
    }
  };

  // Enhanced filtering and sorting
  const filteredCart = safeCart.filter(item => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const sortedCart = [...filteredCart].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price':
        return a.price - b.price;
      case 'quantity':
        return a.quantity - b.quantity;
      case 'added':
      default:
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
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
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CartHeader 
        cart={safeCart}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        selectedItems={selectedItems}
        bulkOperation={bulkOperation}
        setBulkOperation={setBulkOperation}
        onPerformBulkOperation={() => handleBulkOperation(bulkOperation)}
        onClearSelection={() => setSelectedItems([])}
        onShareCart={shareCart}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {safeCart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Cart Section */}
            <div className="lg:col-span-2">
              {/* Enhanced Cart Controls */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search cart items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="added">Recently Added</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="quantity">Quantity</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={duplicateCart}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={exportCart}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Package className="h-4 w-4" />
                      Export
                    </button>
                    <button
                      onClick={() => setIsSharing(true)}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Bulk Operations */}
                {selectedItems.length > 0 && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-primary-800 font-medium">
                        {selectedItems.length} items selected
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={bulkOperation}
                          onChange={(e) => setBulkOperation(e.target.value)}
                          className="border border-primary-300 rounded px-3 py-1 text-sm"
                        >
                          <option value="">Select action...</option>
                          <option value="moveToSaved">Move to Saved</option>
                          <option value="remove">Remove</option>
                          <option value="updateQuantity">Update Quantity</option>
                        </select>
                        <button
                          onClick={() => handleBulkOperation(bulkOperation)}
                          disabled={!bulkOperation}
                          className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart Items */}
                <div className="space-y-4">
                  {sortedCart.map((item) => (
                    <CartItem
                      key={item._id}
                      item={item}
                      selected={selectedItems.includes(item._id)}
                      onSelect={(itemId) => {
                        setSelectedItems(prev => 
                          prev.includes(itemId) 
                            ? prev.filter(id => id !== itemId)
                            : [...prev, itemId]
                        );
                      }}
                      onQuantityChange={updateCartItemQuantity}
                      onRemove={removeFromCart}
                      onMoveToSaved={moveToSavedForLater}
                      showVariants={showVariants[item._id]}
                      setShowVariants={(show) => setShowVariants(prev => ({ ...prev, [item._id]: show }))}
                      selectedVariant={selectedVariants[item._id]}
                      onVariantSelect={(variant) => handleVariantSelection(item._id, variant)}
                    />
                  ))}
                </div>
              </div>

              {/* Saved for Later Section */}
              {showSavedForLater && savedForLater.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Saved for Later ({savedForLater.length})
                  </h3>
                  <div className="space-y-4">
                    {savedForLater.map((item) => (
                      <SavedItem
                        key={item._id}
                        item={item}
                        onMoveToCart={moveToCart}
                        onRemove={(itemId) => {
                          setSavedForLater(prev => prev.filter(item => item._id !== itemId));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cart History Section */}
              {showCartHistory && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cart History</h3>
                  <div className="space-y-3">
                    {cartHistory.map((history) => (
                      <div key={history._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{history.shopName}</p>
                            <p className="text-sm text-gray-600">{history.date}</p>
                            <p className="text-sm text-gray-600">
                              {history.items.length} items • ${history.total}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Restore this cart
                              console.log('Restoring cart:', history);
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Analytics Section */}
              {showCartAnalytics && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cart Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">{cartAnalytics.totalOrders}</p>
                      <p className="text-sm text-gray-600">Total Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${cartAnalytics.averageOrderValue}</p>
                      <p className="text-sm text-gray-600">Avg Order Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">${cartAnalytics.totalSavings}</p>
                      <p className="text-sm text-gray-600">Total Savings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{cartAnalytics.carbonFootprint}</p>
                      <p className="text-sm text-gray-600">Carbon Footprint</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Reminders Section */}
              {showCartReminders && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cart Reminders</h3>
                  <div className="space-y-3">
                    {cartReminders.map((reminder) => (
                      <div key={reminder._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{reminder.message}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(reminder.time).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Dismiss reminder
                              setCartReminders(prev => 
                                prev.filter(r => r._id !== reminder._id)
                              );
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Section */}
            <div className="lg:col-span-1">
              <OrderSummary
                cart={cart}
                cartTotal={cartTotal}
                appliedOffers={appliedOffers}
                availableOffers={availableOffers}
                showOffers={showOffers}
                setShowOffers={setShowOffers}
                applyOffer={applyOffer}
                removeOffer={removeOffer}
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                deliveryInstructions={deliveryInstructions}
                setDeliveryInstructions={setDeliveryInstructions}
                deliveryType={deliveryType}
                setDeliveryType={setDeliveryType}
                pickupLocation={pickupLocation}
                setPickupLocation={setPickupLocation}
                deliveryLocation={deliveryLocation}
                setDeliveryLocation={setDeliveryLocation}
                userLocation={userLocation}
                locationError={locationError}
                isGettingLocation={isGettingLocation}
                getUserLocation={getUserLocation}
                shopLocation={shopLocation}
                cartNotes={cartNotes}
                setCartNotes={setCartNotes}
                onPlaceOrder={createOrder}
                cartExpiry={cartExpiry}
                cartStatus={cartStatus}
              />
            </div>
          </div>
        )}
      </div>

      {/* Share Cart Modal */}
      <ShareCartModal
        isOpen={isSharing}
        onClose={() => setIsSharing(false)}
        cart={cart}
        total={cartTotal}
        recipient={shareRecipient}
        setRecipient={setShareRecipient}
        message={shareMessage}
        setMessage={setShareMessage}
        onShare={shareCart}
      />
    </div>
  );
};

export default Cart;
