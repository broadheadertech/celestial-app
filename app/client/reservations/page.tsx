"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated, useIsGuest } from "@/store/auth";
import { formatCurrency, formatDateTime, getRelativeTime } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import SafeAreaProvider from "@/components/provider/SafeAreaProvider";
import MemberSidebar from "@/components/dc/kit/MemberSidebar";
import SearchField from "@/components/dc/kit/SearchField";
import EmptyState from "@/components/dc/kit/EmptyState";
import {
  AlertIcon,
  BackIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  MenuIcon,
} from "@/components/dc/kit/icons";

function ReservationsContent() {
  const router = useRouter();
  const { user, guestId } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Fetch reservations data from Convex
  // Build query args based on auth state
  // Simplified logic: if user exists use userId, else if guestId exists use guestId, else skip
  const queryArgs = user?._id
    ? { userId: user._id }
    : guestId
      ? { guestId: guestId }
      : "skip";

  const reservationsData = useQuery(
    api.services.reservations.getReservations,
    queryArgs
  );
  const reservationsQuery = useMemo(() => reservationsData ?? [], [reservationsData]);

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

  const closeCancelModal = () => {
    setCancelModal({
      isOpen: false,
      reservationCode: "",
      reservationId: "",
    });
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

  // Status pill variant (kit .dk-status):
  // pending = outline (waiting on the shop), confirmed / completed = black (settled),
  // expired / cancelled = pale red (ended without a pickup).
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "",
      confirmed: "black",
      completed: "black",
      expired: "pale",
      cancelled: "pale",
    };

    return variants[status as keyof typeof variants] ?? "";
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

  const iconStyle = { color: "var(--dk-n-500)", flex: "none" } as const;

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="reservations" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
          <div className="dk-app-top">
            <div className="dk-app-top-l">
              <button
                type="button"
                className="dk-view-btn dk-app-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon />
              </button>
              <button
                type="button"
                className="dk-view-btn"
                onClick={() => router.back()}
                aria-label="Back"
              >
                <BackIcon />
              </button>
              <div>
                <h1>My Reservations</h1>
                <p className="dk-small dk-muted" aria-live="polite">
                  {filteredReservations.length} reservation
                  {filteredReservations.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="dk-app-actions">
              <button
                type="button"
                className="dk-btn dk-btn-outline-dark plain"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search and filter row */}
          <div className="dk-row dk-app-search">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search reservations, products..."
              label="Search reservations, products"
              iconSize={18}
            />
            <button
              type="button"
              className="dk-chip"
              onClick={() => setShowFilters(!showFilters)}
              aria-pressed={showFilters}
              aria-expanded={showFilters}
              aria-controls="reservation-filters"
              style={{ height: 48, flex: "none" }}
            >
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div id="reservation-filters" className="dk-panel dk-app-section" style={{ marginTop: 16 }}>
              <div className="dk-stack">
                <p className="dk-meta-label" id="status-filter-label">Filter by Status</p>
                <div className="dk-tabs" role="group" aria-labelledby="status-filter-label">
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
                      type="button"
                      className="dk-chip"
                      aria-pressed={selectedStatus === filter.value}
                      onClick={() => setSelectedStatus(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    className="dk-btn dk-btn-text"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedStatus("all");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="dk-app-section dk-stack lg" style={{ marginTop: 24 }}>
            {!isAuthenticated && (
              <div className="dk-panel muted">
                <div className="dk-row between wrap">
                  <div>
                    <h3 className="dk-h4">Sign in to track all reservations</h3>
                    <p className="dk-small dk-muted" style={{ marginTop: 4 }}>
                      Create an account to easily manage and track all your
                      reservations
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dk-btn dk-btn-red sm"
                    onClick={() => router.push("/auth/login")}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {filteredReservations.length === 0 ? (
              <div className="dk-panel">
                <EmptyState
                  icon={<CalendarIcon />}
                  title="No reservations found"
                  actions={
                    <button
                      type="button"
                      className="dk-btn dk-btn-red"
                      onClick={() => router.push("/client/search")}
                    >
                      Start Shopping
                    </button>
                  }
                >
                  {searchQuery || selectedStatus !== "all"
                    ? "No reservations match your search criteria"
                    : "You haven't made any reservations yet"}
                </EmptyState>
              </div>
            ) : (
              filteredReservations.map((reservation) => {
                const isExpanded = expandedCards.has(reservation._id);
                const detailsId = `res-details-${reservation._id}`;

                return (
                  <article key={reservation._id} className="dk-panel flush">
                    {/* Header */}
                    <div className="dk-row between" style={{ padding: "20px 24px", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="dk-row wrap" style={{ gap: 10 }}>
                          <h3 className="dk-h4" style={{ overflowWrap: "anywhere" }}>
                            {reservation.reservationCode ||
                              `RES-${reservation._id.slice(-6)}`}
                          </h3>
                          <span className={`dk-status ${getStatusBadge(reservation.status)}`.trim()}>
                            {getStatusText(reservation.status)}
                          </span>
                        </div>
                        <p className="dk-small dk-muted" style={{ marginTop: 6 }}>
                          <span>{formatDateTime(reservation.createdAt)}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{formatCurrency(reservation.totalAmount || 0)}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{reservation.totalQuantity || 0} items</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        className="dk-view-btn"
                        onClick={() => toggleCardExpansion(reservation._id)}
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        aria-label={isExpanded ? "Hide details" : "Show details"}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div
                        id={detailsId}
                        className="dk-stack lg"
                        style={{ padding: "4px 24px 24px", borderTop: "1px solid var(--dk-line)", paddingTop: 24 }}
                      >
                        {/* Customer Information */}
                        <section>
                          <h4 className="dk-h4" style={{ fontSize: 16 }}>Customer Information</h4>
                          <dl className="dk-grid-2" style={{ marginTop: 14, gap: 16 }}>
                            <div className="dk-kv">
                              <dt>Full Name</dt>
                              <dd>
                                {reservation.guestInfo?.name ||
                                  (isAuthenticated && user
                                    ? `${user.firstName} ${user.lastName}`
                                    : "Guest Customer")}
                              </dd>
                            </div>

                            {reservation.guestInfo?.email && (
                              <div className="dk-kv">
                                <dt>Email Address</dt>
                                <dd className="dk-row" style={{ gap: 8 }}>
                                  <Mail size={16} style={iconStyle} aria-hidden="true" />
                                  <span style={{ overflowWrap: "anywhere" }}>{reservation.guestInfo.email}</span>
                                </dd>
                              </div>
                            )}

                            {reservation.guestInfo?.phone && (
                              <div className="dk-kv">
                                <dt>Phone Number</dt>
                                <dd className="dk-row" style={{ gap: 8 }}>
                                  <Phone size={16} style={iconStyle} aria-hidden="true" />
                                  <span>{reservation.guestInfo.phone}</span>
                                </dd>
                              </div>
                            )}

                            {reservation.guestInfo?.completeAddress && (
                              <div className="dk-kv" style={{ gridColumn: "1 / -1" }}>
                                <dt>Complete Address</dt>
                                <dd className="dk-row" style={{ gap: 8, alignItems: "flex-start" }}>
                                  <MapPin size={16} style={{ ...iconStyle, marginTop: 3 }} aria-hidden="true" />
                                  <span>{reservation.guestInfo.completeAddress}</span>
                                </dd>
                              </div>
                            )}
                          </dl>

                          {reservation.guestInfo?.pickupSchedule && (
                            <div className="dk-panel muted" style={{ marginTop: 16, padding: 20 }}>
                              <h5 className="dk-meta-label">Pickup Schedule</h5>
                              <div className="dk-row wrap" style={{ marginTop: 10, gap: 24 }}>
                                <span className="dk-row" style={{ gap: 8 }}>
                                  <Calendar size={16} style={iconStyle} aria-hidden="true" />
                                  {reservation.guestInfo.pickupSchedule.date}
                                </span>
                                <span className="dk-row" style={{ gap: 8 }}>
                                  <Clock size={16} style={iconStyle} aria-hidden="true" />
                                  {reservation.guestInfo.pickupSchedule.time}
                                </span>
                              </div>
                            </div>
                          )}
                        </section>

                        {/* Reserved Items */}
                        <section>
                          <div className="dk-row between">
                            <h4 className="dk-h4" style={{ fontSize: 16 }}>Reserved Items</h4>
                            <span className="dk-small dk-muted">
                              {reservation.items?.length || 0} items
                            </span>
                          </div>

                          <div className="dk-list" style={{ marginTop: 6 }}>
                            {reservation.items?.slice(0, 3).map((item, index) => (
                              <div key={index} className="dk-list-row" style={{ padding: "12px 0" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontWeight: 700, fontSize: 15, overflowWrap: "anywhere" }}>
                                    {item.product?.name || "Unknown Product"}
                                  </p>
                                  <p className="dk-small dk-muted">
                                    <span>Qty: {item.quantity}</span>
                                    <span style={{ marginLeft: 12 }}>
                                      @ {formatCurrency(item.reservedPrice)}
                                    </span>
                                  </p>
                                </div>
                                <p style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
                                  {formatCurrency(
                                    item.reservedPrice * item.quantity
                                  )}
                                </p>
                              </div>
                            ))}
                            {reservation.items &&
                              reservation.items.length > 3 && (
                                <p className="dk-small dk-muted" style={{ padding: "10px 0 0", textAlign: "center" }}>
                                  +{reservation.items.length - 3} more items
                                </p>
                              )}
                          </div>
                        </section>

                        {/* Quick Details */}
                        <div className="dk-grid-2" style={{ gap: 12 }}>
                          <div className="dk-panel muted dk-kv" style={{ padding: 16 }}>
                            <span className="k">Expires</span>
                            <span
                              className="v"
                              style={{
                                fontWeight: 700,
                                color:
                                  reservation.expiryDate < Date.now()
                                    ? "var(--dk-red)"
                                    : "var(--dk-black)",
                              }}
                            >
                              {getRelativeTime(reservation.expiryDate)}
                            </span>
                          </div>
                          <div className="dk-panel muted dk-kv" style={{ padding: 16 }}>
                            <span className="k">Total</span>
                            <span className="v" style={{ fontWeight: 700 }}>
                              {formatCurrency(reservation.totalAmount || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {reservation.notes && (
                          <section>
                            <h4 className="dk-h4" style={{ fontSize: 16 }}>Special Notes</h4>
                            <div className="dk-alert" style={{ marginTop: 10 }}>
                              {reservation.notes}
                            </div>
                          </section>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="dk-row" style={{ padding: "16px 24px", borderTop: "1px solid var(--dk-line)", gap: 10 }}>
                      <button
                        type="button"
                        className="dk-btn dk-btn-outline-dark plain"
                        style={{ flex: 1 }}
                        onClick={() => toggleCardExpansion(reservation._id)}
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                      >
                        {isExpanded ? "Hide" : "Details"}
                      </button>

                      {(reservation.status === "pending" ||
                        reservation.status === "confirmed") && (
                        <button
                          type="button"
                          className="dk-btn dk-btn-red plain"
                          style={{ flex: 1 }}
                          onClick={() =>
                            openCancelModal(
                              reservation.reservationCode ||
                                reservation._id.toString(),
                              reservation._id
                            )
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <>
          <div
            className="dk-scrim"
            aria-hidden="true"
            onClick={() => {
              // Close modal when clicking backdrop (not the modal content)
              if (!isCancelling) closeCancelModal();
            }}
          />
          <div
            className="dk-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-res-title"
            aria-describedby="cancel-res-warning"
          >
            {/* Modal Header */}
            <div className="dk-row" style={{ gap: 14 }}>
              <span className="dk-empty-icon" style={{ width: 48, height: 48, margin: 0, flex: "none" }} aria-hidden="true">
                <AlertIcon size={22} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h3 id="cancel-res-title" className="dk-h3" style={{ fontSize: 20 }}>
                  Cancel Reservation
                </h3>
                <p className="dk-small dk-muted" style={{ overflowWrap: "anywhere" }}>
                  {cancelModal.reservationCode}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="dk-stack" style={{ marginTop: 20 }}>
              <div id="cancel-res-warning" className="dk-alert err">
                <p style={{ fontWeight: 700 }}>
                  Warning: This action cannot be undone
                </p>
                <p style={{ marginTop: 6, color: "var(--dk-n-600)" }}>
                  Once you cancel this reservation, you will not be able to restore it.
                  The reserved items will be returned to the available stock, and you will
                  need to create a new reservation if you change your mind.
                </p>
              </div>

              <div>
                <p className="dk-small dk-muted">
                  Are you sure you want to cancel this reservation?
                </p>
                <ul className="dk-small" style={{ listStyle: "disc", paddingLeft: 20, marginTop: 8, display: "grid", gap: 4 }}>
                  <li>Your reserved items will become available again</li>
                  <li>You will receive a cancellation confirmation</li>
                  <li>This action is permanent and irreversible</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="dk-row" style={{ marginTop: 24, gap: 10 }}>
              <button
                type="button"
                className="dk-btn dk-btn-outline-dark plain"
                style={{ flex: 1 }}
                onClick={closeCancelModal}
                disabled={isCancelling}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="dk-btn dk-btn-red plain"
                style={{ flex: 1 }}
                onClick={handleCancelReservation}
                disabled={isCancelling}
                aria-busy={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel It"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 95,
            width: "min(480px, calc(100% - 32px))",
          }}
        >
          <div
            className={`dk-alert ${toast.type === "success" ? "ok" : "err"} dk-row`}
            style={{ gap: 10, alignItems: "center" }}
          >
            {toast.type === "success" ? <CheckIcon /> : <AlertIcon size={18} />}
            <p style={{ flex: 1, fontWeight: 500 }}>{toast.message}</p>
            <button
              type="button"
              className="dk-search-clear"
              style={{ position: "static" }}
              onClick={() =>
                setToast({ show: false, message: "", type: "success" })
              }
              aria-label="Dismiss"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>
      )}
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
