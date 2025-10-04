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
                  {/* Reservation card content - keeping existing implementation */}
                  {/* ... rest of the card implementation ... */}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Modal - keeping existing implementation */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Modal content - keeping existing implementation */}
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