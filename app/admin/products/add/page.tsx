'use client';

import { useMutation, useQuery } from 'convex/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  FileText,
  Save,
  X,
  Plus,
  Upload
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface ProductFormData {
  // Base product fields
  name: string;
  description: string;
  price: string;
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

const tankTypes = ['Standard', 'Bowfront', 'Corner', 'Cube', 'Hexagon', 'Rimless', 'All-in-One', 'Nano'];
const materials = ['Glass', 'Acrylic', 'Tempered Glass', 'Low-Iron Glass', 'Plastic'];
const dietOptions = ['Carnivore', 'Herbivore', 'Omnivore', 'Piscivore', 'Planktivore', 'Detritivore'];

export default function AddProductPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>({
    // Base product fields
    name: '',
    description: '',
    price: '',
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
  });

  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [uploadingCertificates, setUploadingCertificates] = useState<UploadingImage[]>([]);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTankTypePicker, setShowTankTypePicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showDietPicker, setShowDietPicker] = useState(false);

  const isFishProduct = formData.category.toLowerCase().includes('fish');
  const isTankProduct = formData.category.toLowerCase().includes('tank') || formData.category.toLowerCase().includes('aquarium');

  // Convex queries and mutations
  const categories = useQuery(api.services.categories.getCategories, {}) || [];
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const createProduct = useMutation(api.services.admin.createProduct);
  const createFishData = useMutation(api.services.admin.createFishData);
  const createTankData = useMutation(api.services.admin.createTankData);

  const [formLoading, setFormLoading] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadImageToConvex = async (uri: string): Promise<string> => {
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Convert URI to blob (for web, this will be a File object)
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Convex
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
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

  const handleImagePicker = async (type: 'product' | 'certificate' = 'product') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const processImage = async (file: File) => {
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
          const uploadedUrl = await uploadImageToConvex(URL.createObjectURL(file));

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

          // Image uploaded successfully - no alert needed
        } catch (error) {
          alert('Upload Error: Failed to upload image. Please try again.');

          // Remove from uploading state
          if (type === 'certificate') {
            setUploadingCertificates(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          } else {
            setUploadingImages(prev => prev.filter(img => img.uri !== uploadingImage.uri));
          }
        }
      };

      await processImage(file);
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
      alert('Error: Please fill in all required fields (Name, Category, Price)');
      return;
    }

    // Validate image
    if (!formData.image) {
      alert('Error: Please add at least one product image');
      return;
    }

    // Additional validation for fish products
    if (isFishProduct) {
      if (!formData.scientificName || !formData.fishSize ||
          !formData.fishTemperature || !formData.fishAge || !formData.phLevel ||
          !formData.origin || !formData.diet) {
        alert('Error: Please fill in all required fish details');
        return;
      }
    }

    // Additional validation for tank products
    if (isTankProduct) {
      if (!formData.tankType || !formData.material || !formData.capacity ||
          !formData.length || !formData.width || !formData.height ||
          !formData.thickness) {
        alert('Error: Please fill in all required tank specifications');
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
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        categoryId: categoryId as any,
        certificate: certificateString,
        image: formData.image,
        images: formData.images.length > 0 ? formData.images : [formData.image],
        stock: parseInt(formData.stock) || 0,
        badge: formData.badge.trim() || undefined,
        productStatus: formData.status,
        sku: skuString,
        lifespan: formData.lifespan || undefined,
        isActive: formData.status === 'active',
      };

      let productId: any;

      productId = await createProduct(baseProductData);

      // Handle fish-specific data for new products
      if (isFishProduct && productId) {
        const fishData = {
          productId: productId as any,
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
      if (isTankProduct && productId) {
        const tankData = {
          productId: productId as any,
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

      alert('Success: Product created successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error: Failed to create product. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const renderFormField = (label: string, required = false) => (
    <div className="mb-1">
      <p className="font-euclid-medium text-sm mb-2" style={{ color: '#FFFFFF' }}>
        {label} {required && <span style={{ color: '#FF6B00' }}>*</span>}
      </p>
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
        className="w-full flex items-center justify-between p-4 rounded-xl"
        style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
      >
        <p className="font-euclid-medium text-base" style={{ color: value ? '#FFFFFF' : '#666666' }}>
          {value || `Select ${label}`}
        </p>
        <ChevronDown size={20} color="#666666" />
      </button>

      {showPicker && (
        <div className="mt-2 rounded-xl" style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onSelect(option);
                setShowPicker(false);
              }}
              className="w-full p-4 border-b border-gray-700 last:border-b-0 text-left"
            >
              <p className="font-euclid-medium text-base" style={{ color: '#FFFFFF' }}>
                {option}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-white/10 shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ backgroundColor: '#FFFFFF08' }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </button>
          <h1 className="font-euclid-bold text-lg sm:text-xl text-white flex-1 text-center pr-16">
            Add Product
          </h1>
          <button
            onClick={handleSaveProduct}
            disabled={formLoading}
            className="px-3 sm:px-4 py-2 rounded-lg flex items-center hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
            style={{
              backgroundColor: formLoading ? '#FF6B0060' : '#FF6B00',
              opacity: formLoading ? 0.7 : 1
            }}
          >
            <Save size={16} color="#FFFFFF" />
            <span className="font-euclid-bold text-sm ml-2 text-white hidden sm:inline">
              {formLoading ? 'Saving...' : 'Save'}
            </span>
            <span className="font-euclid-bold text-xs ml-1 text-white sm:hidden">
              {formLoading ? '...' : 'Save'}
            </span>
          </button>
        </div>
      </div>

      {/* ScrollView */}
      <div className="px-4 sm:px-6 pb-6" style={{ maxHeight: 'calc(100vh - 72px)', overflowY: 'auto' }}>

        {/* Basic Information */}
        <div className="mb-6">
          <p className="font-euclid-bold text-lg mb-4" style={{ color: '#FFFFFF' }}>
            Basic Information
          </p>

          {/* Product Name */}
          {renderFormField('Product Name', true)}
          <input
            className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
            style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
            placeholder="Enter product name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />

          {/* Description */}
          {renderFormField('Description')}
          <textarea
            className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4 resize-none"
            style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
            placeholder="Product description..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
          />

          {/* Category */}
          {categories.length > 0 && renderDropdownPicker(
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
          )}

          {/* Price */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              {renderFormField('Price (₱)', true)}
              <input
                className="w-full p-4 rounded-xl text-white font-euclid-regular"
                style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
              />
            </div>
            <div className="flex-1">
              {renderFormField('Original Price (₱)')}
              <input
                className="w-full p-4 rounded-xl text-white font-euclid-regular"
                style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                placeholder="0.00"
                value={formData.originalPrice}
                onChange={(e) => handleInputChange('originalPrice', e.target.value)}
              />
            </div>
          </div>

          {/* Stock and SKU */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              {renderFormField('Stock Quantity', true)}
              <input
                className="w-full p-4 rounded-xl text-white font-euclid-regular"
                style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                placeholder="0"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', e.target.value)}
              />
            </div>
            <div className="flex-1">
              {renderFormField('SKU')}
              <input
                className="w-full p-4 rounded-xl text-white font-euclid-regular"
                style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                placeholder="Auto-generated"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
              />
            </div>
          </div>

          {/* Badge */}
          {renderFormField('Badge (e.g., "New", "Sale", "Limited")')}
          <input
            className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
            style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
            placeholder="Optional badge text"
            value={formData.badge}
            onChange={(e) => handleInputChange('badge', e.target.value)}
          />

          {/* General Lifespan (for non-fish and non-tank products) */}
          {!isFishProduct && !isTankProduct && (
            <>
              {renderFormField('Product Lifespan')}
              <input
                className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
                style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                placeholder="Expected lifespan (e.g., 2-4 years)"
                value={formData.lifespan}
                onChange={(e) => handleInputChange('lifespan', e.target.value)}
              />
            </>
          )}
        </div>

        {/* Product Images */}
        <div className="mb-6">
          <p className="font-euclid-bold text-lg mb-4" style={{ color: '#FFFFFF' }}>
            Product Images
          </p>

          <button
            onClick={() => handleImagePicker('product')}
            className="border-2 border-dashed rounded-xl p-8 items-center justify-center mb-4"
            style={{ borderColor: '#333333' }}
            disabled={uploadingImages.length > 0}
          >
            <Camera size={32} color={uploadingImages.length > 0 ? '#999999' : '#666666'} />
            <p className="font-euclid-medium text-base mt-2" style={{ color: uploadingImages.length > 0 ? '#999999' : '#666666' }}>
              {uploadingImages.length > 0 ? 'Uploading...' : 'Add Product Image'}
            </p>
          </button>

          {/* Uploading Images */}
          {uploadingImages.map((uploadingImg, index) => (
            <div key={`uploading-${index}`} className="mb-4 relative">
              <img
                src={uploadingImg.uri}
                className="w-full h-48 rounded-xl opacity-50"
                style={{ objectFit: 'cover' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-euclid-medium text-base" style={{ color: '#FF6B00' }}>
                  Uploading...
                </p>
              </div>
            </div>
          ))}

          {/* Uploaded Images */}
          {formData.images.map((imageUrl, index) => (
            <div key={`uploaded-${index}`} className="mb-4 relative">
              <img
                src={imageUrl}
                className="w-full h-48 rounded-xl"
                style={{ objectFit: 'cover' }}
              />
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== index),
                    image: prev.images.length === 1 ? '' : (index === 0 ? prev.images[1] : prev.image)
                  }));
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FF4444' }}
              >
                <X size={16} color="#FFFFFF" />
              </button>
            </div>
          ))}
        </div>

        {/* Certificate Images */}
        <div className="mb-6">
          <p className="font-euclid-bold text-lg mb-4" style={{ color: '#FFFFFF' }}>
            Certificates & Documents
          </p>

          <button
            onClick={() => handleImagePicker('certificate')}
            className="border-2 border-dashed rounded-xl p-6 items-center justify-center mb-4"
            style={{ borderColor: '#4A90E2' }}
            disabled={uploadingCertificates.length > 0}
          >
            <FileText size={28} color={uploadingCertificates.length > 0 ? '#999999' : '#4A90E2'} />
            <p className="font-euclid-medium text-base mt-2" style={{ color: uploadingCertificates.length > 0 ? '#999999' : '#4A90E2' }}>
              {uploadingCertificates.length > 0 ? 'Uploading...' : 'Add Certificate'}
            </p>
          </button>

          {/* Uploading and Uploaded Certificates */}
          {(uploadingCertificates.length > 0 || formData.certificateImages.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {/* Uploading Certificates */}
              {uploadingCertificates.map((uploadingCert, index) => (
                <div key={`uploading-cert-${index}`} className="relative w-24 h-24 rounded-xl">
                  <img src={uploadingCert.uri} className="w-full h-full rounded-xl opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-euclid-medium text-xs" style={{ color: '#FF6B00' }}>
                      Uploading...
                    </p>
                  </div>
                </div>
              ))}

              {/* Uploaded Certificates */}
              {formData.certificateImages.map((certImage: string, index: number) => (
                <div key={`cert-${index}`} className="relative w-24 h-24 rounded-xl">
                  <img src={certImage} className="w-full h-full rounded-xl" />
                  <button
                    onClick={() => removeCertificateImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#FF4444' }}
                  >
                    <X size={14} color="#FFFFFF" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fish-specific fields */}
        {isFishProduct && (
          <div className="mb-6">
            <p className="font-euclid-bold text-lg mb-4" style={{ color: '#FF6B00' }}>
              Fish Specifications
            </p>

            {/* Scientific Name */}
            {renderFormField('Scientific Name', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="e.g., Pterophyllum scalare"
              value={formData.scientificName}
              onChange={(e) => handleInputChange('scientificName', e.target.value)}
            />

            {/* Size */}
            {renderFormField('Size (cm)', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="10"
              value={formData.fishSize}
              onChange={(e) => handleInputChange('fishSize', e.target.value)}
            />

            {/* Temperature and Age */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                {renderFormField('Temperature (°C)', true)}
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="26"
                  value={formData.fishTemperature}
                  onChange={(e) => handleInputChange('fishTemperature', e.target.value)}
                />
              </div>
              <div className="flex-1">
                {renderFormField('Age (years)', true)}
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="1"
                  value={formData.fishAge}
                  onChange={(e) => handleInputChange('fishAge', e.target.value)}
                />
              </div>
            </div>

            {/* pH Level */}
            {renderFormField('pH Level', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="e.g., 6.5-7.5"
              value={formData.phLevel}
              onChange={(e) => handleInputChange('phLevel', e.target.value)}
            />

            {/* Fish Lifespan */}
            {renderFormField('Lifespan', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="e.g., 2-4 years"
              value={formData.fishLifespan}
              onChange={(e) => handleInputChange('fishLifespan', e.target.value)}
            />

            {/* Origin */}
            {renderFormField('Origin', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="e.g., Amazon Basin, South America"
              value={formData.origin}
              onChange={(e) => handleInputChange('origin', e.target.value)}
            />

            {/* Diet */}
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
        )}

        {/* Tank-specific fields */}
        {isTankProduct && (
          <div className="mb-6">
            <p className="font-euclid-bold text-lg mb-4" style={{ color: '#4A90E2' }}>
              Tank Specifications
            </p>

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
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="50"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
            />

            {/* Dimensions */}
            <p className="font-euclid-medium text-sm mb-2" style={{ color: '#FFFFFF' }}>
              Dimensions (cm) <span style={{ color: '#FF6B00' }}>*</span>
            </p>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="Length"
                  value={formData.length}
                  onChange={(e) => handleInputChange('length', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="Width"
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="Height"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
            </div>

            {/* Glass Thickness */}
            {renderFormField('Glass Thickness (mm)', true)}
            <input
              className="w-full p-4 rounded-xl text-white font-euclid-regular mb-4"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
              placeholder="6"
              value={formData.thickness}
              onChange={(e) => handleInputChange('thickness', e.target.value)}
            />

            {/* Lighting and Filtration */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                {renderFormField('Lighting (Watts)')}
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="0"
                  value={formData.lighting}
                  onChange={(e) => handleInputChange('lighting', e.target.value)}
                />
              </div>
              <div className="flex-1">
                {renderFormField('Filtration (L/hr)')}
                <input
                  className="w-full p-4 rounded-xl text-white font-euclid-regular"
                  style={{ backgroundColor: '#1A1A1A', borderColor: '#333333', borderWidth: 1 }}
                  placeholder="0"
                  value={formData.filtration}
                  onChange={(e) => handleInputChange('filtration', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacing */}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}