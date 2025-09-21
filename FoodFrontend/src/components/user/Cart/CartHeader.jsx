import React from 'react';
import { Filter, Share2, Search } from 'lucide-react';

const CartHeader = ({
  cart = [],
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  selectedItems = [],
  bulkOperation,
  setBulkOperation,
  onPerformBulkOperation,
  onClearSelection,
  onShareCart
}) => {
  // Ensure cart is always an array to prevent errors
  const safeCart = Array.isArray(cart) ? cart : [];
  const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 text-sm">
            {safeCart.length} item{safeCart.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          
          <button
            onClick={onShareCart}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center space-x-4 mt-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search cart items..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={sortBy || 'added'}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="added">Recently Added</option>
          <option value="name">Name A-Z</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {/* Bulk Operations */}
      {safeSelectedItems.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-800 font-medium">
              {safeSelectedItems.length} item(s) selected
            </span>
            <div className="flex items-center space-x-3">
              <select
                value={bulkOperation || ''}
                onChange={(e) => setBulkOperation(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="">Select Operation</option>
                <option value="remove">Remove Selected</option>
                <option value="save">Save for Later</option>
              </select>
              <button
                onClick={onPerformBulkOperation}
                disabled={!bulkOperation}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={onClearSelection}
                className="text-yellow-600 hover:text-yellow-800 text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartHeader;
