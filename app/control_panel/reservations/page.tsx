"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// TypeScript interfaces for reservation data
interface ReservationItem {
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
}

interface MockReservation {
  _id: string;
  reservationCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: ReservationItem[];
  subtotal?: number;
  orderDiscount?: number;
  totalAmount: number;
  status: string;
  pickupDate: string;
  pickupTime: string;
  createdAt: number;
  notes: string;
  address: string;
}

import {
  ChevronLeft,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Package,
  Eye,
  Edit,
  MoreVertical,
  Download,
  Plus,
  CalendarDays,
  Timer,
  CheckCircle2,
} from "lucide-react";
import ControlPanelNav from "@/components/ControlPanelNav";
import Button from "@/components/ui/Button";

const getStatusInfo = (status: string) => {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        color: "bg-warning/10 text-warning border-warning/30",
        icon: Clock,
      };
    case "confirmed":
      return {
        label: "Confirmed",
        color: "bg-info/10 text-info border-info/30",
        icon: CheckCircle,
      };
    case "completed":
      return {
        label: "Completed",
        color: "bg-success/10 text-success border-success/30",
        icon: CheckCircle2,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        color: "bg-error/10 text-error border-error/30",
        icon: XCircle,
      };
    default:
      return {
        label: "Unknown",
        color: "bg-white/10 text-white/60 border-white/20",
        icon: AlertTriangle,
      };
  }
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function ReservationsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(
    null,
  );
  const [updatingReservation, setUpdatingReservation] = useState<string | null>(
    null,
  );

  // Fetch real reservation data with server-side filtering
  const realReservations = useQuery(
    api.services.reservations.getAllReservationsAdmin,
    {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      search: searchQuery.trim() || undefined,
    },
  );

  // Normalize reservation data to handle both mock and real data structures
  const normalizeReservation = (reservation: unknown): MockReservation => {
    const res = reservation as Record<string, unknown>;

    // If it's already in the expected format (mock data), return as-is
    if (res.customerName && Array.isArray(res.items) && res.items[0]?.name) {
      return reservation as MockReservation;
    }

    // Convert real Convex data to expected format

    type ConvexUser = {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };

    return {
      _id: res._id as string,
      reservationCode: (res.reservationCode as string) || "",
      customerName: res.user
        ? `${(res.user as ConvexUser).firstName} ${(res.user as ConvexUser).lastName}`
        : ((res.guestInfo as Record<string, unknown>)?.name as string) ||
          "Unknown",
      customerEmail:
        (res.user as ConvexUser)?.email ||
        ((res.guestInfo as Record<string, unknown>)?.email as string) ||
        "",
      customerPhone:
        (res.user as ConvexUser)?.phone ||
        ((res.guestInfo as Record<string, unknown>)?.phone as string) ||
        "",
      items: Array.isArray(res.items)
        ? res.items.map((item: unknown) => {
            const itemObj = item as Record<string, unknown>;
            const product = itemObj.product as Record<string, unknown>;
            return {
              name: (product?.name as string) || "Unknown Product",
              quantity: (itemObj.quantity as number) || 0,
              price:
                (itemObj.reservedPrice as number) ||
                (product?.price as number) ||
                0,
              originalPrice: itemObj.originalPrice as number | undefined,
              discount: itemObj.discount as number | undefined,
            };
          })
        : [],
      subtotal: res.subtotal as number | undefined,
      orderDiscount: res.orderDiscount as number | undefined,
      totalAmount:
        (res.totalAmount as number) ||
        (Array.isArray(res.items)
          ? res.items.reduce((sum: number, item: unknown) => {
              const itemObj = item as Record<string, unknown>;
              const product = itemObj.product as Record<string, unknown>;
              return (
                sum +
                ((itemObj.reservedPrice as number) ||
                  (product?.price as number) ||
                  0) *
                  ((itemObj.quantity as number) || 0)
              );
            }, 0)
          : 0) ||
        0,
      status: (res.status as string) || "",
      pickupDate:
        (res.pickupDate as string) ||
        new Date(res.createdAt as number).toISOString().split("T")[0],
      pickupTime: (res.pickupTime as string) || "12:00",
      createdAt: (res.createdAt as number) || 0,
      notes: (res.notes as string) || "",
      address:
        ((res.guestInfo as Record<string, unknown>)?.address as string) || "",
    };
  };

  // Use real data from Convex and normalize
  const reservationsData = useMemo(() => {
    return realReservations ? realReservations.map(normalizeReservation) : [];
  }, [realReservations]);

  // Filter reservations (only date filtering remains client-side)
  const filteredReservations = useMemo(() => {
    let filtered = reservationsData;

    // Apply date filter
    if (selectedDate !== "all") {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter((reservation) => {
        const pickupDate = new Date(reservation.pickupDate);
        switch (selectedDate) {
          case "today":
            return pickupDate.toDateString() === today.toDateString();
          case "tomorrow":
            return pickupDate.toDateString() === tomorrow.toDateString();
          case "this_week":
            return pickupDate >= today && pickupDate <= nextWeek;
          case "overdue":
            return (
              pickupDate < today &&
              reservation.status !== "completed" &&
              reservation.status !== "cancelled"
            );
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [reservationsData, selectedDate]);

  // Calculate reservation stats (with 30-day vs prior 30-day trend)
  const reservationStats = useMemo(() => {
    const total = reservationsData.length;
    const pending = reservationsData.filter(
      (r) => r.status === "pending",
    ).length;
    const confirmed = reservationsData.filter(
      (r) => r.status === "confirmed",
    ).length;
    const completed = reservationsData.filter(
      (r) => r.status === "completed",
    ).length;
    const cancelled = reservationsData.filter(
      (r) => r.status === "cancelled",
    ).length;
    const totalRevenue = reservationsData
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const pendingRevenue = reservationsData
      .filter((r) => r.status === "pending" || r.status === "confirmed")
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last30Start = now - 30 * day;
    const prev30Start = now - 60 * day;

    const recent = reservationsData.filter((r) => r.createdAt >= last30Start);
    const prior = reservationsData.filter(
      (r) => r.createdAt >= prev30Start && r.createdAt < last30Start,
    );

    const pctChange = (a: number, b: number): string => {
      if (b === 0) return a > 0 ? "New" : "—";
      const diff = ((a - b) / b) * 100;
      return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
    };

    const countByStatus = (
      list: typeof reservationsData,
      status: string,
    ) => list.filter((r) => r.status === status).length;

    const recentRevenue = recent
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + (r.totalAmount || 0), 0);
    const priorRevenue = prior
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + (r.totalAmount || 0), 0);

    const trends = {
      total: pctChange(recent.length, prior.length),
      pending: pctChange(countByStatus(recent, "pending"), countByStatus(prior, "pending")),
      confirmed: pctChange(countByStatus(recent, "confirmed"), countByStatus(prior, "confirmed")),
      completed: pctChange(countByStatus(recent, "completed"), countByStatus(prior, "completed")),
      cancelled: pctChange(countByStatus(recent, "cancelled"), countByStatus(prior, "cancelled")),
      revenue: pctChange(recentRevenue, priorRevenue),
    };

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      totalRevenue,
      pendingRevenue,
      trends,
    };
  }, [reservationsData]);

  const trendToneTotal = reservationStats.trends.total.startsWith("+") || reservationStats.trends.total === "New" ? "success" : "error";
  const trendToneRevenue = reservationStats.trends.revenue.startsWith("+") || reservationStats.trends.revenue === "New" ? "success" : "error";

  // Convex mutations
  const updateReservationStatus = useMutation(
    api.services.reservations.updateReservationStatus,
  );

  const handleReservationAction = async (
    reservationId: string,
    action: string,
  ) => {
    if (action === "View") {
      router.push(`/control_panel/reservations/${reservationId}`);
    } else if (action === "Edit") {
      router.push(`/control_panel/reservations/edit/${reservationId}`);
    } else if (action === "Confirm") {
      setUpdatingReservation(reservationId);
      try {
        await updateReservationStatus({
          reservationId: reservationId as Id<"reservations">,
          status: "confirmed",
          adminNotes: "Confirmed via Control Panel",
        });
        alert("Reservation confirmed successfully!");
      } catch (error) {
        console.error("Error confirming reservation:", error);
        alert("Error confirming reservation. Please try again.");
      } finally {
        setUpdatingReservation(null);
      }
    } else if (action === "Complete") {
      setUpdatingReservation(reservationId);
      try {
        await updateReservationStatus({
          reservationId: reservationId as Id<"reservations">,
          status: "completed",
          adminNotes: "Completed via Control Panel",
        });
        alert("Reservation marked as completed!");
      } catch (error) {
        console.error("Error completing reservation:", error);
        alert("Error completing reservation. Please try again.");
      } finally {
        setUpdatingReservation(null);
      }
    } else if (action === "Cancel") {
      const confirmed = confirm(
        "Are you sure you want to cancel this reservation? This action cannot be undone.",
      );
      if (confirmed) {
        setUpdatingReservation(reservationId);
        try {
          await updateReservationStatus({
            reservationId: reservationId as Id<"reservations">,
            status: "cancelled",
            adminNotes: "Cancelled via Control Panel",
          });
          alert("Reservation cancelled successfully!");
        } catch (error) {
          console.error("Error cancelling reservation:", error);
          alert("Error cancelling reservation. Please try again.");
        } finally {
          setUpdatingReservation(null);
        }
      }
    }
    setSelectedReservation(null);
  };

  const handleExport = () => {
    if (typeof window === "undefined" || filteredReservations.length === 0) return;

    const rows: string[] = [];
    rows.push("Code,Customer,Email,Phone,Status,Pickup Date,Items,Subtotal,Order Discount,Total,Created");
    filteredReservations.forEach((r) => {
      const items = r.items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(" | ")
        .replace(/"/g, "'");
      const line = [
        r.reservationCode || r._id.slice(-8),
        `"${r.customerName.replace(/"/g, "'")}"`,
        r.customerEmail,
        r.customerPhone,
        r.status,
        r.pickupDate,
        `"${items}"`,
        (r.subtotal ?? r.totalAmount).toFixed(2),
        (r.orderDiscount ?? 0).toFixed(2),
        r.totalAmount.toFixed(2),
        new Date(r.createdAt).toISOString(),
      ].join(",");
      rows.push(line);
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Reservation Management
                  </h1>
                  <p className="text-sm text-white/60">
                    Manage customer reservations and pickups
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={filteredReservations.length === 0}
                  className="border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className={`text-xs text-${trendToneTotal}`}>
                  {reservationStats.trends.total}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {reservationStats.total}
              </p>
              <p className="text-xs text-white/60">Total Reservations</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-xs text-warning">
                  {reservationStats.trends.pending}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {reservationStats.pending}
              </p>
              <p className="text-xs text-white/60">Pending</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-info" />
                <span className="text-xs text-info">
                  {reservationStats.trends.confirmed}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {reservationStats.confirmed}
              </p>
              <p className="text-xs text-white/60">Confirmed</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-xs text-success">
                  {reservationStats.trends.completed}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {reservationStats.completed}
              </p>
              <p className="text-xs text-white/60">Completed</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-xs text-error">
                  {reservationStats.trends.cancelled}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {reservationStats.cancelled}
              </p>
              <p className="text-xs text-white/60">Cancelled</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-info" />
                <span className={`text-xs text-${trendToneRevenue}`}>
                  {reservationStats.trends.revenue}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(reservationStats.totalRevenue)}
              </p>
              <p className="text-xs text-white/60">Completed Revenue</p>
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
                placeholder="Search reservations, customers, items..."
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
                  Status
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    {
                      key: "all",
                      label: "All Status",
                      count: reservationsData.length,
                    },
                    {
                      key: "pending",
                      label: "Pending",
                      count: reservationStats.pending,
                    },
                    {
                      key: "confirmed",
                      label: "Confirmed",
                      count: reservationStats.confirmed,
                    },
                    {
                      key: "completed",
                      label: "Completed",
                      count: reservationStats.completed,
                    },
                    {
                      key: "cancelled",
                      label: "Cancelled",
                      count: reservationStats.cancelled,
                    },
                  ].map((filter) => (
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

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Date Range
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { key: "all", label: "All Dates" },
                    { key: "today", label: "Today" },
                    { key: "tomorrow", label: "Tomorrow" },
                    { key: "this_week", label: "This Week" },
                    { key: "overdue", label: "Overdue" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedDate(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedDate === filter.key
                          ? "bg-primary border-primary text-white"
                          : "bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reservations List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Reservations ({filteredReservations.length})
            </h2>
            {filteredReservations.length === 0 &&
              reservationsData.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatus("all");
                    setSelectedDate("all");
                  }}
                  className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
                >
                  Clear Filters
                </button>
              )}
          </div>

          {filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {reservationsData.length === 0
                  ? "No reservations yet"
                  : "No reservations found"}
              </h3>
              <p className="text-white/60 mb-6 text-center">
                {reservationsData.length === 0
                  ? "When customers make reservations, they will appear here."
                  : "Try adjusting your search terms or filters."}
              </p>
              {reservationsData.length === 0 && (
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => router.push("/client/reservations")}
                >
                  View Customer Reservations
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => {
                const statusInfo = getStatusInfo(reservation.status);
                const StatusIcon = statusInfo.icon;
                const isOverdue =
                  new Date(reservation.pickupDate) < new Date() &&
                  reservation.status !== "completed" &&
                  reservation.status !== "cancelled";

                return (
                  <div
                    key={reservation._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 ${
                      isOverdue
                        ? "border-error/30 bg-error/5"
                        : "border-white/10 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex space-x-4">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-secondary border border-white/10 flex items-center justify-center">
                          <StatusIcon className="w-6 h-6 text-white/60" />
                        </div>
                        {isOverdue && (
                          <div className="mt-1 text-center">
                            <span className="text-xs text-error font-medium">
                              Overdue
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reservation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {reservation.reservationCode}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {reservation.customerName}
                            </p>
                            <p className="text-xs text-white/40">
                              {reservation.items.length} item
                              {reservation.items.length !== 1 ? "s" : ""} •
                              Total: {formatCurrency(reservation.totalAmount)}
                            </p>
                          </div>


                        </div>

                        {/* Status and Pickup Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`px-3 py-1 rounded-lg ${statusInfo.color} flex items-center space-x-1`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 text-xs text-white/60">
                              <CalendarDays className="w-3 h-3" />
                              <span>{formatDate(reservation.pickupDate)}</span>
                            </div>

                            <div className="flex items-center space-x-1 text-xs text-white/60">
                              <Timer className="w-3 h-3" />
                              <span>{formatTime(reservation.pickupTime)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {formatCurrency(reservation.totalAmount)}
                            </p>
                            <p className="text-xs text-white/60">
                              {reservation.items.length} item
                              {reservation.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Customer Contact Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-32">
                                {reservation.customerEmail}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{reservation.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-32">
                                {reservation.address}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-white/60">Created</p>
                            <p className="text-sm font-medium text-white">
                              {new Date(
                                reservation.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="space-y-1">
                            {reservation.items.map(
                              (item: ReservationItem, index: number) => {
                                const hasLineDiscount =
                                  (item.discount || 0) > 0 && item.originalPrice;
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-white/80">
                                      {item.quantity}x {item.name}
                                      {hasLineDiscount && (
                                        <span className="ml-2 text-[10px] text-white/50">
                                          <span className="line-through">
                                            {formatCurrency(item.originalPrice!)}
                                          </span>
                                          <span className="text-green-400 ml-1">
                                            −{formatCurrency(item.discount!)}
                                          </span>
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-white/60">
                                      {formatCurrency(item.price * item.quantity)}
                                    </span>
                                  </div>
                                );
                              },
                            )}
                          </div>
                          {(reservation.orderDiscount || 0) > 0 &&
                            reservation.subtotal !== undefined && (
                              <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5 text-xs">
                                <div className="flex items-center justify-between text-white/60">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(reservation.subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-green-400">
                                  <span>Order Discount</span>
                                  <span>
                                    −{formatCurrency(reservation.orderDiscount!)}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Notes */}
                        {reservation.notes && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-white/60 mb-1">Notes:</p>
                            <p className="text-xs text-white/80">
                              {reservation.notes}
                            </p>
                          </div>
                        )}
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
      {selectedReservation && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedReservation(null)}
        />
      )}
    </div>
  );
}
