import React, { useState } from 'react';
import { Package, Minus, Plus, Trash2, Heart, Save, Eye, EyeOff } from 'lucide-react';

const CartItem = ({ 
  item, 
  selected, 
  onSelect, 
  onQuantityChange, 
  onRemove, 
  onMoveToSaved 
}) => {
  const [showVariants, setShowVariants] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [itemNotes, setItemNotes] = useState(item.notes || '');

  return (
    <div className="p-6 flex items-center space-x-4">
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="rounded"
      />

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
            
            {/* Variants */}
            {item.variants && Object.keys(item.variants).length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setShowVariants(!showVariants)}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  {showVariants ? 'Hide' : 'Show'} variants
                </button>
                {showVariants && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    {Object.entries(item.variants).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-lg font-semibold text-gray-900">₹{item.price}</div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onQuantityChange(item._id, Math.max(1, item.quantity - 1))}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-gray-900 font-medium">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item._id, item.quantity + 1)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Add notes"
            >
              <Save className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onMoveToSaved(item._id)}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Save for later"
            >
              <Heart className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onRemove(item._id)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Item Notes */}
        {showNotes && (
          <div className="mt-3">
            <textarea
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Add notes for this item..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              rows="2"
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setShowNotes(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save notes logic here
                  setShowNotes(false);
                }}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartItem;
