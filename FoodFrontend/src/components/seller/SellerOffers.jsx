import React, { useState } from 'react';
import { 
  Gift, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar,
  Percent,
  Tag,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '../../stores/api.js';

const SellerOffers = ({ offers, onUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minimumOrderAmount: '',
    maximumDiscount: '',
    validFrom: '',
    validUntil: '',
    terms: '',
    usageLimit: -1,
    applicableProducts: [],
    applicableCategories: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug logging
  console.log('🔍 SellerOffers component rendered with:', { 
    offers, 
    offersLength: offers?.length, 
    isCreating, 
    editingId 
  });

  // Ensure offers is always an array
  const safeOffers = Array.isArray(offers) ? offers : [];
  console.log('🔍 Safe offers array:', safeOffers);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Submitting offer data:', formData);
      let response;
      if (editingId) {
        response = await api.patch(`/seller/offers/${editingId}`, formData);
      } else {
        response = await api.post('/seller/offers', formData);
      }

      if (response.data.success) {
        onUpdate(response.data.data);
        resetForm();
        setIsCreating(false);
        setEditingId(null);
      } else {
        setError('Failed to save offer');
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      setError(error.response?.data?.message || 'Failed to save offer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (offer) => {
    setEditingId(offer._id);
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue || '',
      validFrom: offer.validFrom ? offer.validFrom.split('T')[0] : '',
      validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',
      minimumOrderAmount: offer.minimumOrderAmount || '',
      maximumDiscount: offer.maximumDiscount || '',
      terms: offer.terms || '',
      usageLimit: offer.usageLimit || -1,
      applicableProducts: offer.applicableProducts || [],
      applicableCategories: offer.applicableCategories || []
    });
    setIsCreating(true);
  };

  const handleDelete = async (offerId) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        const response = await api.delete(`/seller/offers/${offerId}`);
        if (response.data.success) {
          onUpdate(offers.filter(o => o._id !== offerId));
        } else {
          alert('Failed to delete offer');
        }
      } catch (error) {
        console.error('Error deleting offer:', error);
        alert('Failed to delete offer');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minimumOrderAmount: '',
      maximumDiscount: '',
      validFrom: '',
      validUntil: '',
      terms: '',
      usageLimit: -1,
      applicableProducts: [],
      applicableCategories: []
    });
    setError(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const getOfferStatus = (offer) => {
    const now = new Date();
    const validFrom = new Date(offer.validFrom);
    const validUntil = new Date(offer.validUntil);

    if (now < validFrom) return 'upcoming';
    if (now > validUntil) return 'expired';
    if (!offer.isActive) return 'inactive';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-primary-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'upcoming':
        return <Clock className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'inactive':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offers & Promotions</h2>
          <p className="text-gray-600">Manage your shop offers and attract more customers</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Offer' : 'Create New Offer'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Summer Sale, New Customer Discount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="20"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
                <input type="hidden" name="discountType" value="percentage" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe your offer details..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From *
                </label>
                <input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until *
                </label>
                <input
                  type="date"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="minimumOrderAmount"
                    value={formData.minimumOrderAmount}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Discount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="maximumDiscount"
                    value={formData.maximumDiscount}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                </div>
              </div>
            </div>



            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Saving...' : (editingId ? 'Update Offer' : 'Create Offer')}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Offers List */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Offers</h3>
          <p className="text-sm text-gray-600">
            {safeOffers?.length || 0} offer{safeOffers?.length !== 1 ? 's' : ''} created
          </p>
        </div>

        <div className="p-6">
          {!safeOffers || safeOffers.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
              <p className="text-gray-500">Create your first offer to attract more customers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeOffers.map((offer) => {
                const status = getOfferStatus(offer);
                return (
                  <div key={offer._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{offer.title}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{offer.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Discount:</span>
                            <span className="ml-2 font-medium text-green-600">{offer.discountValue}{offer.discountType === 'percentage' ? '%' : '₹'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Min Order:</span>
                            <span className="ml-2 font-medium">₹{offer.minimumOrderAmount || '0'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Valid From:</span>
                            <span className="ml-2 font-medium">{new Date(offer.validFrom).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Valid Until:</span>
                            <span className="ml-2 font-medium">{new Date(offer.validUntil).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(offer)}
                          className="p-2 text-primary-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(offer._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerOffers;
