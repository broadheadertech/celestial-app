"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Star,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Download,
  X,
  Loader,
  Award,
  Fish,
  Waves,
} from "lucide-react";
import ControlPanelNav from "@/components/ControlPanelNav";
import Button from "@/components/ui/Button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

const getStockStatus = (stock: number) => {
  if (stock === 0)
    return {
      status: "Out of Stock",
      color: "bg-error/10",
      textColor: "text-error",
      text: "Out of Stock",
    };
  if (stock < 10)
    return {
      status: "Low Stock",
      color: "bg-warning/10",
      textColor: "text-warning",
      text: "Low Stock",
    };
  return {
    status: "In Stock",
    color: "bg-success/10",
    textColor: "text-success",
    text: "In Stock",
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "#10B981";
    case "inactive":
      return "#EF4444";
    case "out_of_stock":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
};

const normalizeImageUrl = (url: string | undefined): string => {
  if (!url) return "/img/logo-app.png";

  if (url.startsWith("file://")) {
    console.warn("File URL detected, using fallback image:", url);
    return "/img/logo-app.png";
  }

  if (url.startsWith("/")) {
    return url;
  }

  if (url.startsWith("http")) {
    return url;
  }

  return "/img/logo-app.png";
};

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // const viewMode = searchParams.get("view") || "list"; // Unused
  const productId = searchParams.get("id");
  const action = searchParams.get("action");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [certificateModalVisible, setCertificateModalVisible] = useState(false);

  // Convex queries
  const productsQuery = useQuery(api.services.admin.getAllProductsAdmin, {
    category: undefined,
    status: undefined,
    search: undefined,
  });
  const categoriesQuery = useQuery(api.services.categories.getCategories, {});

  // Get product details if viewing/editing
  const allProducts = useQuery(api.services.admin.getAllProductsAdmin, {});
  const productDetails = useMemo(
    () => allProducts?.find((p) => p._id === productId),
    [allProducts, productId],
  );

  // Get category for product details
  const category = useMemo(
    () =>
      categoriesQuery?.find((cat) => cat._id === productDetails?.categoryId),
    [categoriesQuery, productDetails],
  );

  // Get fish/tank data if applicable
  const fishData = useQuery(
    api.services.products.getFishByProductId,
    productId ? { productId: productId as Id<"products"> } : "skip",
  );

  const tankData = useQuery(
    api.services.products.getTankByProductId,
    productId ? { productId: productId as Id<"products"> } : "skip",
  );

  // Mutations
  const deleteProduct = useMutation(api.services.admin.deleteProduct);

  // Create category mapping
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoriesQuery?.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categoriesQuery]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!productsQuery) return [];
    let filtered = productsQuery.filter((product) => product && product._id); // Filter out non-product items

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name?.toString().toLowerCase().includes(query) ||
          (product.description &&
            product.description.toLowerCase().includes(query)) ||
          (categoryMap[product.categoryId] &&
            categoryMap[product.categoryId]
              ?.toString()
              .toLowerCase()
              .includes(query)) ||
          (product.sku &&
            product.sku?.toString().toLowerCase().includes(query)),
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter((product) => {
        const productCategory = categoryMap[product.categoryId];
        return productCategory === selectedCategory;
      });
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((product) => {
        switch (selectedStatus) {
          case "active":
            return product.productStatus === "active" && product.stock > 0;
          case "inactive":
            return product.productStatus === "inactive";
          case "out_of_stock":
            return product.stock === 0;
          case "low_stock":
            return product.stock > 0 && product.stock < 10;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [
    searchQuery,
    selectedCategory,
    selectedStatus,
    categoryMap,
    productsQuery,
  ]);

  // Calculate stats
  const productStats = useMemo(() => {
    if (!productsQuery)
      return {
        totalProducts: 0,
        activeProducts: 0,
        outOfStock: 0,
        inactiveProducts: 0,
        lowStock: 0,
        totalRevenue: 0,
        totalSales: 0,
      };

    const total = productsQuery.length;
    const active = productsQuery.filter(
      (p) => p.productStatus === "active" && p.stock > 0,
    ).length;
    const outOfStock = productsQuery.filter((p) => p.stock === 0).length;
    const inactive = productsQuery.filter(
      (p) => p.productStatus === "inactive",
    ).length;
    const lowStock = productsQuery.filter(
      (p) => p.stock > 0 && p.stock < 10,
    ).length;
    const totalRevenue = productsQuery.reduce(
      (sum, p) => sum + p.price * (p.stock || 0),
      0,
    );
    const totalSales = productsQuery.length;

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStock: outOfStock,
      inactiveProducts: inactive,
      lowStock: lowStock,
      totalRevenue,
      totalSales,
    };
  }, [productsQuery]);

  // Get category names
  const categoryNames = useMemo(() => {
    return ["All", ...(categoriesQuery?.map((cat) => cat.name) || [])];
  }, [categoriesQuery]);

  // Status filters
  const statusFilters = useMemo(
    () => [
      { key: "all", label: "All Status", count: productStats.totalProducts },
      { key: "active", label: "Active", count: productStats.activeProducts },
      {
        key: "inactive",
        label: "Inactive",
        count: productStats.inactiveProducts,
      },
      {
        key: "out_of_stock",
        label: "Out of Stock",
        count: productStats.outOfStock,
      },
      { key: "low_stock", label: "Low Stock", count: productStats.lowStock },
    ],
    [productStats],
  );

  // Handle product actions
  const handleProductAction = async (productId: string, actionType: string) => {
    if (actionType === "Edit") {
      router.push(`/control_panel/products?id=${productId}&action=edit`);
    } else if (actionType === "View") {
      router.push(`/control_panel/products?id=${productId}&action=view`);
    } else if (actionType === "Delete") {
      if (confirm("Are you sure you want to delete this product?")) {
        try {
          setIsDeleting(true);
          await deleteProduct({ id: productId as Id<"products"> });
          setSelectedProduct(null);
          // Refresh the page
          router.push("/control_panel/products");
        } catch (error) {
          console.error("Error deleting product:", error);
          alert("Failed to delete product. Please try again.");
        } finally {
          setIsDeleting(false);
        }
      }
    } else if (actionType === "Toggle") {
      console.log("Toggle status for product:", productId);
    }
    setSelectedProduct(null);
  };

  // Handle back to list
  const handleBackToList = () => {
    router.push("/control_panel/products");
  };

  // Handle add product
  const handleAddProduct = () => {
    router.push("/control_panel/products?action=add");
  };

  // View certificate
  const handleViewCertificate = () => {
    if (productDetails?.certificate) {
      setCertificateModalVisible(true);
    }
  };

  // Loading states
  const isLoading = !productsQuery || !categoriesQuery;
  // const isProductLoading = productId && !productDetails; // Unused

  // Product detail view
  if (productId && action === "view" && productDetails) {
    const stockStatus = getStockStatus(productDetails.stock);
    const discount =
      productDetails.originalPrice &&
      productDetails.originalPrice > productDetails.price
        ? Math.round(
            ((productDetails.originalPrice - productDetails.price) /
              productDetails.originalPrice) *
              100,
          )
        : 0;
    const isFishProduct =
      category?.name?.toString().toLowerCase().includes("fish") || false;
    const isTankProduct =
      category?.name?.toString().toLowerCase().includes("tank") ||
      category?.name?.toString().toLowerCase().includes("aquarium") ||
      false;

    // Combine main image with additional images
    const allImageUrls = [
      productDetails.image,
      ...(productDetails.images || []),
    ]
      .filter(Boolean)
      .map(normalizeImageUrl);

    const displayImages =
      allImageUrls.length > 0 ? allImageUrls : ["/img/logo-app.png"];

    return (
      <div className="min-h-screen bg-background">
        <ControlPanelNav />
        <div className="ml-64 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-16 pb-4">
            <button
              onClick={handleBackToList}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </button>
            <h1 className="font-bold text-xl text-white">Product Details</h1>
            <div className="flex">
              <button
                onClick={() =>
                  router.push(
                    `/control_panel/products?id=${productId}&action=edit`,
                  )
                }
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors mr-2"
              >
                <Edit size={18} color="#FF6B00" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Product Images */}
            <div className="mb-6">
              <div className="rounded-2xl overflow-hidden mb-4 relative">
                <div className="relative w-full h-80">
                  <img
                    src={displayImages[activeImageIndex]}
                    alt={productDetails.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/img/logo-app.png";
                    }}
                  />
                </div>

                {discount > 0 && (
                  <div className="absolute top-4 left-4 px-2 py-1 rounded-lg bg-[#EF4444]">
                    <span className="font-bold text-xs text-white">
                      -{discount}%
                    </span>
                  </div>
                )}

                {productDetails.badge && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-[#FF6B00]">
                    <span className="font-bold text-xs text-white">
                      {productDetails.badge}
                    </span>
                  </div>
                )}

                {productDetails.certificate && (
                  <button
                    onClick={handleViewCertificate}
                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-[#10B981]/60 hover:bg-[#10B981]/80 transition-colors"
                  >
                    <Award size={20} color="#FFFFFF" />
                  </button>
                )}
              </div>

              {displayImages.length > 1 && (
                <div className="flex overflow-x-auto space-x-2">
                  {displayImages.map((imageUrl, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        activeImageIndex === index
                          ? "border-[#FF6B00]"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`${productDetails.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/img/logo-app.png";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="font-bold text-2xl text-white flex-1">
                  {productDetails.name}
                </h1>
                {productDetails.certificate && (
                  <button
                    onClick={handleViewCertificate}
                    className="ml-2 px-3 py-1 rounded-lg flex items-center bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors"
                  >
                    <Award size={16} color="#10B981" />
                    <span className="font-medium text-sm ml-1 text-[#10B981]">
                      Certified
                    </span>
                  </button>
                )}
              </div>

              <p className="text-base mb-4 text-[#B3B3B3]">
                {category?.name || "Unknown Category"}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="font-bold text-3xl text-[#FF6B00]">
                    ₱{productDetails.price.toFixed(2)}
                  </span>
                  {productDetails.originalPrice &&
                    productDetails.originalPrice > productDetails.price && (
                      <span className="text-lg line-through ml-2 text-[#666666]">
                        ₱{productDetails.originalPrice.toFixed(2)}
                      </span>
                    )}
                </div>
                <div
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: `${stockStatus.color}20` }}
                >
                  <span
                    className="font-medium text-sm"
                    style={{ color: stockStatus.textColor }}
                  >
                    {stockStatus.text}
                  </span>
                </div>
              </div>

              <p className="text-base text-[#CCCCCC]">
                {productDetails.description}
              </p>
            </div>

            {/* Certificate Section */}
            {productDetails.certificate && (
              <div className="mb-6">
                <h2 className="font-bold text-lg mb-4 text-white">
                  Certificate
                </h2>

                <button
                  onClick={handleViewCertificate}
                  className="w-full rounded-2xl p-4 flex items-center justify-between bg-[#1A1A1A] hover:bg-[#222222] transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 bg-[#10B981]/10">
                      <Award size={24} color="#10B981" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-base text-white">
                        Product Certificate
                      </div>
                      <div className="text-sm text-[#B3B3B3]">
                        Tap to view certificate
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Fish Data Section */}
            {isFishProduct && fishData && (
              <div className="mb-6">
                <h2 className="font-bold text-lg mb-4 text-white flex items-center">
                  <Fish className="mr-2" size={20} color="#FF6B00" />
                  Fish Information
                </h2>

                <div className="rounded-2xl p-4 bg-[#1A1A1A]">
                  <div className="grid grid-cols-1 gap-3">
                    {fishData.scientificName && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Scientific Name
                        </span>
                        <span className="text-base text-white font-medium">
                          {fishData.scientificName}
                        </span>
                      </div>
                    )}

                    {fishData.size && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Size
                        </span>
                        <span className="text-base text-white">
                          {fishData.size} cm
                        </span>
                      </div>
                    )}

                    {fishData.temperature && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Temperature
                        </span>
                        <span className="text-base text-white">
                          {fishData.temperature}°C
                        </span>
                      </div>
                    )}

                    {fishData.age !== undefined && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Age
                        </span>
                        <span className="text-base text-white">
                          {fishData.age} months
                        </span>
                      </div>
                    )}

                    {fishData.phLevel && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          pH Level
                        </span>
                        <span className="text-base text-white">
                          {fishData.phLevel}
                        </span>
                      </div>
                    )}

                    {fishData.lifespan && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Lifespan
                        </span>
                        <span className="text-base text-white">
                          {fishData.lifespan}
                        </span>
                      </div>
                    )}

                    {fishData.origin && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Origin
                        </span>
                        <span className="text-base text-white">
                          {fishData.origin}
                        </span>
                      </div>
                    )}

                    {fishData.diet && (
                      <div className="flex justify-between py-2">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Diet
                        </span>
                        <span className="text-base text-white">
                          {fishData.diet}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tank Data Section */}
            {isTankProduct && tankData && (
              <div className="mb-6">
                <h2 className="font-bold text-lg mb-4 text-white flex items-center">
                  <Waves className="mr-2" size={20} color="#FF6B00" />
                  Tank Specifications
                </h2>

                <div className="rounded-2xl p-4 bg-[#1A1A1A]">
                  <div className="grid grid-cols-1 gap-3">
                    {tankData.tankType && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Tank Type
                        </span>
                        <span className="text-base text-white font-medium">
                          {tankData.tankType}
                        </span>
                      </div>
                    )}

                    {tankData.material && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Material
                        </span>
                        <span className="text-base text-white">
                          {tankData.material}
                        </span>
                      </div>
                    )}

                    {tankData.capacity && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Capacity
                        </span>
                        <span className="text-base text-white">
                          {tankData.capacity} L
                        </span>
                      </div>
                    )}

                    {tankData.dimensions && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Dimensions
                        </span>
                        <span className="text-base text-white">
                          {tankData.dimensions.length} ×{" "}
                          {tankData.dimensions.width} ×{" "}
                          {tankData.dimensions.height} cm
                        </span>
                      </div>
                    )}

                    {tankData.thickness && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Thickness
                        </span>
                        <span className="text-base text-white">
                          {tankData.thickness} mm
                        </span>
                      </div>
                    )}

                    {tankData.lighting && (
                      <div className="flex justify-between py-2 border-b border-[#333333]">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Lighting
                        </span>
                        <span className="text-base text-white">
                          {tankData.lighting} W
                        </span>
                      </div>
                    )}

                    {tankData.filtation && (
                      <div className="flex justify-between py-2">
                        <span className="font-medium text-base text-[#B3B3B3]">
                          Filtration
                        </span>
                        <span className="text-base text-white">
                          {tankData.filtation} L/h
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="mb-6">
              <h2 className="font-bold text-lg mb-4 text-white">
                Product Details
              </h2>

              <div className="rounded-2xl p-4 bg-[#1A1A1A]">
                <div className="flex justify-between py-3 border-b border-[#333333]">
                  <span className="font-medium text-base text-[#B3B3B3]">
                    SKU
                  </span>
                  <span className="text-base text-white">
                    {productDetails.sku || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between py-3 border-b border-[#333333]">
                  <span className="font-medium text-base text-[#B3B3B3]">
                    Stock
                  </span>
                  <span className="text-base text-white">
                    {productDetails.stock} units
                  </span>
                </div>

                {productDetails.lifespan && (
                  <div className="flex justify-between py-3 border-b border-[#333333]">
                    <span className="font-medium text-base text-[#B3B3B3]">
                      Lifespan
                    </span>
                    <span className="text-base text-white">
                      {productDetails.lifespan}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-3">
                  <span className="font-medium text-base text-[#B3B3B3]">
                    Status
                  </span>
                  <div
                    className="px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${getStatusColor(productDetails.productStatus === "active" ? "active" : "inactive")}20`,
                    }}
                  >
                    <span
                      className="font-medium text-sm"
                      style={{
                        color: getStatusColor(
                          productDetails.productStatus === "active"
                            ? "active"
                            : "inactive",
                        ),
                      }}
                    >
                      {productDetails.productStatus === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Modal */}
        {certificateModalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="relative w-full h-full">
              <button
                onClick={() => setCertificateModalVisible(false)}
                className="absolute top-16 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10 bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X size={20} color="#FFFFFF" />
              </button>

              <div className="flex-1 flex items-center justify-center p-6 h-full">
                {productDetails.certificate ? (
                  <div className="relative w-full max-w-4xl h-[80vh]">
                    <img
                      src={normalizeImageUrl(productDetails.certificate)}
                      alt="Product Certificate"
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/img/logo-app.png";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="text-base text-white">
                      No certificate available
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-xl p-4 bg-white/10 backdrop-blur">
                  <h3 className="font-bold text-lg text-center mb-2 text-white">
                    Product Certificate
                  </h3>
                  <p className="text-sm text-center text-[#B3B3B3]">
                    {productDetails.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-background">
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Product Management
                  </h1>
                  <p className="text-sm text-white/60">
                    Manage your product inventory and catalog
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={handleAddProduct}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-xs text-success">+3.1%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.totalProducts}
              </p>
              <p className="text-xs text-white/60">Total Products</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-xs text-success">+2.5%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.activeProducts}
              </p>
              <p className="text-xs text-white/60">Active</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-xs text-warning">+1.2%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.lowStock}
              </p>
              <p className="text-xs text-white/60">Low Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                <span className="text-xs text-error">+0.8%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {productStats.outOfStock}
              </p>
              <p className="text-xs text-white/60">Out of Stock</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-warning" />
                <span className="text-xs text-success">+5.7%</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(productStats.totalRevenue)}
              </p>
              <p className="text-xs text-white/60">Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search products, SKU, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-primary border-primary text-white"
                  : "bg-secondary/60 border-white/10 text-white hover:bg-secondary/80"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Categories
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categoryNames.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedCategory === category
                          ? "bg-primary border-primary text-white"
                          : "bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                        selectedStatus === filter.key
                          ? "bg-info border-info text-white"
                          : "bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          selectedStatus === filter.key
                            ? "bg-white/20 text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {filter.count}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Products ({filteredProducts.length})
            </h2>
            {filteredProducts.length === 0 &&
              productsQuery &&
              productsQuery.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedStatus("all");
                  }}
                  className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
                >
                  Clear Filters
                </button>
              )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Loading products...
              </h3>
              <p className="text-white/60">
                Please wait while we fetch your product data.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No products found
              </h3>
              <p className="text-white/60 mb-6 text-center">
                {productsQuery.length === 0
                  ? "No products have been added yet."
                  : "Try adjusting your search terms or filters."}
              </p>
              {productsQuery.length === 0 && (
                <Button
                  onClick={handleAddProduct}
                  className="bg-primary hover:bg-primary/90"
                >
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                const discount =
                  product.originalPrice && product.originalPrice > product.price
                    ? Math.round(
                        ((product.originalPrice - product.price) /
                          product.originalPrice) *
                          100,
                      )
                    : 0;

                const getItemStatus = (prod: typeof product) => {
                  if (prod.productStatus === "inactive") return "inactive";
                  if (prod.stock === 0) return "out_of_stock";
                  return "active";
                };

                const itemStatus = getItemStatus(product);
                const categoryName =
                  categoryMap[product.categoryId] || "Unknown Category";

                return (
                  <div
                    key={product._id}
                    className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex space-x-4">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary border border-white/10">
                          {product.image ? (
                            <img
                              src={normalizeImageUrl(product.image)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-white/20" />
                            </div>
                          )}
                        </div>
                        {product.badge && (
                          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-primary">
                            <span className="text-xs font-bold text-white">
                              {product.badge === "Bestseller"
                                ? "★"
                                : product.badge.charAt(0)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded bg-error">
                            <span className="text-xs font-bold text-white">
                              -{discount}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {product.name || "Unnamed Product"}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {categoryName}
                            </p>
                            <p className="text-xs text-white/40">
                              SKU: {product.sku || "N/A"} • ID:{" "}
                              {product._id.slice(-6).toUpperCase()}
                            </p>
                          </div>

                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setSelectedProduct(
                                  selectedProduct === product._id
                                    ? null
                                    : product._id,
                                )
                              }
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedProduct === product._id && (
                              <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "View")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Edit")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Product</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Toggle")
                                    }
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    {product.productStatus === "active" ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                    <span>
                                      {product.productStatus === "active"
                                        ? "Deactivate"
                                        : "Activate"}
                                    </span>
                                  </button>
                                  <div className="border-t border-white/10 my-1"></div>
                                  <button
                                    onClick={() =>
                                      handleProductAction(product._id, "Delete")
                                    }
                                    className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>
                                      {isDeleting ? "Deleting..." : "Delete"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                            {product.originalPrice &&
                              product.originalPrice > product.price && (
                                <span className="text-sm text-white/40 line-through ml-2">
                                  {formatCurrency(product.originalPrice)}
                                </span>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`px-3 py-1 rounded-lg ${
                                itemStatus === "active"
                                  ? "bg-success/10 text-success"
                                  : itemStatus === "inactive"
                                    ? "bg-white/10 text-white/60"
                                    : "bg-error/10 text-error"
                              }`}
                            >
                              <span className="text-xs font-medium capitalize">
                                {itemStatus.replace("_", " ")}
                              </span>
                            </div>

                            <div
                              className={`px-3 py-1 rounded-lg ${stockStatus.color} ${stockStatus.textColor}`}
                            >
                              <span className="text-xs font-medium">
                                {product.stock} in stock
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-white/60">
                              Created:{" "}
                              {new Date(product.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center">
                            <span className="text-xs text-white/60">
                              {product.description?.substring(0, 100)}
                              {product.description &&
                              product.description.length > 100
                                ? "..."
                                : ""}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() =>
                                router.push(
                                  `/control_panel/products?id=${product._id}&action=view`,
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="border-primary/20 text-primary hover:bg-primary/10"
                            >
                              View
                            </Button>

                            <Button
                              onClick={() =>
                                router.push(
                                  `/control_panel/products?id=${product._id}&action=edit`,
                                )
                              }
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
