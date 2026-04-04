'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Camera,
  Save,
  X,
  ChevronDown,
  FileText,
  Loader
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

interface ProductFormData {
  // Base product fields
  name: string;
  description: string;
  price: string;
  costPrice: string;
  originalPrice: string;
  categoryId: string;
  category: string;
  image: string;
  images: string[];
  certificateImages: string[];
  stock: string;
  badge: string;
  isActive: boolean;
  sku: string;
  tankNumber: string;
  status: string;
  featured: boolean;
  lifespan: string;

  // Fish specific fields
  scientificName: string;
  fishSize: string;
  fishTemperature: string;
  fishAge: string;
  phLevel: string;
  fishLifespan: string;
  origin: string;
  diet: string;

  // Tank specific fields
  tankType: string;
  material: string;
  capacity: string;
  length: string;
  width: string;
  height: string;
  thickness: string;
  lighting: string;
  filtration: string;
}

interface UploadingImage {
  uri: string;
  uploading: boolean;
  storageId?: Id<"_storage">;
  url?: string;
}

const initialFormData: ProductFormData = {
  // Base product fields
  name: '',
  description: '',
  price: '',
  costPrice: '',
  originalPrice: '',
  categoryId: '',
  category: '',
  image: '',
  images: [],
  certificateImages: [],
  stock: '',
  badge: '',
  isActive: true,
  sku: '',
  tankNumber: '',
  status: 'active',
  featured: false,
  lifespan: '',

  // Fish specific fields
  scientificName: '',
  fishSize: '',
  fishTemperature: '',
  fishAge: '',
  phLevel: '',
  fishLifespan: '',
  origin: '',
  diet: '',

  // Tank specific fields
  tankType: '',
  material: '',
  capacity: '',
  length: '',
  width: '',
  height: '',
  thickness: '',
  lighting: '',
  filtration: ''
};

interface ProductFormProps {
  editProductId?: string | null;
  onSuccess?: () => void;
  isDrawer?: boolean;
}

export function ProductFormContentInner({ editProductId, onSuccess, isDrawer }: ProductFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = editProductId !== undefined ? editProductId : searchParams.get('id');
  const isEditing = !!productId;

  // State
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [uploadingCertificates, setUploadingCertificates] = useState<UploadingImage[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Dropdown states
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTankTypePicker, setShowTankTypePicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showDietPicker, setShowDietPicker] = useState(false);

  // Modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Constants
  const tankTypes = ['Standard', 'Bowfront', 'Corner', 'Cube', 'Hexagon', 'Rimless', 'All-in-One', 'Nano'];
  const materials = ['Glass', 'Acrylic', 'Tempered Glass', 'Low-Iron Glass', 'Plastic'];
  const dietOptions = ['Carnivore', 'Herbivore', 'Omnivore', 'Piscivore', 'Planktivore', 'Detritivore'];

  // Convex queries and mutations
  const categories = useQuery(api.services.categories.getCategories) || [];

  // Fetch data for editing
  const existingProduct = useQuery(
    api.services.products.getProduct,
    isEditing && productId ? { productId: productId as Id<'products'> } : "skip"
  );

  // Fetch fish data if editing and product exists
  const existingFishData = useQuery(
    api.services.products.getFishByProductId,
    isEditing && productId ? { productId: productId as Id<'products'> } : "skip"
  );

  // Fetch tank data if editing and product exists
  const existingTankData = useQuery(
    api.services.products.getTankByProductId,
    isEditing && productId ? { productId: productId as Id<'products'> } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const createProduct = useMutation(api.services.admin.createProduct);
  const updateProduct = useMutation(api.services.products.updateProduct);
  const createFishData = useMutation(api.services.admin.createFishData);
  const createTankData = useMutation(api.services.admin.createTankData);

  const showConfirmation = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setConfirmationModalProps({ title, message, type });
    setShowConfirmationModal(true);
  };

  // Product type detection
  const isFishProduct = formData.category.toLowerCase().includes('fish');
  const isTankProduct = formData.category.toLowerCase().includes('tank') || formData.category.toLowerCase().includes('aquarium');

  // Load basic product data
  useEffect(() => {
    if (existingProduct && isEditing && categories.length > 0) {
      const category = categories.find(cat => cat._id === existingProduct.categoryId);

      // Parse certificate images from certificate string if it contains URLs
      let certificateImages: string[] = [];
      if (existingProduct.certificate && existingProduct.certificate !== 'No certificate provided') {
        // Check if certificate contains URLs (comma-separated or space-separated)
        if (existingProduct.certificate.includes('http')) {
          certificateImages = existingProduct.certificate
            .split(/[,\s]+/)
            .filter(url => url.trim().startsWith('http'))
            .map(url => url.trim());
        }
      }

      setFormData(prev => ({
        ...prev,
        name: existingProduct.name,
        description: existingProduct.description || '',
        price: existingProduct.price.toString(),
        costPrice: existingProduct.costPrice?.toString() || '',
        originalPrice: existingProduct.originalPrice?.toString() || existingProduct.price.toString(),
        categoryId: existingProduct.categoryId,
        category: category?.name || '',
        image: existingProduct.image,
        images: existingProduct.images || [existingProduct.image],
        certificateImages: certificateImages,
        stock: existingProduct.stock.toString(),
        badge: existingProduct.badge || '',
        isActive: existingProduct.isActive,
        sku: (existingProduct.sku || '').toString(),
        tankNumber: existingProduct.tankNumber || '',
        status: existingProduct.productStatus || 'active',
        lifespan: existingProduct.lifespan || '',
      }));
    }
  }, [existingProduct, isEditing, categories]);

  // Load fish data when available
  useEffect(() => {
    if (existingFishData && isEditing) {
      setFormData(prev => ({
        ...prev,
        scientificName: existingFishData.scientificName || '',
        fishSize: existingFishData.size?.toString() || '',
        fishTemperature: existingFishData.temperature?.toString() || '',
        fishAge: existingFishData.age?.toString() || '',
        phLevel: existingFishData.phLevel || '',
        fishLifespan: existingFishData.lifespan || '',
        origin: existingFishData.origin || '',
        diet: existingFishData.diet || '',
      }));
    }
  }, [existingFishData, isEditing]);

  // Load tank data when available
  useEffect(() => {
    if (existingTankData && isEditing) {
      setFormData(prev => ({
        ...prev,
        tankType: existingTankData.tankType || '',
        material: existingTankData.material || '',
        capacity: existingTankData.capacity?.toString() || '',
        length: existingTankData.dimensions?.length?.toString() || '',
        width: existingTankData.dimensions?.width?.toString() || '',
        height: existingTankData.dimensions?.height?.toString() || '',
        thickness: existingTankData.thickness?.toString() || '',
        lighting: existingTankData.lighting?.toString() || '',
        filtration: existingTankData.filtation?.toString() || '', // Note: using 'filtation' as per schema
      }));
    }
  }, [existingTankData, isEditing]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadImageToConvex = async (file: File): Promise<string> => {
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload to Convex
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();

      // Get the public URL
      const fileUrl = await getFileUrl({ storageId });

      if (!fileUrl) {
        throw new Error('Failed to get file URL');
      }

      return fileUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleImagePicker = (type: 'product' | 'certificate' = 'product') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        const uploadingImage: UploadingImage = {
          uri: URL.createObjectURL(file),
          uploading: true
        };

        // Add to uploading state
        if (type === 'certificate') {
          setUploadingCertificates(prev => [...prev, uploadingImage]);
        } else {
          setUploadingImages(prev => [...prev, uploadingImage]);
        }

        try {
          // Upload to Convex
          const uploadedUrl = await uploadImageToConvex(file);

          // Update form data with uploaded URL
          if (type === 'certificate') {
            setFormData(prev => ({
              ...prev,
              certificateImages: [...prev.certificateImages, uploadedUrl]
            }));
            setUploadingCertificates(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          } else {
            setFormData(prev => ({
              ...prev,
              image: prev.image || uploadedUrl,
              images: [...prev.images, uploadedUrl]
            }));
            setUploadingImages(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          }

          showConfirmation('Success', 'Image uploaded successfully!', 'success');
        } catch (error) {
          showConfirmation('Upload Failed', 'Failed to upload image. Please try again.', 'error');

          // Remove from uploading state
          if (type === 'certificate') {
            setUploadingCertificates(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          } else {
            setUploadingImages(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          }
        }
      }
    };

    input.click();
  };

  const removeCertificateImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certificateImages: prev.certificateImages.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async () => {
    // Basic validation
    if (!formData.name || !formData.categoryId || !formData.price) {
      showConfirmation('Missing Information', 'Please fill in all required fields (Name, Category, Price)', 'warning');
      return;
    }

    // Validate image
    if (!formData.image) {
      showConfirmation('Missing Image', 'Please add at least one product image', 'warning');
      return;
    }

    // Additional validation for fish products
    if (isFishProduct) {
      if (!formData.scientificName || !formData.fishSize ||
          !formData.fishTemperature || !formData.fishAge || !formData.phLevel ||
          !formData.origin || !formData.diet) {
        showConfirmation('Incomplete Fish Data', 'Please fill in all required fish details', 'warning');
        return;
      }
    }

    // Additional validation for tank products
    if (isTankProduct) {
      if (!formData.tankType || !formData.material || !formData.capacity ||
          !formData.length || !formData.width || !formData.height ||
          !formData.thickness) {
        showConfirmation('Incomplete Tank Data', 'Please fill in all required tank specifications', 'warning');
        return;
      }
    }

    setFormLoading(true);

    try {
      // Find the selected category ID
      const selectedCategory = categories.find(cat => cat.name === formData.category);
      const categoryId = selectedCategory ? selectedCategory._id : (formData.categoryId as any);

      // Create certificate string from images - store URLs separated by commas
      const certificateString = formData.certificateImages.length > 0
        ? formData.certificateImages.join(',')
        : 'No certificate provided';

      // Use SKU as string
      const skuString = formData.sku || `SKU-${Math.floor(Math.random() * 1000000)}`;

      const baseProductData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        categoryId: categoryId as any,
        certificate: certificateString,
        image: formData.image,
        images: formData.images.length > 0 ? formData.images : [formData.image],
        stock: parseInt(formData.stock) || 0,
        badge: formData.badge.trim() || undefined,
        productStatus: formData.status,
        sku: skuString,
        tankNumber: formData.tankNumber.trim() || undefined,
        lifespan: formData.lifespan || undefined,
        isActive: formData.status === 'active',
      };

      let savedProductId: any;

      if (isEditing && productId) {
        // Prepare fish data for update
        let fishDataForUpdate = undefined;
        if (isFishProduct) {
          fishDataForUpdate = {
            scientificName: formData.scientificName.trim(),
            size: parseFloat(formData.fishSize),
            temperature: parseFloat(formData.fishTemperature),
            age: parseFloat(formData.fishAge),
            phLevel: formData.phLevel.trim(),
            lifespan: formData.fishLifespan.trim() || formData.lifespan || '2-4 years',
            origin: formData.origin.trim(),
            diet: formData.diet
          };
        }

        // Prepare tank data for update
        let tankDataForUpdate = undefined;
        if (isTankProduct) {
          tankDataForUpdate = {
            tankType: formData.tankType,
            material: formData.material,
            capacity: parseFloat(formData.capacity),
            dimensions: {
              length: parseFloat(formData.length),
              width: parseFloat(formData.width),
              height: parseFloat(formData.height),
            },
            thickness: parseFloat(formData.thickness),
            lighting: parseFloat(formData.lighting) || 0,
            filtation: parseFloat(formData.filtration) || 0,
          };
        }

        await updateProduct({
          productId: productId as any,
          ...baseProductData,
          fishData: fishDataForUpdate,
          tankData: tankDataForUpdate,
        });
        savedProductId = productId;
      } else {
        savedProductId = await createProduct(baseProductData);

        // Handle fish-specific data for new products
        if (isFishProduct && savedProductId) {
          const fishData = {
            productId: savedProductId as any,
            scientificName: formData.scientificName.trim(),
            size: parseFloat(formData.fishSize),
            temperature: parseFloat(formData.fishTemperature),
            age: parseFloat(formData.fishAge),
            phLevel: formData.phLevel.trim(),
            lifespan: formData.fishLifespan.trim() || formData.lifespan || '2-4 years',
            origin: formData.origin.trim(),
            diet: formData.diet
          };

          await createFishData(fishData);
        }

        // Handle tank-specific data for new products
        if (isTankProduct && savedProductId) {
          const tankData = {
            productId: savedProductId as any,
            tankType: formData.tankType,
            material: formData.material,
            capacity: parseFloat(formData.capacity),
            dimensions: {
              length: parseFloat(formData.length),
              width: parseFloat(formData.width),
              height: parseFloat(formData.height),
            },
            thickness: parseFloat(formData.thickness),
            lighting: parseFloat(formData.lighting) || 0,
            filtation: parseFloat(formData.filtration) || 0,
          };

          await createTankData(tankData);
        }
      }

      showConfirmation('Success', `Product ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showConfirmation('Error', `Failed to ${isEditing ? 'update' : 'create'} product. Please try again.`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const renderFormField = (label: string, required = false) => (
    <div className="mb-1">
      <label className="block text-sm font-medium text-white mb-2">
        {label} {required && <span className="text-primary">*</span>}
      </label>
    </div>
  );

  const renderDropdownPicker = (
    label: string,
    value: string,
    options: string[],
    showPicker: boolean,
    setShowPicker: (show: boolean) => void,
    onSelect: (value: string) => void,
    required = false
  ) => (
    <div className="mb-4">
      {renderFormField(label, required)}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="w-full flex items-center justify-between p-4 rounded-lg bg-secondary border border-primary/10 hover:border-primary/20 transition-colors"
      >
        <span className={`text-sm ${value ? 'text-white' : 'text-muted'}`}>
          {value || `Select ${label}`}
        </span>
        <ChevronDown className="w-4 h-4 text-muted" />
      </button>

      {showPicker && (
        <div className="mt-2 rounded-lg bg-secondary border border-primary/10 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onSelect(option);
                setShowPicker(false);
              }}
              className="w-full p-3 text-left text-white hover:bg-primary/20 transition-colors border-b border-primary/10 last:border-b-0"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isEditing && !existingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isDrawer ? '' : 'min-h-screen bg-background'}>
      {/* Header with Safe Area - hidden in drawer mode */}
      {!isDrawer && (
      <div className="mt-2 flex items-center justify-between px-6 py-4 border-b border-white/10 safe-area-top">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">
          {isEditing ? 'Edit Product' : 'Add Product'}
        </h1>
        <button
          onClick={handleSaveProduct}
          disabled={formLoading}
          className="px-4 py-2 rounded-lg flex items-center space-x-2 bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">
            {formLoading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update' : 'Save')}
          </span>
        </button>
      </div>
      )}

      {/* Save button for drawer mode */}
      {isDrawer && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-background">
          <h3 className="text-sm font-bold text-white">{isEditing ? 'Edit Product' : 'New Product'}</h3>
          <button
            onClick={handleSaveProduct}
            disabled={formLoading}
            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">{formLoading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      )}

      <div className={`flex-1 ${isDrawer ? 'px-4 py-4' : 'px-4 sm:px-6 py-6'} overflow-y-auto max-w-5xl mx-auto`}>
        {/* Desktop: two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Basic Information */}
        <div>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Basic Information</h2>

          {/* Product Name */}
          {renderFormField('Product Name', true)}
          <input
            className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
            placeholder="Enter product name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />

          {/* Description */}
          {renderFormField('Description')}
          <textarea
            className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
            placeholder="Product description..."
            rows={4}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />

          {/* Category */}
          {isEditing ? (
            <div className="mb-4">
              {renderFormField('Category', true)}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-primary/10">
                <span className="text-white/70">
                  {formData.category || 'No category selected'}
                </span>
              </div>
            </div>
          ) : (
            renderDropdownPicker(
              'Category',
              formData.category,
              categories.map(cat => cat.name),
              showCategoryPicker,
              setShowCategoryPicker,
              (value) => {
                const selectedCategory = categories.find(cat => cat.name === value);
                handleInputChange('category', value);
                if (selectedCategory) {
                  handleInputChange('categoryId', selectedCategory._id);
                }
              },
              true
            )
          )}

          {/* Price */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              {renderFormField('Price (₱)', true)}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                placeholder="0.00"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>
            <div className="flex-1">
              {renderFormField('Cost Price (₱)')}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                placeholder="0.00"
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', e.target.value)}
              />
            </div>
          </div>

          {/* Original Price (for discount display) */}
          <div className="mb-4">
            {renderFormField('Original Price / Before Discount (₱)')}
            <input
              className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
              placeholder="Leave blank if no discount"
              type="number"
              value={formData.originalPrice}
              onChange={(e) => handleInputChange('originalPrice', e.target.value)}
            />
          </div>

          {/* Stock and SKU */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              {renderFormField('Stock Quantity', true)}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                placeholder="0"
                type="number"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', e.target.value)}
              />
            </div>
            <div className="flex-1">
              {renderFormField('SKU')}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                placeholder="Auto-generated"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
              />
            </div>
          </div>

          {/* Tank Number - only for fish products */}
          {isFishProduct && (
            <>
              {renderFormField('Tank Number')}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
                placeholder="e.g., TANK-001, A-12, etc."
                value={formData.tankNumber}
                onChange={(e) => handleInputChange('tankNumber', e.target.value)}
              />
            </>
          )}

          {/* Badge */}
          {renderFormField('Badge (e.g., "New", "Sale", "Limited")')}
          <input
            className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
            placeholder="Optional badge text"
            value={formData.badge}
            onChange={(e) => handleInputChange('badge', e.target.value)}
          />

          {/* General Lifespan (for non-fish and non-tank products) */}
          {!isFishProduct && !isTankProduct && (
            <>
              {renderFormField('Product Lifespan')}
              <input
                className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
                placeholder="Expected lifespan (e.g., 2-4 years)"
                value={formData.lifespan}
                onChange={(e) => handleInputChange('lifespan', e.target.value)}
              />
            </>
          )}
        </div>
        </div>

        {/* Right Column: Images & Certificates */}
        <div>
        {/* Product Images */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Product Images</h2>

          <button
            onClick={() => handleImagePicker('product')}
            className="w-full border-2 border-dashed border-primary/30 rounded-lg p-8 flex flex-col items-center justify-center mb-4 hover:border-primary/50 transition-colors"
            disabled={uploadingImages.length > 0}
          >
            <Camera className={`w-8 h-8 mb-2 ${uploadingImages.length > 0 ? 'text-muted' : 'text-primary'}`} />
            <span className={`text-sm ${uploadingImages.length > 0 ? 'text-muted' : 'text-primary'}`}>
              {uploadingImages.length > 0 ? 'Uploading...' : 'Add Product Image'}
            </span>
          </button>

          {/* Uploading Images */}
          {uploadingImages.map((uploadingImg, index) => (
            <div key={`uploading-${index}`} className="mb-4 relative">
              <img
                src={uploadingImg.uri}
                alt="Uploading"
                className="w-full h-48 rounded-lg object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-primary font-medium">Uploading...</span>
              </div>
            </div>
          ))}

          {/* Uploaded Images */}
          {formData.images.map((imageUrl, index) => (
            <div key={`uploaded-${index}`} className="mb-4 relative">
              <img
                src={imageUrl}
                alt={`Product ${index + 1}`}
                className="w-full h-48 rounded-lg object-cover"
              />
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== index),
                    image: prev.images.length === 1 ? '' : (index === 0 ? prev.images[1] : prev.image)
                  }));
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Certificate Images */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Certificates & Documents</h2>

          <button
            onClick={() => handleImagePicker('certificate')}
            className="w-full border-2 border-dashed border-info/30 rounded-lg p-6 flex flex-col items-center justify-center mb-4 hover:border-info/50 transition-colors"
            disabled={uploadingCertificates.length > 0}
          >
            <FileText className={`w-7 h-7 mb-2 ${uploadingCertificates.length > 0 ? 'text-muted' : 'text-info'}`} />
            <span className={`text-sm ${uploadingCertificates.length > 0 ? 'text-muted' : 'text-info'}`}>
              {uploadingCertificates.length > 0 ? 'Uploading...' : 'Add Certificate'}
            </span>
          </button>

          {/* Uploading and Uploaded Certificates */}
          {(uploadingCertificates.length > 0 || formData.certificateImages.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {/* Uploading Certificates */}
              {uploadingCertificates.map((uploadingCert, index) => (
                <div key={`uploading-cert-${index}`} className="relative w-24 h-24 rounded-lg">
                  <img src={uploadingCert.uri} alt="Uploading cert" className="w-full h-full rounded-lg object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-primary font-medium">Uploading...</span>
                  </div>
                </div>
              ))}

              {/* Uploaded Certificates */}
              {formData.certificateImages.map((certImage: string, index: number) => (
                <div key={`cert-${index}`} className="relative w-24 h-24 rounded-lg">
                  <img src={certImage} alt={`Certificate ${index + 1}`} className="w-full h-full rounded-lg object-cover" />
                  <button
                    onClick={() => removeCertificateImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
        {/* End of two-column grid */}

        {/* Fish-specific fields */}
        {isFishProduct && (
          <div className="mb-6 bg-secondary/20 border border-primary/10 rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Fish Specifications</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Scientific Name - full width */}
              <div className="sm:col-span-2">
                {renderFormField('Scientific Name', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="e.g., Pterophyllum scalare"
                  value={formData.scientificName}
                  onChange={(e) => handleInputChange('scientificName', e.target.value)}
                />
              </div>

              {/* Size */}
              <div>
                {renderFormField('Size (inches)', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="4"
                  type="number"
                  step="0.1"
                  value={formData.fishSize}
                  onChange={(e) => handleInputChange('fishSize', e.target.value)}
                />
              </div>

              {/* Temperature */}
              <div>
                {renderFormField('Temperature (°C)', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="26"
                  type="number"
                  value={formData.fishTemperature}
                  onChange={(e) => handleInputChange('fishTemperature', e.target.value)}
                />
              </div>

              {/* Age */}
              <div>
                {renderFormField('Age (years)', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="1"
                  type="number"
                  value={formData.fishAge}
                  onChange={(e) => handleInputChange('fishAge', e.target.value)}
                />
              </div>

              {/* pH Level */}
              <div>
                {renderFormField('pH Level', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="e.g., 6.5-7.5"
                  value={formData.phLevel}
                  onChange={(e) => handleInputChange('phLevel', e.target.value)}
                />
              </div>

              {/* Fish Lifespan */}
              <div>
                {renderFormField('Lifespan', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="e.g., 2-4 years"
                  value={formData.fishLifespan}
                  onChange={(e) => handleInputChange('fishLifespan', e.target.value)}
                />
              </div>

              {/* Origin */}
              <div>
                {renderFormField('Origin', true)}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="e.g., Amazon Basin, South America"
                  value={formData.origin}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                />
              </div>

              {/* Diet */}
              <div className="sm:col-span-2">
                {renderDropdownPicker(
                  'Diet',
                  formData.diet,
                  dietOptions,
                  showDietPicker,
                  setShowDietPicker,
                  (value) => handleInputChange('diet', value),
                  true
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tank-specific fields */}
        {isTankProduct && (
          <div className="mb-6 bg-secondary/20 border border-info/10 rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-info mb-4">Tank Specifications</h2>

            {/* Tank Type */}
            {renderDropdownPicker(
              'Tank Type',
              formData.tankType,
              tankTypes,
              showTankTypePicker,
              setShowTankTypePicker,
              (value) => handleInputChange('tankType', value),
              true
            )}

            {/* Material */}
            {renderDropdownPicker(
              'Material',
              formData.material,
              materials,
              showMaterialPicker,
              setShowMaterialPicker,
              (value) => handleInputChange('material', value),
              true
            )}

            {/* Capacity */}
            {renderFormField('Capacity (Liters)', true)}
            <input
              className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
              placeholder="50"
              type="number"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
            />

            {/* Dimensions */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-white mb-2">
                Dimensions (inches) <span className="text-primary">*</span>
              </label>
            </div>
            <div className="flex space-x-3 mb-4">
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="Length"
                  type="number"
                  step="0.1"
                  value={formData.length}
                  onChange={(e) => handleInputChange('length', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="Width"
                  type="number"
                  step="0.1"
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="Height"
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
            </div>

            {/* Glass Thickness */}
            {renderFormField('Glass Thickness (mm)', true)}
            <input
              className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
              placeholder="6"
              type="number"
              value={formData.thickness}
              onChange={(e) => handleInputChange('thickness', e.target.value)}
            />

            {/* Lighting and Filtration */}
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                {renderFormField('Lighting (Watts)')}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="0"
                  type="number"
                  value={formData.lighting}
                  onChange={(e) => handleInputChange('lighting', e.target.value)}
                />
              </div>
              <div className="flex-1">
                {renderFormField('Filtration (L/hr)')}
                <input
                  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted"
                  placeholder="0"
                  type="number"
                  value={formData.filtration}
                  onChange={(e) => handleInputChange('filtration', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacing for safe area */}
        <div className="h-20" />
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />
    </div>
  );
}

function ProductFormContent() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProductFormContentInner />
    </SafeAreaProvider>
  );
}

export default function ProductFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted">Loading product form...</p>
          </div>
        </div>
      </div>
    }>
      <ProductFormContent />
    </Suspense>
  );
}