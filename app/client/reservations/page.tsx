"use client";

import { useState, useMemo } from "react";
import useWindowSize from "@/hooks/useWindowSize";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Truck,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated, useIsGuest } from "@/store/auth";
import { formatCurrency, formatDateTime, getRelativeTime } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ClientBottomNavbar from "@/components/client/ClientBottomNavbar";
import SafeAreaProvider from "@/components/provider/SafeAreaProvider";

function ReservationsContent() {
  const router = useRouter();
  const { width } = useWindowSize();
  const { user, guestId } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    reservationCode: string;
    reservationId: string;
  }>({ isOpen: false, reservationCode: "", reservationId: "" });
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  // Fetch reservations data from Convex
  // Build query args based on auth state
  // Simplified logic: if user exists use userId, else if guestId exists use guestId, else skip
  const queryArgs = user?._id
    ? { userId: user._id }
    : guestId
      ? { guestId: guestId }
      : "skip";

  const reservationsQuery = useQuery(
    api.services.reservations.getReservations,
    queryArgs
  ) || [];

  // Mutations
  const cancelReservation = useMutation(
    api.services.reservations.cancelReservation,
  );

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 5000);
  };

  // Handle cancel reservation
  const handleCancelReservation = async () => {
    setIsCancelling(true);
    try {
      await cancelReservation({
        reservationCode: cancelModal.reservationCode,
        userId: isAuthenticated && user ? user._id : undefined,
        guestId: isGuest && guestId ? guestId : undefined,
      });
      
      // Close modal
      setCancelModal({ isOpen: false, reservationCode: "", reservationId: "" });
      
      // Show success message
      showToast(
        `Reservation ${cancelModal.reservationCode} has been cancelled successfully`,
        "success"
      );
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      showToast(
        "Failed to cancel reservation. Please try again.",
        "error"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelModal = (reservationCode: string, reservationId: string) => {
    setCancelModal({ isOpen: true, reservationCode, reservationId });
  };

  const toggleCardExpansion = (reservationId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(reservationId)) {
      newExpanded.delete(reservationId);
    } else {
      newExpanded.add(reservationId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
      completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-500/20 text-gray-400 border-gray-500/30"
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "confirmed":
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "completed":
        return <Package className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "expired":
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "cancelled":
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      default:
        return <Package className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Confirmation";
      case "confirmed":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "expired":
        return "Expired";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Filter reservations based on search and status
  const filteredReservations = useMemo(() => {
    return (reservationsQuery || []).filter((reservation) => {
      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesCode = reservation.reservationCode
          ?.toLowerCase()
          .includes(searchLower);
        const matchesName = reservation.guestInfo?.name
          ?.toLowerCase()
          .includes(searchLower);
        const matchesEmail = reservation.guestInfo?.email
          ?.toLowerCase()
          .includes(searchLower);
        const matchesItems = reservation.items?.some((item) =>
          item.product?.name?.toLowerCase().includes(searchLower),
        );

        if (!matchesCode && !matchesName && !matchesEmail && !matchesItems) {
          return false;
        }
      }

      // Apply status filter
      if (selectedStatus !== "all" && reservation.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [reservationsQuery, searchQuery, selectedStatus]);

  return (
    <div className="min-h-screen bg-black">
      {/* Enhanced Header with Safe Area */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-orange-500/20 safe-area-top">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="p-2 sm:p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 hover:bg-gray-800/80 transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  My Reservations
                </h1>
                <p className="text-xs sm:text-sm text-gray-400">
                  {filteredReservations.length} reservation
                  {filteredReservations.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border border-gray-800 hover:border-orange-500/30 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""} ${
                    width && width < 640 ? "" : "mr-2"
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Enhanced search and filter row */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search reservations, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl transition-all text-sm sm:text-base bg-gray-900/60 border-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border transition-all flex items-center gap-1 sm:gap-2 shrink-0 ${
                showFilters
                  ? "bg-orange-600 border-orange-500 text-white"
                  : "bg-gray-900/60 border-gray-800 text-white hover:bg-gray-800/80"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden xs:inline text-sm sm:text-base">
                Filters
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      {showFilters && (
        <div className="bg-gray-900/40 backdrop-blur-sm border-b border-gray-800 px-3 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Filter by Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "completed", label: "Completed" },
                { value: "expired", label: "Expired" },
                { value: "cancelled", label: "Cancelled" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition-colors touch-manipulation ${
                    selectedStatus === filter.value
                      ? "bg-orange-600 border-orange-500 text-white"
                      : "border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
              }}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-3 sm:px-6 py-4 sm:py-6 safe-area-bottom">
        {!isAuthenticated && (
          <Card
            variant="glass"
            className="mb-4 sm:mb-6 bg-blue-500/10 border-blue-500/20"
          >
            <div className="text-center p-4">
              <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">
                Sign in to track all reservations
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-4">
                Create an account to easily manage and track all your
                reservations
              </p>
              <Button
                onClick={() => router.push("/auth/login")}
                size="sm"
                className="touch-manipulation"
              >
                Sign In
              </Button>
            </div>
          </Card>
        )}

        {filteredReservations.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
              No reservations found
            </h3>
            <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base px-4">
              {searchQuery || selectedStatus !== "all"
                ? "No reservations match your search criteria"
                : "You haven't made any reservations yet"}
            </p>
            <Button
              onClick={() => router.push("/client/search")}
              className="touch-manipulation"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredReservations.map((reservation) => {
              const isExpanded = expandedCards.has(reservation._id);

              return (
                <div
                  key={reservation._id}
                  className="bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-xl hover:border-orange-500/30 transition-all duration-200 overflow-hidden"
                >
                  {/* Compact Header */}
                  <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 p-3 sm:p-4 border-b border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 bg-orange-500/20 border border-orange-500/30">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-sm sm:text-base truncate">
                              {reservation.reservationCode ||
                                `RES-${reservation._id.slice(-6)}`}
                            </h3>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(reservation.status)}`}
                            >
                              {getStatusIcon(reservation.status)}
                              <span className="capitalize hidden sm:inline">
                                {getStatusText(reservation.status)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{formatDateTime(reservation.createdAt)}</span>
                            <span>•</span>
                            <span>
                              {formatCurrency(reservation.totalAmount || 0)}
                            </span>
                            <span>•</span>
                            <span>{reservation.totalQuantity || 0} items</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCardExpansion(reservation._id)}
                        className="p-1.5 sm:p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-300" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 space-y-6">
                      {/* Customer Information */}
                      <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                        <div className="flex items-center gap-2 mb-4">
                          <User className="w-5 h-5 text-orange-400" />
                          <h4 className="font-semibold text-white">
                            Customer Information
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-400 text-sm mb-1">
                              Full Name
                            </p>
                            <p className="text-white font-medium">
                              {reservation.guestInfo?.name ||
                                (isAuthenticated && user
                                  ? `${user.firstName} ${user.lastName}`
                                  : "Guest Customer")}
                            </p>
                          </div>

                          {reservation.guestInfo?.email && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">
                                Email Address
                              </p>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <p className="text-white font-medium break-all">
                                  {reservation.guestInfo.email}
                                </p>
                              </div>
                            </div>
                          )}

                          {reservation.guestInfo?.phone && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">
                                Phone Number
                              </p>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <p className="text-white font-medium">
                                  {reservation.guestInfo.phone}
                                </p>
                              </div>
                            </div>
                          )}

                          {reservation.guestInfo?.completeAddress && (
                            <div className="sm:col-span-2">
                              <p className="text-gray-400 text-sm mb-1">
                                Complete Address
                              </p>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <p className="text-white font-medium">
                                  {reservation.guestInfo.completeAddress}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {reservation.guestInfo?.pickupSchedule && (
                          <div className="mt-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <Truck className="w-5 h-5 text-orange-400" />
                              <h5 className="font-medium text-white">
                                Pickup Schedule
                              </h5>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-white">
                                  {reservation.guestInfo.pickupSchedule.date}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-white">
                                  {reservation.guestInfo.pickupSchedule.time}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reserved Items */}
                      <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-400" />
                            <h4 className="font-semibold text-white text-sm">
                              Reserved Items
                            </h4>
                          </div>
                          <span className="text-xs text-gray-400">
                            {reservation.items?.length || 0} items
                          </span>
                        </div>

                        <div className="space-y-2">
                          {reservation.items?.slice(0, 3).map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-700"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">
                                  {item.product?.name || "Unknown Product"}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                  <span>Qty: {item.quantity}</span>
                                  <span>
                                    @ {formatCurrency(item.reservedPrice)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <p className="text-white font-semibold text-sm">
                                  {formatCurrency(
                                    item.reservedPrice * item.quantity
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                          {reservation.items &&
                            reservation.items.length > 3 && (
                              <div className="text-center py-1">
                                <p className="text-xs text-gray-400">
                                  +{reservation.items.length - 3} more items
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Quick Details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-800">
                          <p className="text-gray-400 text-xs mb-1">Expires</p>
                          <p
                            className={`text-sm font-medium ${
                              reservation.expiryDate < Date.now()
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {getRelativeTime(reservation.expiryDate)}
                          </p>
                        </div>
                        <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-800">
                          <p className="text-gray-400 text-xs mb-1">Total</p>
                          <p className="text-sm font-medium text-white">
                            {formatCurrency(reservation.totalAmount || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {reservation.notes && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-orange-400" />
                            <h4 className="font-semibold text-white">
                              Special Notes
                            </h4>
                          </div>
                          <div className="bg-gray-800/30 rounded-lg p-3">
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {reservation.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="p-3 sm:p-4 border-t border-gray-800">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center space-x-1 text-xs border-gray-700 text-gray-300 hover:bg-gray-800 min-h-[36px]"
                        onClick={() => toggleCardExpansion(reservation._id)}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isExpanded ? "Hide" : "Details"}</span>
                      </Button>

                      {(reservation.status === "pending" ||
                        reservation.status === "confirmed") && (
                        <Button
                          variant="outline"
                          className="flex-1 flex items-center justify-center space-x-1 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 min-h-[36px]"
                          onClick={() =>
                            openCancelModal(
                              reservation.reservationCode ||
                                reservation._id.toString(),
                              reservation._id
                            )
                          }
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancel</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop (not the modal content)
            if (e.target === e.currentTarget && !isCancelling) {
              setCancelModal({
                isOpen: false,
                reservationCode: "",
                reservationId: "",
              });
            }
          }}
        >
          <div
            className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600/20 to-red-500/10 p-4 sm:p-6 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Cancel Reservation
                  </h3>
                  <p className="text-sm text-gray-400">
                    {cancelModal.reservationCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium mb-2">
                      Warning: This action cannot be undone
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Once you cancel this reservation, you will not be able to restore it. 
                      The reserved items will be returned to the available stock, and you will 
                      need to create a new reservation if you change your mind.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Are you sure you want to cancel this reservation?
                </p>
                <ul className="text-sm text-gray-300 space-y-1 pl-5 list-disc">
                  <li>Your reserved items will become available again</li>
                  <li>You will receive a cancellation confirmation</li>
                  <li>This action is permanent and irreversible</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-gray-900/50 border-t border-gray-800 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() =>
                  setCancelModal({
                    isOpen: false,
                    reservationCode: "",
                    reservationId: "",
                  })
                }
                disabled={isCancelling}
              >
                <X className="w-4 h-4 mr-2" />
                Keep Reservation
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCancelReservation}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Yes, Cancel It
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top-2 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-green-500/20 border-green-500/30 text-green-400"
                : "bg-red-500/20 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium text-white">{toast.message}</p>
            <button
              onClick={() =>
                setToast({ show: false, message: "", type: "success" })
              }
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ReservationsContent />
    </SafeAreaProvider>
  );
}