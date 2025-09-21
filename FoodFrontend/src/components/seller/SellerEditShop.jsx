import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { notificationHelpers } from '../../utils/notificationHelpers';
import PageHeader from '../common/PageHeader';
import LoadingSpinner from '../common/LoadingSpinner';
import { api } from '../../stores/api.js';
const SellerEditShop = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', state: '', city: '', location: '',
    openingHours: '', closingHours: '', isActive: 'yes', image: null,
    FSSAI_license: '', Gst_registration: '', Shop_act: '', contactNumber: '',
    latitude: '', longitude: ''
  });
  const [isExistingShop, setIsExistingShop] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Get shop data from the shops endpoint
        let res = null;
        try {
          res = await api.get('/seller/shops');
        } catch (error) {
          console.log('Failed to fetch from /seller/shops:', error.message);
        }
        // Extract data from different possible response structures
        let data = null;
        if (res?.data?.data) {
          // Handle array response (from /seller/shops)
          if (Array.isArray(res.data.data)) {
            data = res.data.data[0]; // Get first shop
          } else {
            // Handle direct object response
            data = res.data.data;
          }
        }
        
        if (!mounted) return;
        
        if (data) {
          console.log('Shop data loaded for editing:', data);
          setForm({
            name: data.name || '',
            description: data.description || '',
            state: data.state || '',
            city: data.city || '',
            location: data.location || '',
            openingHours: data.openingHours || '',
            closingHours: data.closingHours || '',
            isActive: data.isActive ? 'yes' : 'no',
            image: null,
            FSSAI_license: data.FSSAI_license || '',
            Gst_registration: data.Gst_registration || '',
            Shop_act: data.Shop_act || '',
            contactNumber: data.contactNumber || '',
            latitude: data.latitude || '',
            longitude: data.longitude || '',
          });
          setIsExistingShop(true);
        } else {
          console.log('No shop data found - will create new shop');
          // No shop exists - keep form with default values for creation
          setIsExistingShop(false);
        }
      } catch (e) {
        console.error('Error loading shop profile:', e);
        // no existing shop; leave defaults
        setIsExistingShop(false);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Geocode an address to get coordinates
  const geocodeAddress = async (address) => {
    try {
      setIsGeocoding(true);
      setGeocodingError(null);
      
      // Using OpenStreetMap's Nominatim API (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
        
        setForm(prev => ({
          ...prev,
          latitude: coordinates.latitude.toString(),
          longitude: coordinates.longitude.toString()
        }));
        
        return coordinates;
      } else {
        throw new Error('Address not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingError('Could not find coordinates for this address');
      return null;
    } finally {
      setIsGeocoding(false);
    }
  };

  const onChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === 'file') {
      setForm((p) => ({ ...p, [name]: files && files[0] ? files[0] : null }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  // Handle location change and auto-geocode
  const onLocationChange = async (e) => {
    const { value } = e.target;
    setForm((p) => ({ ...p, location: value }));
    
    // Auto-geocode if location is not empty and has at least 10 characters
    if (value && value.length >= 10) {
      setTimeout(() => {
        geocodeAddress(value);
      }, 1000); // Debounce for 1 second
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const normalized = {
        ...form,
        openingHours: form.openingHours?.length >= 2 ? form.openingHours : '09:00',
        closingHours: form.closingHours?.length >= 2 ? form.closingHours : '21:00',
      };
      const fd = new FormData();
      Object.entries(normalized).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });

      if (isExistingShop) {
        // Update existing shop - need to get shop ID first
        const shopRes = await api.get('/seller/shops');
        if (shopRes?.data?.data && Array.isArray(shopRes.data.data) && shopRes.data.data.length > 0) {
          const shopId = shopRes.data.data[0]._id;
          await api.patch(`/seller/shops/${shopId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          throw new Error('No shop found to update');
        }
      } else {
        // Create new shop
        await api.post('/seller/shops', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      notificationHelpers.onSuccess('Shop Saved', 'Your shop details have been saved.');
      navigate('/seller/shop');
    } catch (err) {
      const resp = err?.response?.data;
      const errorsArr = Array.isArray(resp?.errors) ? resp.errors.map(e => e?.msg).filter(Boolean).join(' ') : '';
      const message = resp?.message || err?.message || 'Failed to save shop';
      notificationHelpers.onError('Save Failed', `${message}${errorsArr ? `: ${errorsArr}` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'seller') {
    return <div className="max-w-3xl mx-auto p-6">Unauthorized</div>;
  }
  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <PageHeader
        title={isExistingShop ? 'Edit Shop' : 'Create Shop'}
        secondaryAction={{ to: "/seller/shop", label: "Cancel" }}
        primaryAction={{ to: "/seller/shop", label: "Back" }}
      />
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shop Name</label>
            <input name="name" value={form.name} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input name="contactNumber" value={form.contactNumber} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" rows="3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input name="state" value={form.state} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input name="city" value={form.city} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Shop Address</label>
            <div className="space-y-2">
              <input 
                name="location" 
                value={form.location} 
                onChange={onLocationChange} 
                placeholder="Enter your shop's full address (e.g., 123 Main St, City, State)"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" 
                required 
              />
              {isGeocoding && (
                <p className="text-sm text-primary-600">🔄 Finding coordinates...</p>
              )}
              {geocodingError && (
                <p className="text-sm text-red-600">{geocodingError}</p>
              )}
              {form.latitude && form.longitude && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  ✅ Coordinates found: {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Opening Hours</label>
            <input name="openingHours" value={form.openingHours} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="09:00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Closing Hours</label>
            <input name="closingHours" value={form.closingHours} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="21:00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Active</label>
            <select name="isActive" value={form.isActive} onChange={onChange} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shop Image</label>
            <input type="file" name="image" accept="image/*" onChange={onChange} className="mt-1 w-full" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => navigate('/seller/shop')} className="px-4 py-2 text-sm border border-gray-300 rounded-md">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerEditShop;


