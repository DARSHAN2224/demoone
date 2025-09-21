import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Eye, Save, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    tags: '',
    variants: [],
    inventory: '',
    image: null
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // This would call your API
      const response = await fetch('/api/v1/products/seller');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: Date.now(),
          name: '',
          price: '',
          inventory: '',
          attributes: {}
        }
      ]
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const removeVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'variants') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === 'image' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      const url = editingProduct 
        ? `/api/v1/products/${editingProduct._id}`
        : '/api/v1/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (response.ok) {
        toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      tags: product.tags?.join(', ') || '',
      variants: product.variants || [],
      inventory: product.inventory,
      image: null
    });
    setShowAddForm(true);
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Product deleted successfully');
        fetchProducts();
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      tags: '',
      variants: [],
      inventory: '',
      image: null
    });
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="inventory">Initial Inventory</Label>
                  <Input
                    id="inventory"
                    type="number"
                    value={formData.inventory}
                    onChange={(e) => handleInputChange('inventory', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full p-2 border rounded-md"
                  rows="4"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="fast food, spicy, vegetarian"
                />
              </div>

              <div>
                <Label>Product Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Variants</Label>
                  <Button type="button" onClick={addVariant} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
                
                {formData.variants.map((variant, index) => (
                  <div key={variant.id} className="border rounded-md p-4 mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Variant {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeVariant(index)}
                        variant="destructive"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Inventory"
                        value={variant.inventory}
                        onChange={(e) => updateVariant(index, 'inventory', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" onClick={cancelEdit} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No products found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onEdit={editProduct}
                  onDelete={deleteProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {products.filter(p => p.status === 'approved').map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={editProduct}
              onDelete={deleteProduct}
            />
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {products.filter(p => p.status === 'pending').map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={editProduct}
              onDelete={deleteProduct}
            />
          ))}
        </TabsContent>

        <TabsContent value="out-of-stock" className="space-y-4">
          {products.filter(p => p.inventory === 0).map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={editProduct}
              onDelete={deleteProduct}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ProductCard = ({ product, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <p className="text-sm text-gray-600">{product.category}</p>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(product)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(product._id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-32 object-cover rounded-md mb-3"
          />
        )}
        
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">${product.price}</span>
          <Badge variant={product.inventory > 0 ? 'default' : 'destructive'}>
            {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <Badge variant={product.status === 'approved' ? 'default' : 'secondary'}>
            {product.status}
          </Badge>
          
          {product.variants && product.variants.length > 0 && (
            <span className="text-xs text-gray-500">
              {product.variants.length} variants
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductManagement;
