import React, { useState } from 'react';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Edit3, 
  Save, 
  X,
  Image as ImageIcon,
  Upload,
  Plus
} from 'lucide-react';
import { api } from '../../stores/api.js';

const SellerShopTab = ({ shopData, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: shopData?.name || '',
    description: shopData?.description || '',
    location: shopData?.location || '',
    city: shopData?.city || '',
    state: shopData?.state || '',
    pincode: shopData?.pincode || '',
    contactNumber: shopData?.contactNumber || '',
    email: shopData?.email || '',
    openingHours: shopData?.openingHours || '',
    closingHours: shopData?.closingHours || '',
    FSSAI_license: shopData?.FSSAI_license || '',
    Gst_registration: shopData?.Gst_registration || '',
    Shop_act: shopData?.Shop_act || '',
    image: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug logging
  console.log('🔍 SellerShopTab component rendered with:', { 
    shopData, 
    hasShopData: !!shopData, 
    isEditing 
  });
  
  // Log the actual shop data structure
  if (shopData) {
    console.log('🔍 Shop data details:', {
      name: shopData.name,
      description: shopData.description,
      location: shopData.location,
      city: shopData.city,
      state: shopData.state,
      pincode: shopData.pincode,
      contactNumber: shopData.contactNumber,
      openingHours: shopData.openingHours,
      closingHours: shopData.closingHours
    });
  }

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 Shop form submitted with data:', formData);
    setIsLoading(true);
    setError(null);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      // If shop exists, update it; otherwise create new shop
      const endpoint = shopData?._id ? `/seller/shops/${shopData._id}` : '/seller/shops';
      const method = shopData?._id ? 'patch' : 'post';
      
      const response = await api[method](endpoint, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        onUpdate(response.data.data);
        setIsEditing(false);
        setFormData({
          ...formData,
          image: null
        });
      } else {
        setError('Failed to update shop information');
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      setError(error.response?.data?.message || 'Failed to update shop information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: shopData?.name || '',
      description: shopData?.description || '',
      location: shopData?.location || '',
      city: shopData?.city || '',
      state: shopData?.state || '',
      pincode: shopData?.pincode || '',
      contactNumber: shopData?.contactNumber || '',
      email: shopData?.email || '',
      openingHours: shopData?.openingHours || '',
      closingHours: shopData?.closingHours || '',
      FSSAI_license: shopData?.FSSAI_license || '',
      Gst_registration: shopData?.Gst_registration || '',
      Shop_act: shopData?.Shop_act || '',
      image: null
    });
    setError(null);
  };

  if (!shopData && !isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shop Management</h2>
            <p className="text-gray-600">Create your shop to start selling</p>
          </div>
          <button
            onClick={() => {
              console.log('🔍 Create Shop button clicked');
              setIsEditing(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Shop
          </button>
        </div>

        {/* Create Shop Form */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
          <div className="text-center py-12">
            <Store className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Shop Found</h2>
            <p className="text-gray-600 mb-6">Create your shop to start selling products and offers.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shop Management</h2>
          <p className="text-gray-600">Manage your shop information and settings</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Shop
          </button>
        )}
      </div>

      {/* Shop Information */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {shopData ? 'Edit Shop Information' : 'Create New Shop'}
            </h3>
          {/* Shop Image */}
          <div className="flex items-center space-x-6">
            <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {shopData?.image ? (
                <img
                  src={shopData.image}
                  alt={shopData?.name || 'Shop'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-gray-400" />
              )}
            </div>
            
            {isEditing && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Image
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {formData.image && (
                    <span className="text-sm text-green-600">Image selected</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">{shopData?.name || 'No name set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              {isEditing ? (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="text-gray-900">{shopData?.category || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your shop..."
              />
            ) : (
              <p className="text-gray-900">{shopData?.description || 'No description available'}</p>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.contactNumber || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="shop@example.com"
                />
              ) : (
                <p className="text-gray-900">{shopData?.email || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.location || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.city || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.state || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 110001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.pincode || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Business Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Hours
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="openingHours"
                  value={formData.openingHours}
                  onChange={handleInputChange}
                  placeholder="e.g., 9:00 AM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.openingHours || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Hours
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="closingHours"
                  value={formData.closingHours}
                  onChange={handleInputChange}
                  placeholder="e.g., 10:00 PM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.closingHours || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Licenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FSSAI License
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="FSSAI_license"
                  value={formData.FSSAI_license}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.FSSAI_license || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Registration
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="Gst_registration"
                  value={formData.Gst_registration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.Gst_registration || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Act
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="Shop_act"
                  value={formData.Shop_act}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{shopData?.Shop_act || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
          </form>
        ) : (
          <div className="space-y-6">
            {/* Shop Image */}
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {shopData?.image ? (
                  <img
                    src={shopData.image}
                    alt={shopData?.name || 'Shop'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Shop Information</h3>
                <p className="text-gray-600">View and manage your shop details</p>
              </div>
            </div>

            {/* Shop Information Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name
                </label>
                <p className="text-lg font-medium text-gray-900">{shopData?.name || 'No name set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <p className="text-gray-900">{shopData?.category || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <p className="text-gray-900">{shopData?.description || 'No description available'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <p className="text-gray-900">{shopData?.contactNumber || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <p className="text-gray-900">{shopData?.email || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <p className="text-gray-900">{shopData?.location || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <p className="text-gray-900">{shopData?.city || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <p className="text-gray-900">{shopData?.state || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <p className="text-gray-900">{shopData?.pincode || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Hours
                </label>
                <p className="text-gray-900">{shopData?.openingHours || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Hours
                </label>
                <p className="text-gray-900">{shopData?.closingHours || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FSSAI License
                </label>
                <p className="text-gray-900">{shopData?.FSSAI_license || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Registration
                </label>
                <p className="text-gray-900">{shopData?.Gst_registration || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Act
                </label>
                <p className="text-gray-900">{shopData?.Shop_act || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerShopTab;
