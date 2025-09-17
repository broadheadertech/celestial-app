'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  Plus,
  X,
  Package,
  FileImage,
  Info,
  AlertCircle,
  Loader
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  categoryId: string;
  sku: string;
  stock: string;
  image: string;
  images: string[];
  isActive: boolean;
  productType: 'fish' | 'tank' | 'accessory' | 'food';
  // Fish specific fields
  scientificName?: string;
  size?: string;
  temperature?: string;
  age?: string;
  phLevel?: string;
  lifespan?: string;
  origin?: string;
  diet?: string;
  // Tank specific fields
  tankType?: string;
  material?: string;
  capacity?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  weight?: string;
  thickness?: string;
  lighting?: string;
  filtration?: string;
}

const mockCategories = [
  { id: '1', name: 'Tropical Fish' },
  { id: '2', name: 'Freshwater Fish' },
  { id: '3', name: 'Aquarium Tanks' },
  { id: '4', name: 'Filters & Equipment' },
  { id: '5', name: 'Fish Food' },
  { id: '6', name: 'Decorations' },
];

// Mock product data - in real app, fetch from API
const mockProductData: ProductFormData = {
  name: 'Premium Betta Splendens',
  description: 'Beautiful premium Betta fish with vibrant colors and long flowing fins. Perfect for beginners and experienced aquarists alike.',
  price: '1250.00',
  originalPrice: '1500.00',
  categoryId: '1',
  sku: 'BETTA-001',
  stock: '15',
  image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
  images: [
    'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1520637836862-4d197d17c55a?w=400&h=400&fit=crop'
  ],
  isActive: true,
  productType: 'fish',
  scientificName: 'Betta splendens',
  size: '6',
  temperature: '24-28',
  age: '4',
  phLevel: '6.5-7.5',
  lifespan: '2-3 years',
  origin: 'Thailand',
  diet: 'Carnivore',
  dimensions: {
    length: '',
    width: '',
    height: ''
  }
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // Simulate API call to fetch product data
    const fetchProduct = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFormData(mockProductData);
      setIsLoading(false);
    };

    fetchProduct();
  }, [productId]);

  const handleInputChange = (field: string, value: any) => {
    if (!formData) return;

    setFormData(prev => ({
      ...prev!,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDimensionChange = (dimension: string, value: string) => {
    if (!formData) return;

    setFormData(prev => ({
      ...prev!,
      dimensions: {
        ...prev!.dimensions!,
        [dimension]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData) return false;

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.stock.trim()) newErrors.stock = 'Stock quantity is required';
    if (!formData.image.trim()) newErrors.image = 'Main product image is required';

    // Product type specific validation
    if (formData.productType === 'fish') {
      if (!formData.scientificName?.trim()) newErrors.scientificName = 'Scientific name is required for fish';
      if (!formData.size?.trim()) newErrors.size = 'Size is required for fish';
      if (!formData.temperature?.trim()) newErrors.temperature = 'Temperature requirement is required';
      if (!formData.phLevel?.trim()) newErrors.phLevel = 'pH level is required';
    } else if (formData.productType === 'tank') {
      if (!formData.tankType?.trim()) newErrors.tankType = 'Tank type is required';
      if (!formData.material?.trim()) newErrors.material = 'Material is required';
      if (!formData.capacity?.trim()) newErrors.capacity = 'Capacity is required';
      if (!formData.dimensions?.length?.trim()) newErrors.length = 'Length is required';
      if (!formData.dimensions?.width?.trim()) newErrors.width = 'Width is required';
      if (!formData.dimensions?.height?.trim()) newErrors.height = 'Height is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (type: 'main' | 'gallery') => {
    setUploadingImage(true);
    // Simulate image upload
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockImageUrl = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=400&fit=crop`;

    if (type === 'main') {
      handleInputChange('image', mockImageUrl);
    } else {
      handleInputChange('images', [...formData!.images, mockImageUrl]);
    }

    setUploadingImage(false);
  };

  const removeGalleryImage = (index: number) => {
    if (!formData) return;
    const newImages = formData.images.filter((_, i) => i !== index);
    handleInputChange('images', newImages);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In real app, submit to API
      console.log('Updating product:', formData);

      // Success
      router.push('/admin/products?success=Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/admin/products?success=Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-muted mb-4">The product you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/admin/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Edit Product</h1>
                <p className="text-sm text-muted">Update product information</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="text-error border-error hover:bg-error/10"
              >
                Delete
              </Button>
              <Button
                onClick={() => router.push('/admin/products')}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Basic Information */}
        <Card className="p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Basic Information</h3>
              <p className="text-sm text-muted">Essential product details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Input
                label="Product Name *"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                placeholder="Enter product name"
                error={errors.name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Product Type *
              </label>
              <select
                value={formData.productType}
                onChange={(e) => handleInputChange('productType', e.target.value)}
                className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fish">Fish</option>
                <option value="tank">Tank</option>
                <option value="accessory">Accessory</option>
                <option value="food">Food</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={4}
                className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <Input
                label="Price (PHP) *"
                value={formData.price}
                onChange={(value) => handleInputChange('price', value)}
                type="number"
                placeholder="0.00"
                error={errors.price}
              />
            </div>

            <div>
              <Input
                label="Original Price (PHP)"
                value={formData.originalPrice}
                onChange={(value) => handleInputChange('originalPrice', value)}
                type="number"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className={`w-full bg-secondary border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.categoryId ? 'border-error' : 'border-white/10'
                }`}
              >
                <option value="">Select category</option>
                {mockCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-error text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.categoryId}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Stock Quantity *"
                value={formData.stock}
                onChange={(value) => handleInputChange('stock', value)}
                type="number"
                placeholder="0"
                error={errors.stock}
              />
            </div>

            <div>
              <Input
                label="SKU"
                value={formData.sku}
                onChange={(value) => handleInputChange('sku', value)}
                placeholder="Product SKU"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleInputChange('isActive', !formData.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-white font-medium">
                Product is {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </Card>

        {/* Product Images */}
        <Card className="p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-info/20 rounded-xl">
              <FileImage className="w-6 h-6 text-info" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Product Images</h3>
              <p className="text-sm text-muted">Upload product photos</p>
            </div>
          </div>

          {/* Main Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">
              Main Product Image *
            </label>

            {formData.image ? (
              <div className="relative inline-block">
                <img
                  src={formData.image}
                  alt="Main product"
                  className="w-32 h-32 object-cover rounded-lg border border-white/10"
                />
                <button
                  onClick={() => handleInputChange('image', '')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-error rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleImageUpload('main')}
                disabled={uploadingImage}
                className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                  errors.image ? 'border-error' : 'border-white/20 hover:border-primary'
                } ${uploadingImage ? 'opacity-50' : ''}`}
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted mb-2" />
                    <span className="text-xs text-muted text-center">Upload Image</span>
                  </>
                )}
              </button>
            )}

            {errors.image && (
              <p className="text-error text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.image}
              </p>
            )}
          </div>

          {/* Gallery Images */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Additional Images (Optional)
            </label>

            <div className="flex items-center space-x-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => removeGalleryImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-error rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}

              {formData.images.length < 5 && (
                <button
                  onClick={() => handleImageUpload('gallery')}
                  disabled={uploadingImage}
                  className="w-24 h-24 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                >
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-muted mb-1" />
                      <span className="text-xs text-muted">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Product Type Specific Fields */}
        {formData.productType === 'fish' && (
          <Card className="p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-success/20 rounded-xl">
                <Info className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Fish Specifications</h3>
                <p className="text-sm text-muted">Detailed fish information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Scientific Name *"
                  value={formData.scientificName || ''}
                  onChange={(value) => handleInputChange('scientificName', value)}
                  placeholder="e.g., Betta splendens"
                  error={errors.scientificName}
                />
              </div>

              <div>
                <Input
                  label="Size (cm) *"
                  value={formData.size || ''}
                  onChange={(value) => handleInputChange('size', value)}
                  type="number"
                  placeholder="Fish size in cm"
                  error={errors.size}
                />
              </div>

              <div>
                <Input
                  label="Temperature (°C) *"
                  value={formData.temperature || ''}
                  onChange={(value) => handleInputChange('temperature', value)}
                  placeholder="e.g., 24-28"
                  error={errors.temperature}
                />
              </div>

              <div>
                <Input
                  label="Age (months)"
                  value={formData.age || ''}
                  onChange={(value) => handleInputChange('age', value)}
                  type="number"
                  placeholder="Age in months"
                />
              </div>

              <div>
                <Input
                  label="pH Level *"
                  value={formData.phLevel || ''}
                  onChange={(value) => handleInputChange('phLevel', value)}
                  placeholder="e.g., 6.5-7.5"
                  error={errors.phLevel}
                />
              </div>

              <div>
                <Input
                  label="Lifespan"
                  value={formData.lifespan || ''}
                  onChange={(value) => handleInputChange('lifespan', value)}
                  placeholder="e.g., 2-3 years"
                />
              </div>

              <div>
                <Input
                  label="Origin"
                  value={formData.origin || ''}
                  onChange={(value) => handleInputChange('origin', value)}
                  placeholder="e.g., Thailand"
                />
              </div>

              <div>
                <Input
                  label="Diet"
                  value={formData.diet || ''}
                  onChange={(value) => handleInputChange('diet', value)}
                  placeholder="e.g., Carnivore"
                />
              </div>
            </div>
          </Card>
        )}

        <div className="h-20" />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="px-6 py-4 flex justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleDelete}
              variant="outline"
              className="text-error border-error hover:bg-error/10"
            >
              Delete Product
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => router.push('/admin/products')}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}