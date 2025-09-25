"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChevronLeft,
  Save,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  Package,
  Fish,
  Box,
  Camera,
  Loader,
} from "lucide-react";
import ControlPanelNav from "@/components/ControlPanelNav";
import Button from "@/components/ui/Button";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  categoryId: string;
  image: string;
  images: string[];
  certificateImages: string[];
  stock: number;
  badge: string;
  isActive: boolean;
  certificate: string;
  sku: string;
  productStatus: string;
  lifespan: string;
  // Fish specific
  scientificName: string;
  fishSize: number;
  fishAge: number;
  temperature: number;
  phLevel: string;
  fishLifespan: string;
  origin: string;
  diet: string;
  // Tank specific
  tankType: string;
  material: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  thickness: number;
  lighting: number;
  filtration: number;
}

interface UploadingImage {
  uri: string;
  uploading: boolean;
  storageId?: Id<"_storage">;
  url?: string;
}

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  originalPrice: 0,
  categoryId: "",
  image: "",
  images: [],
  certificateImages: [],
  stock: 0,
  badge: "",
  isActive: true,
  certificate: "",
  sku: "",
  productStatus: "active",
  lifespan: "",
  // Fish specific
  scientificName: "",
  fishSize: 0,
  fishAge: 0,
  temperature: 0,
  phLevel: "",
  fishLifespan: "",
  origin: "",
  diet: "",
  // Tank specific
  tankType: "",
  material: "",
  capacity: 0,
  dimensions: { length: 0, width: 0, height: 0 },
  thickness: 0,
  lighting: 0,
  filtration: 0,
};

function ProductFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const isEditing = !!productId;

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "fish" | "tank">("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [uploadingCertificates, setUploadingCertificates] = useState<UploadingImage[]>([]);

  // Convex queries and mutations
  const categoriesQuery = useQuery(api.services.categories.getCategories, {});
  const existingProduct = useQuery(
    api.services.products.getProduct,
    isEditing && productId ? { productId: productId as Id<"products"> } : "skip"
  );
  const existingFishData = useQuery(
    api.services.products.getFishByProductId,
    isEditing && productId ? { productId: productId as Id<"products"> } : "skip"
  );
  const existingTankData = useQuery(
    api.services.products.getTankByProductId,
    isEditing && productId ? { productId: productId as Id<"products"> } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const createProduct = useMutation(api.services.admin.createProduct);
  const updateProduct = useMutation(api.services.products.updateProduct);
  const createFishData = useMutation(api.services.admin.createFishData);
  const createTankData = useMutation(api.services.admin.createTankData);

  // Determine product type based on category
  const productType = useMemo(() => {
    if (!formData.categoryId) return "general";
    const category = categoriesQuery?.find(cat => cat._id === formData.categoryId);
    if (!category) return "general";

    const categoryName = category.name.toLowerCase();
    if (categoryName.includes("fish") || categoryName.includes("tropical") || categoryName.includes("marine")) {
      return "fish";
    } else if (categoryName.includes("tank") || categoryName.includes("aquarium")) {
      return "tank";
    }
    return "general";
  }, [formData.categoryId, categoriesQuery]);

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
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
        name: existingProduct.name || "",
        description: existingProduct.description || "",
        price: existingProduct.price || 0,
        originalPrice: existingProduct.originalPrice || existingProduct.price || 0,
        categoryId: existingProduct.categoryId || "",
        image: existingProduct.image || "",
        images: existingProduct.images || [existingProduct.image],
        certificateImages: certificateImages,
        stock: existingProduct.stock || 0,
        badge: existingProduct.badge || "",
        isActive: existingProduct.isActive ?? true,
        certificate: existingProduct.certificate || "",
        sku: (existingProduct.sku || "").toString(),
        productStatus: existingProduct.productStatus || "active",
        lifespan: existingProduct.lifespan || "",
      }));
    }

    if (existingFishData) {
      setFormData(prev => ({
        ...prev,
        scientificName: existingFishData.scientificName || "",
        fishSize: existingFishData.size || 0,
        fishAge: existingFishData.age || 0,
        temperature: existingFishData.temperature || 0,
        phLevel: existingFishData.phLevel || "",
        fishLifespan: existingFishData.lifespan || "",
        origin: existingFishData.origin || "",
        diet: existingFishData.diet || "",
      }));
    }

    if (existingTankData) {
      setFormData(prev => ({
        ...prev,
        tankType: existingTankData.tankType || "",
        material: existingTankData.material || "",
        capacity: existingTankData.capacity || 0,
        dimensions: existingTankData.dimensions || { length: 0, width: 0, height: 0 },
        thickness: existingTankData.thickness || 0,
        lighting: existingTankData.lighting || 0,
        filtration: existingTankData.filtation || 0,
      }));
    }
  }, [existingProduct, existingFishData, existingTankData]);

  // Image upload functionality
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
        } catch (error) {
          console.error('Upload failed:', error);
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

  const removeProductImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      image: prev.images.length === 1 ? '' : (index === 0 ? prev.images[1] : prev.image)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }
    if (formData.price <= 0) {
      newErrors.price = "Price must be greater than 0";
    }
    if (formData.stock < 0) {
      newErrors.stock = "Stock cannot be negative";
    }
    if (!formData.image.trim()) {
      newErrors.image = "Product image is required";
    }

    // Fish-specific validation
    if (productType === "fish") {
      if (!formData.scientificName.trim()) {
        newErrors.scientificName = "Scientific name is required for fish";
      }
      if (formData.fishSize <= 0) {
        newErrors.fishSize = "Fish size must be greater than 0";
      }
      if (formData.temperature <= 0) {
        newErrors.temperature = "Temperature must be greater than 0";
      }
      if (formData.fishAge <= 0) {
        newErrors.fishAge = "Fish age must be greater than 0";
      }
    }

    // Tank-specific validation
    if (productType === "tank") {
      if (!formData.tankType.trim()) {
        newErrors.tankType = "Tank type is required";
      }
      if (formData.capacity <= 0) {
        newErrors.capacity = "Capacity must be greater than 0";
      }
      if (formData.thickness <= 0) {
        newErrors.thickness = "Thickness must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create certificate string from images - store URLs separated by commas
      const certificateString = formData.certificateImages.length > 0
        ? formData.certificateImages.join(',')
        : 'No certificate provided';

      // Use SKU as string
      const skuString = formData.sku || `SKU-${Math.floor(Math.random() * 1000000)}`;

      const baseProductData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice,
        categoryId: formData.categoryId as Id<"categories">,
        image: formData.image,
        images: formData.images.length > 0 ? formData.images : [formData.image],
        stock: formData.stock,
        badge: formData.badge,
        isActive: formData.isActive,
        certificate: certificateString,
        sku: skuString,
        productStatus: formData.productStatus,
        lifespan: formData.lifespan,
      };

      let savedProductId: Id<"products">;

      if (isEditing && productId) {
        // Prepare fish data for update
        let fishDataForUpdate = undefined;
        if (productType === "fish") {
          fishDataForUpdate = {
            scientificName: formData.scientificName.trim(),
            size: formData.fishSize,
            temperature: formData.temperature,
            age: formData.fishAge,
            phLevel: formData.phLevel.trim(),
            lifespan: formData.fishLifespan.trim() || formData.lifespan || '2-4 years',
            origin: formData.origin.trim(),
            diet: formData.diet
          };
        }

        // Prepare tank data for update
        let tankDataForUpdate = undefined;
        if (productType === "tank") {
          tankDataForUpdate = {
            tankType: formData.tankType,
            material: formData.material,
            capacity: formData.capacity,
            dimensions: formData.dimensions,
            thickness: formData.thickness,
            lighting: formData.lighting,
            filtation: formData.filtration,
          };
        }

        await updateProduct({
          productId: productId as any,
          ...baseProductData,
          fishData: fishDataForUpdate,
          tankData: tankDataForUpdate,
        });
        savedProductId = productId as Id<"products">;
      } else {
        savedProductId = await createProduct(baseProductData);

        // Handle fish-specific data for new products
        if (productType === "fish" && savedProductId) {
          const fishData = {
            productId: savedProductId,
            scientificName: formData.scientificName.trim(),
            size: formData.fishSize,
            temperature: formData.temperature,
            age: formData.fishAge,
            phLevel: formData.phLevel.trim(),
            lifespan: formData.fishLifespan.trim() || formData.lifespan || '2-4 years',
            origin: formData.origin.trim(),
            diet: formData.diet
          };

          await createFishData(fishData);
        }

        // Handle tank-specific data for new products
        if (productType === "tank" && savedProductId) {
          const tankData = {
            productId: savedProductId,
            tankType: formData.tankType,
            material: formData.material,
            capacity: formData.capacity,
            dimensions: formData.dimensions,
            thickness: formData.thickness,
            lighting: formData.lighting,
            filtation: formData.filtration,
          };

          await createTankData(tankData);
        }
      }

      // Redirect back to products page
      router.push("/control_panel/products");
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDimensionChange = (dimension: keyof typeof formData.dimensions, value: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value,
      },
    }));
  };

  if (isEditing && !existingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-primary/10">
        <ControlPanelNav />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-primary/10">
      <ControlPanelNav />

      <div className="ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isEditing ? "Edit Product" : "Add New Product"}
                </h1>
                <p className="text-white/60">
                  {isEditing ? "Update product information" : "Create a new product"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tabs */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="flex space-x-1 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("basic")}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "basic"
                      ? "bg-primary text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Basic Info
                </button>
                {productType === "fish" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("fish")}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "fish"
                        ? "bg-primary text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Fish className="w-4 h-4 inline mr-2" />
                    Fish Details
                  </button>
                )}
                {productType === "tank" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("tank")}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "tank"
                        ? "bg-primary text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Box className="w-4 h-4 inline mr-2" />
                    Tank Details
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* Basic Information Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.name ? "border-error" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="Enter product name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Category *
                        </label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) => handleInputChange("categoryId", e.target.value)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                            errors.categoryId ? "border-error" : "border-white/10 focus:ring-primary"
                          }`}
                          disabled={isEditing}
                        >
                          <option value="">Select a category</option>
                          {categoriesQuery?.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {errors.categoryId && (
                          <p className="mt-1 text-sm text-red-400">{errors.categoryId}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Price *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={formData.price === 0 ? '' : formData.price}
                            onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                            className={`w-full pl-8 pr-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                              errors.price ? "border-error" : "border-white/10 focus:ring-primary"
                            }`}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-400">{errors.price}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Original Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={formData.originalPrice === 0 ? '' : formData.originalPrice}
                            onChange={(e) => handleInputChange("originalPrice", parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Stock *
                        </label>
                        <input
                          type="number"
                          value={formData.stock === 0 ? '' : formData.stock}
                          onChange={(e) => handleInputChange("stock", parseInt(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.stock ? "border-error" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0"
                        />
                        {errors.stock && (
                          <p className="mt-1 text-sm text-red-400">{errors.stock}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          SKU
                        </label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => handleInputChange("sku", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Auto-generated if empty"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter product description"
                      />
                    </div>

                    {/* Product Images Section */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-4">
                        Product Images *
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => handleImagePicker('product')}
                        className="w-full border-2 border-dashed border-primary/30 rounded-lg p-8 flex flex-col items-center justify-center mb-4 hover:border-primary/50 transition-colors"
                        disabled={uploadingImages.length > 0}
                      >
                        <Camera className={`w-8 h-8 mb-2 ${uploadingImages.length > 0 ? 'text-white/40' : 'text-primary'}`} />
                        <span className={`text-sm ${uploadingImages.length > 0 ? 'text-white/40' : 'text-primary'}`}>
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.images.map((imageUrl, index) => (
                          <div key={`uploaded-${index}`} className="relative">
                            <img
                              src={imageUrl}
                              alt={`Product ${index + 1}`}
                              className="w-full h-32 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeProductImage(index)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {errors.image && !formData.image && (
                        <p className="mt-1 text-sm text-red-400">At least one product image is required</p>
                      )}
                    </div>

                    {/* Certificate Images Section */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-4">
                        Certificates & Documents
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => handleImagePicker('certificate')}
                        className="w-full border-2 border-dashed border-blue-400/30 rounded-lg p-6 flex flex-col items-center justify-center mb-4 hover:border-blue-400/50 transition-colors"
                        disabled={uploadingCertificates.length > 0}
                      >
                        <FileText className={`w-7 h-7 mb-2 ${uploadingCertificates.length > 0 ? 'text-white/40' : 'text-blue-400'}`} />
                        <span className={`text-sm ${uploadingCertificates.length > 0 ? 'text-white/40' : 'text-blue-400'}`}>
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
                                type="button"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Status
                        </label>
                        <select
                          value={formData.productStatus}
                          onChange={(e) => handleInputChange("productStatus", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Badge
                        </label>
                        <input
                          type="text"
                          value={formData.badge}
                          onChange={(e) => handleInputChange("badge", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g., New, Best Seller"
                        />
                      </div>
                    </div>

                    {/* General Lifespan (for non-fish and non-tank products) */}
                    {productType === "general" && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Product Lifespan
                        </label>
                        <input
                          type="text"
                          value={formData.lifespan}
                          onChange={(e) => handleInputChange("lifespan", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Expected lifespan (e.g., 2-4 years)"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange("isActive", e.target.checked)}
                        className="w-4 h-4 text-primary bg-secondary/60 border-white/10 rounded focus:ring-primary"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium text-white">
                        Product is active and visible to customers
                      </label>
                    </div>
                  </div>
                )}

                {/* Fish Details Tab */}
                {activeTab === "fish" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Scientific Name *
                        </label>
                        <input
                          type="text"
                          value={formData.scientificName}
                          onChange={(e) => handleInputChange("scientificName", e.target.value)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.scientificName ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="e.g., Carassius auratus"
                        />
                        {errors.scientificName && (
                          <p className="mt-1 text-sm text-red-400">{errors.scientificName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Size (cm) *
                        </label>
                        <input
                          type="number"
                          value={formData.fishSize === 0 ? '' : formData.fishSize}
                          onChange={(e) => handleInputChange("fishSize", parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.fishSize ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0.0"
                          step="0.1"
                        />
                        {errors.fishSize && (
                          <p className="mt-1 text-sm text-red-400">{errors.fishSize}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Temperature (°C) *
                        </label>
                        <input
                          type="number"
                          value={formData.temperature === 0 ? '' : formData.temperature}
                          onChange={(e) => handleInputChange("temperature", parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.temperature ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0.0"
                          step="0.1"
                        />
                        {errors.temperature && (
                          <p className="mt-1 text-sm text-red-400">{errors.temperature}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Age (years) *
                        </label>
                        <input
                          type="number"
                          value={formData.fishAge === 0 ? '' : formData.fishAge}
                          onChange={(e) => handleInputChange("fishAge", parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.fishAge ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0.0"
                          step="0.1"
                        />
                        {errors.fishAge && (
                          <p className="mt-1 text-sm text-red-400">{errors.fishAge}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          pH Level
                        </label>
                        <input
                          type="text"
                          value={formData.phLevel}
                          onChange={(e) => handleInputChange("phLevel", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g., 6.5-7.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Origin
                        </label>
                        <input
                          type="text"
                          value={formData.origin}
                          onChange={(e) => handleInputChange("origin", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g., Southeast Asia"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Diet
                        </label>
                        <select
                          value={formData.diet}
                          onChange={(e) => handleInputChange("diet", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select diet type</option>
                          <option value="Carnivore">Carnivore</option>
                          <option value="Herbivore">Herbivore</option>
                          <option value="Omnivore">Omnivore</option>
                          <option value="Piscivore">Piscivore</option>
                          <option value="Planktivore">Planktivore</option>
                          <option value="Detritivore">Detritivore</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Fish Lifespan
                      </label>
                      <input
                        type="text"
                        value={formData.fishLifespan}
                        onChange={(e) => handleInputChange("fishLifespan", e.target.value)}
                        className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., 5-10 years"
                      />
                    </div>
                  </div>
                )}

                {/* Tank Details Tab */}
                {activeTab === "tank" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Tank Type *
                        </label>
                        <select
                          value={formData.tankType}
                          onChange={(e) => handleInputChange("tankType", e.target.value)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                            errors.tankType ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                        >
                          <option value="">Select tank type</option>
                          <option value="Standard">Standard</option>
                          <option value="Bowfront">Bowfront</option>
                          <option value="Corner">Corner</option>
                          <option value="Cube">Cube</option>
                          <option value="Hexagon">Hexagon</option>
                          <option value="Rimless">Rimless</option>
                          <option value="All-in-One">All-in-One</option>
                          <option value="Nano">Nano</option>
                        </select>
                        {errors.tankType && (
                          <p className="mt-1 text-sm text-red-400">{errors.tankType}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Material *
                        </label>
                        <select
                          value={formData.material}
                          onChange={(e) => handleInputChange("material", e.target.value)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select material</option>
                          <option value="Glass">Glass</option>
                          <option value="Acrylic">Acrylic</option>
                          <option value="Tempered Glass">Tempered Glass</option>
                          <option value="Low-Iron Glass">Low-Iron Glass</option>
                          <option value="Plastic">Plastic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Capacity (Liters) *
                        </label>
                        <input
                          type="number"
                          value={formData.capacity === 0 ? '' : formData.capacity}
                          onChange={(e) => handleInputChange("capacity", parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.capacity ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0"
                        />
                        {errors.capacity && (
                          <p className="mt-1 text-sm text-red-400">{errors.capacity}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Glass Thickness (mm) *
                        </label>
                        <input
                          type="number"
                          value={formData.thickness === 0 ? '' : formData.thickness}
                          onChange={(e) => handleInputChange("thickness", parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                            errors.thickness ? "border-red-400" : "border-white/10 focus:ring-primary"
                          }`}
                          placeholder="0.0"
                          step="0.1"
                        />
                        {errors.thickness && (
                          <p className="mt-1 text-sm text-red-400">{errors.thickness}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Lighting (Watts)
                        </label>
                        <input
                          type="number"
                          value={formData.lighting === 0 ? '' : formData.lighting}
                          onChange={(e) => handleInputChange("lighting", parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Filtration (L/h)
                        </label>
                        <input
                          type="number"
                          value={formData.filtration === 0 ? '' : formData.filtration}
                          onChange={(e) => handleInputChange("filtration", parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-4">
                        Dimensions (cm)
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Length</label>
                          <input
                            type="number"
                            value={formData.dimensions.length === 0 ? '' : formData.dimensions.length}
                            onChange={(e) => handleDimensionChange("length", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Width</label>
                          <input
                            type="number"
                            value={formData.dimensions.width === 0 ? '' : formData.dimensions.width}
                            onChange={(e) => handleDimensionChange("width", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Height</label>
                          <input
                            type="number"
                            value={formData.dimensions.height === 0 ? '' : formData.dimensions.height}
                            onChange={(e) => handleDimensionChange("height", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Update Product" : "Create Product"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-primary/10">
        <ControlPanelNav />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/60">Loading product form...</p>
          </div>
        </div>
      </div>
    }>
      <ProductFormContent />
    </Suspense>
  );
}