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

export default function ReservationsPage() {
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
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    reservationCode: string;
    reservationId: string;
  }>({ isOpen: false, reservationCode: "", reservationId: "" });

  // Fetch reservations data from Convex
  const reservationsQuery =
    useQuery(
      api.services.reservations.getReservations,
      isAuthenticated && user
        ? { userId: user._id }
        : isGuest && guestId
          ? { guestId: guestId }
          : "skip",
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

  // Handle cancel reservation
  const handleCancelReservation = async () => {
    try {
      await cancelReservation({
        reservationCode: cancelModal.reservationCode,
        userId: isAuthenticated && user ? user._id : undefined,
        guestId: isGuest && guestId ? guestId : undefined,
      });
      setCancelModal({ isOpen: false, reservationCode: "", reservationId: "" });
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      alert("Failed to cancel reservation. Please try again.");
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
      {/* Enhanced Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-orange-500/20">
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
      <div className="px-3 sm:px-6 py-4 sm:py-6">
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
                                    item.reservedPrice * item.quantity,
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
                                `RES-${reservation._id.slice(-6)}`,
                              reservation._id,
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

      {/* Cancel Modal - Mobile Optimized */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Modal Container - Slides up on mobile, centered on desktop */}
          <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 w-full max-w-lg sm:rounded-2xl rounded-t-3xl p-4 sm:p-6 lg:p-8 transform transition-all animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-300 shadow-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
            
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4 sm:hidden" />
            
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                    Cancel Reservation?
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 ml-11">
                  This action cannot be undone
                </p>
              </div>
              <button
                onClick={() =>
                  setCancelModal({
                    isOpen: false,
                    reservationCode: "",
                    reservationId: "",
                  })
                }
                className="p-2 -mt-1 -mr-1 rounded-xl hover:bg-gray-800/50 transition-all group"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
              </button>
            </div>

            {/* Reservation Code Display */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 sm:p-4 mb-6">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Reservation Code</p>
              <p className="text-base sm:text-lg font-mono font-semibold text-orange-400 break-all">
                {cancelModal.reservationCode}
              </p>
            </div>

            {/* Warning Content */}
            <div className="space-y-4 mb-6 sm:mb-8">
              <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                <p className="text-sm sm:text-base text-red-200 leading-relaxed">
                  Are you absolutely sure you want to cancel this reservation?
                </p>
              </div>

              {/* Consequences List */}
              <div className="space-y-3">
                <p className="text-xs sm:text-sm font-medium text-gray-300 uppercase tracking-wide">
                  What will happen:
                </p>
                <div className="space-y-2.5">
                  {[
                    {
                      icon: <Package className="w-4 h-4" />,
                      text: "Reserved items will be released back to inventory",
                      color: "text-yellow-400"
                    },
                    {
                      icon: <XCircle className="w-4 h-4" />,
                      text: "Your reservation will be permanently cancelled",
                      color: "text-red-400"
                    },
                    {
                      icon: <RefreshCw className="w-4 h-4" />,
                      text: "You'll need to make a new reservation if you change your mind",
                      color: "text-blue-400"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 bg-gray-800/20 rounded-lg p-3">
                      <div className={`${item.color} mt-0.5`}>
                        {item.icon}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed flex-1">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons - Stack on mobile, side by side on larger screens */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="w-full sm:flex-1 py-3 sm:py-2.5 text-sm sm:text-base border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600 transition-all min-h-[48px] sm:min-h-[44px]"
                onClick={() =>
                  setCancelModal({
                    isOpen: false,
                    reservationCode: "",
                    reservationId: "",
                  })
                }
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Keep Reservation
              </Button>
              <Button
                className="w-full sm:flex-1 py-3 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border border-red-600 transition-all shadow-lg shadow-red-900/20 min-h-[48px] sm:min-h-[44px]"
                onClick={handleCancelReservation}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Yes, Cancel Reservation
              </Button>
            </div>

            {/* Additional Info - Mobile optimized */}
            <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                Need help? Contact support at{" "}
                <a href="tel:+639123456789" className="text-orange-400 hover:underline">
                  +63 912 345 6789
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />

      {/* Bottom padding */}
      <div className="h-16" />
    </div>
  );
}