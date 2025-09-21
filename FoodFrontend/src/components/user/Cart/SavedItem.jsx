import React from 'react';
import { Package, ArrowRight } from 'lucide-react';

const SavedItem = ({ item, onMoveToCart }) => {
  return (
    <div className="p-6 flex items-center space-x-4">
      <div className="flex-shrink-0">
        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 truncate">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.shopName}</p>
          </div>
          <div className="text-lg font-semibold text-gray-900">₹{item.price}</div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
          
          <button
            onClick={() => onMoveToCart(item._id)}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-800"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Move to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedItem;
