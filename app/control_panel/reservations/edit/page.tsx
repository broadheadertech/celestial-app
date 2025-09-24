"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChevronLeft,
  Save,
  Plus,
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import ControlPanelNav from "@/components/ControlPanelNav";
import Button from "@/components/ui/Button";

interface ReservationFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  pickupDate: string;
  pickupTime: string;
  notes: string;
  status: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

interface ProductOption {
  _id: string;
  name: string;
  price: number;
  stock: number;
  categoryName: string;
}

export default function ReservationEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  const isEditing = !!reservationId;

  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    pickupDate: "",
    pickupTime: "",
    notes: "",
    status: "pending",
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Convex queries and mutations
  const productsQuery = useQuery(api.services.admin.getAllProductsAdmin, {});
  const categoriesQuery = useQuery(api.services.categories.getCategories, {});
  const existingReservation = useQuery(
    api.services.reservations.getReservationById,
    isEditing && reservationId
      ? { reservationId: reservationId as Id<"reservations"> }
      : "skip",
  );

  const createReservation = useMutation(
    api.services.reservations.createReservation,
  );
  const updateReservationStatus = useMutation(
    api.services.reservations.updateReservationStatus,
  );

  // Get product options with categories
  const productOptions: ProductOption[] = useMemo(() => {
    if (!productsQuery || !categoriesQuery) return [];

    return productsQuery
      .filter((product) => product.isActive && product.stock > 0)
      .map((product) => {
        const category = categoriesQuery.find(
          (cat) => cat._id === product.categoryId,
        );
        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          categoryName: category?.name || "Unknown",
        };
      });
  }, [productsQuery, categoriesQuery]);

  // Load existing reservation data
  useEffect(() => {
    if (existingReservation) {
      // Handle both guest and user reservations
      let customerName = "";
      let customerEmail = "";
      let customerPhone = "";
      let customerAddress = "";

      if (existingReservation.guestInfo) {
        customerName = existingReservation.guestInfo.name;
        customerEmail = existingReservation.guestInfo.email;
        customerPhone = existingReservation.guestInfo.phone;
        customerAddress = existingReservation.guestInfo.completeAddress || "";
      } else if (existingReservation.user) {
        customerName = `${existingReservation.user.firstName} ${existingReservation.user.lastName}`;
        customerEmail = existingReservation.user.email;
        customerPhone = existingReservation.user.phone || "";
      }

      // Handle pickup schedule
      let pickupDate = "";
      let pickupTime = "";
      if (existingReservation.guestInfo?.pickupSchedule) {
        pickupDate = existingReservation.guestInfo.pickupSchedule.date;
        pickupTime = existingReservation.guestInfo.pickupSchedule.time;
      }

      // Handle items - convert to expected format
      const items =
        existingReservation.items?.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.reservedPrice,
        })) || [];

      // Fallback for legacy single-item reservations
      if (existingReservation.productId && existingReservation.quantity) {
        items.push({
          productId: existingReservation.productId,
          quantity: existingReservation.quantity,
          price: existingReservation.reservedPrice || 0,
        });
      }

      setFormData({
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        pickupDate,
        pickupTime,
        notes: existingReservation.notes || "",
        status: existingReservation.status,
        items,
      });
    }
  }, [existingReservation]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "Customer email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = "Email is invalid";
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "Customer phone is required";
    }
    if (!formData.pickupDate) {
      newErrors.pickupDate = "Pickup date is required";
    }
    if (!formData.pickupTime) {
      newErrors.pickupTime = "Pickup time is required";
    }
    if (formData.items.length === 0) {
      newErrors.items = "At least one product is required";
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
      const reservationData = {
        guestInfo: {
          name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          completeAddress: formData.customerAddress,
          pickupSchedule: {
            date: formData.pickupDate,
            time: formData.pickupTime,
          },
          notes: formData.notes,
        },
        items: formData.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          reservedPrice: item.price,
        })),
        totalAmount: formData.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        totalQuantity: formData.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        status: formData.status as any,
        notes: formData.notes,
      };

      if (isEditing && reservationId) {
        await updateReservationStatus({
          reservationId: reservationId as Id<"reservations">,
          status: formData.status as any,
          adminNotes: formData.notes,
        });
      } else {
        await createReservation(reservationData);
      }

      // Redirect back to reservations page
      router.push("/control_panel/reservations");
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert("Failed to save reservation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof ReservationFormData,
    value: string | any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addItem = () => {
    if (productOptions.length > 0) {
      const firstProduct = productOptions[0];
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            productId: firstProduct._id,
            quantity: 1,
            price: firstProduct.price,
          },
        ],
      }));
    }
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const getTotalAmount = () => {
    return formData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  };

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
                  {isEditing ? "Edit Reservation" : "Create New Reservation"}
                </h1>
                <p className="text-white/60">
                  {isEditing
                    ? "Update reservation information"
                    : "Create a new reservation for customer"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      handleInputChange("customerName", e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                      errors.customerName
                        ? "border-error"
                        : "border-white/10 focus:ring-primary"
                    }`}
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-error">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      handleInputChange("customerEmail", e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                      errors.customerEmail
                        ? "border-error"
                        : "border-white/10 focus:ring-primary"
                    }`}
                    placeholder="customer@email.com"
                  />
                  {errors.customerEmail && (
                    <p className="mt-1 text-sm text-error">
                      {errors.customerEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) =>
                      handleInputChange("customerPhone", e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                      errors.customerPhone
                        ? "border-error"
                        : "border-white/10 focus:ring-primary"
                    }`}
                    placeholder="+63 912 345 6789"
                  />
                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-error">
                      {errors.customerPhone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) =>
                      handleInputChange("customerAddress", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Complete address"
                  />
                </div>
              </div>
            </div>

            {/* Pickup Schedule */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Pickup Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pickup Date *
                  </label>
                  <input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) =>
                      handleInputChange("pickupDate", e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                      errors.pickupDate
                        ? "border-error"
                        : "border-white/10 focus:ring-primary"
                    }`}
                  />
                  {errors.pickupDate && (
                    <p className="mt-1 text-sm text-error">
                      {errors.pickupDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pickup Time *
                  </label>
                  <input
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) =>
                      handleInputChange("pickupTime", e.target.value)
                    }
                    className={`w-full px-4 py-3 bg-secondary/60 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                      errors.pickupTime
                        ? "border-error"
                        : "border-white/10 focus:ring-primary"
                    }`}
                  />
                  {errors.pickupTime && (
                    <p className="mt-1 text-sm text-error">
                      {errors.pickupTime}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={productOptions.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {errors.items && (
                <p className="mb-4 text-sm text-error">{errors.items}</p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-secondary/60 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">
                        Product #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 rounded hover:bg-error/20 transition-colors"
                      >
                        <X className="w-4 h-4 text-error" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Product
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            updateItem(index, "productId", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {productOptions.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.categoryName}) - ₱
                              {product.price}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          min="1"
                          className="w-full px-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.01"
                            className="w-full pl-8 pr-3 py-2 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No products added yet</p>
                    <p className="text-sm">
                      Click "Add Product" to get started
                    </p>
                  </div>
                )}
              </div>

              {/* Total Amount */}
              {formData.items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-white">
                      Total Amount:
                    </span>
                    <span className="text-xl font-bold text-primary">
                      ₱{getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                Additional Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Additional notes or instructions"
                  />
                </div>
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
                    {isEditing ? "Update Reservation" : "Create Reservation"}
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
