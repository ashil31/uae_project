import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchOrders, updateOrderStatus } from "../../store/slices/ordersSlice";
import { X } from "lucide-react";
const OrderTrackingEditor = () => {
  const dispatch = useDispatch();
  const { orders: storeOrders, isLoading } = useSelector(
    (state) => state.orders
  );
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [itemsFilter, setItemsFilter] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const trackingStatuses = [
    {
      key: "pending",
      label: "Order Pending",
      description: "Order is awaiting confirmation",
    },
    {
      key: "confirmed",
      label: "Order Confirmed",
      description: "Order has been received and confirmed",
    },
    {
      key: "packed",
      label: "Packed",
      description: "Items have been packed for shipping",
    },
    {
      key: "shipped",
      label: "Shipped",
      description: "Package has been dispatched",
    },
    {
      key: "out-for-delivery",
      label: "Out for Delivery",
      description: "Package is on the way to customer",
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Package has been delivered successfully",
    },
  ];

  // Helper function to get the next available status
  const getNextStatus = (currentStatus) => {
    const statusOrder = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex < statusOrder.length - 1
      ? statusOrder[currentIndex + 1]
      : null;
  };

  // Helper function to check if a status should be shown as next available
  const isNextAvailableStatus = (statusKey, currentStatus, tracking) => {
    const statusOrder = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const statusIndex = statusOrder.indexOf(statusKey);

    // Show as next if it's the immediate next status and not completed
    return statusIndex === currentIndex + 1 && !tracking[statusKey]?.completed;
  };

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  useEffect(() => {
    // Convert store orders to tracking format
    if (storeOrders && storeOrders.length > 0) {
      const trackingOrders = storeOrders.map((order) => {
        // Convert backend tracking array to object format
        const trackingObj = {};

        // Initialize all statuses as not completed
        trackingStatuses.forEach((status) => {
          trackingObj[status.key] = { completed: false, date: null, note: "" };
        });

        // Process tracking events from backend
        if (order.tracking && Array.isArray(order.tracking)) {
          order.tracking.forEach((event) => {
            if (trackingObj[event.stage]) {
              trackingObj[event.stage] = {
                completed: true,
                date: event.timestamp || event.date,
                note: event.message || event.note || "",
              };
            }
          });
        }

        // Ensure current status and all previous statuses are marked as completed
        const statusOrder = [
          "pending",
          "confirmed",
          "packed",
          "shipped",
          "out-for-delivery",
          "delivered",
        ];
        const currentIndex = statusOrder.indexOf(order.status);

        for (let i = 0; i <= currentIndex; i++) {
          const statusKey = statusOrder[i];
          if (trackingObj[statusKey] && !trackingObj[statusKey].completed) {
            trackingObj[statusKey] = {
              completed: true,
              date: order.createdAt || order.date,
              note: `${
                trackingStatuses.find((s) => s.key === statusKey)?.label ||
                statusKey
              } - Auto-generated`,
            };
          }
        }

        return {
          ...order,
          orderDate: order.date,
          currentStatus: order.status,
          itemCount: Array.isArray(order.items)
            ? order.items.length
            : order.items,
          items: Array.isArray(order.items)
            ? order.items
            : [`${order.items} items`],
          tracking: trackingObj,
        };
      });
      setOrders(trackingOrders);
    }
  }, [storeOrders]);

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (order) => order.currentStatus === statusFilter
      );
    }

    // Apply items filter
    if (itemsFilter) {
      switch (itemsFilter) {
        case "single":
          filtered = filtered.filter((order) => order.itemCount === 1);
          break;
        case "multiple":
          filtered = filtered.filter((order) => order.itemCount > 1);
          break;
        case "bulk":
          filtered = filtered.filter((order) => order.itemCount >= 5);
          break;
        default:
          break;
      }
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
        break;
      case "highest-value":
        filtered.sort((a, b) => b.total - a.total);
        break;
      case "lowest-value":
        filtered.sort((a, b) => a.total - b.total);
        break;
      case "most-items":
        filtered.sort((a, b) => b.itemCount - a.itemCount);
        break;
      case "least-items":
        filtered.sort((a, b) => a.itemCount - b.itemCount);
        break;
      default:
        break;
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, sortBy, itemsFilter]);

  const updateOrderTracking = async (orderId, status, note) => {
    if (isUpdating) return; // Prevent multiple simultaneous updates

    try {
      setIsUpdating(true);
      console.log("Updating order:", { orderId, status, note }); // Debug log

      // Show loading state
      const loadingToast = toast.loading("Updating order status...");

      // Dispatch the update action to backend
      const result = await dispatch(
        updateOrderStatus({
          id: orderId,
          status: status,
          reason:
            note ||
            `${
              trackingStatuses.find((s) => s.key === status)?.label
            } updated by admin`,
        })
      ).unwrap();

      console.log("Update result:", result); // Debug log

      // Update local state to reflect changes immediately
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updatedTracking = { ...order.tracking };
            updatedTracking[status] = {
              completed: true,
              date: new Date().toISOString(),
              note:
                note ||
                `${
                  trackingStatuses.find((s) => s.key === status)?.label
                } updated by admin`,
            };

            return {
              ...order,
              tracking: updatedTracking,
              currentStatus: status,
            };
          }
          return order;
        })
      );

      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedTracking = { ...selectedOrder.tracking };
        updatedTracking[status] = {
          completed: true,
          date: new Date().toISOString(),
          note:
            note ||
            `${
              trackingStatuses.find((s) => s.key === status)?.label
            } updated by admin`,
        };

        setSelectedOrder({
          ...selectedOrder,
          tracking: updatedTracking,
          currentStatus: status,
        });
      }

      toast.dismiss(loadingToast);
      toast.success("Tracking status updated successfully");

      // Refresh orders from backend to ensure consistency
      // dispatch(fetchOrders());
    } catch (error) {
      toast.error(error.message || "Failed to update tracking status");
      console.error("Error updating order tracking:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status, isCompleted) => {
    if (!isCompleted) return "text-gray-400";

    switch (status) {
      case "pending":
        return "text-yellow-600";
      case "confirmed":
        return "text-blue-600";
      case "packed":
        return "text-purple-600";
      case "shipped":
        return "text-indigo-600";
      case "out-for-delivery":
        return "text-orange-600";
      case "delivered":
        return "text-green-600";
      default:
        return "text-gray-400";
    }
  };

  const getStatusBgColor = (status, isCompleted) => {
    if (!isCompleted) return "bg-gray-100";

    switch (status) {
      case "pending":
        return "bg-yellow-100";
      case "confirmed":
        return "bg-blue-100";
      case "packed":
        return "bg-purple-100";
      case "shipped":
        return "bg-indigo-100";
      case "out-for-delivery":
        return "bg-orange-100";
      case "delivered":
        return "bg-green-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <>
      <Helmet>
        <title>Order Tracking - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-4 md:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Order Tracking Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and update order tracking statuses
            </p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {filteredOrders.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-900">{orders.length}</span>{" "}
            orders
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Filters & Search
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by customer, order ID, or email..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="out-for-delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items Filter
              </label>
              <select
                value={itemsFilter}
                onChange={(e) => setItemsFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">All Orders</option>
                <option value="single">Single Item (1)</option>
                <option value="multiple">Multiple Items (2-4)</option>
                <option value="bulk">Bulk Orders (5+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest-value">Highest Value</option>
                <option value="lowest-value">Lowest Value</option>
                <option value="most-items">Most Items</option>
                <option value="least-items">Least Items</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setItemsFilter("");
                  setSortBy("newest");
                }}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click to view tracking details
                </p>
              </div>

              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    No orders match your current filters
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("");
                      setItemsFilter("");
                      setSortBy("newest");
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      whileHover={{ backgroundColor: "#f8fafc" }}
                      className={`p-5 cursor-pointer transition-all duration-200 ${
                        selectedOrder?.id === order.id
                          ? "bg-blue-50 border-r-4 border-blue-500 shadow-sm"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {order.id}
                            </p>
                            {selectedOrder?.id === order.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-1">
                            {order.customer}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded-md">
                              {order.itemCount} item
                              {order.itemCount !== 1 ? "s" : ""}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(order.orderDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-gray-900 mb-2">
                            ${order.total}
                          </p>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              order.currentStatus === "delivered"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : order.currentStatus === "shipped" ||
                                  order.currentStatus === "out-for-delivery"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : order.currentStatus === "cancelled"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : order.currentStatus === "packed"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            }`}
                          >
                            {trackingStatuses.find(
                              (s) => s.key === order.currentStatus
                            )?.label || order.currentStatus}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tracking Details */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Tracking Details
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Order ID:{" "}
                        <span className="font-medium text-gray-900">
                          {selectedOrder.id}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Customer:{" "}
                        <span className="font-medium text-gray-900">
                          {selectedOrder.customer}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${selectedOrder.total}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedOrder.itemCount} item
                        {selectedOrder.itemCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-8">
                    {trackingStatuses.map((status, index) => {
                      const tracking = selectedOrder.tracking[status.key] || {
                        completed: false,
                        date: null,
                        note: "",
                      };
                      const isCompleted = tracking.completed;
                      const isNext = isNextAvailableStatus(
                        status.key,
                        selectedOrder.currentStatus,
                        selectedOrder.tracking
                      );
                      const isCancelled =
                        selectedOrder.currentStatus === "cancelled";

                      return (
                        <motion.div
                          key={status.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-start space-x-4"
                        >
                          {/* Connecting line */}
                          {index < trackingStatuses.length - 1 && (
                            <div
                              className={`absolute left-4 top-8 w-0.5 h-8 ${
                                isCompleted ? "bg-green-300" : "bg-gray-200"
                              }`}
                            ></div>
                          )}

                          <div
                            className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                              isCompleted
                                ? `${getStatusBgColor(
                                    status.key,
                                    true
                                  )} border-transparent shadow-sm`
                                : isNext
                                ? "bg-white border-blue-500 shadow-md"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            {isCompleted ? (
                              <svg
                                className={`w-4 h-4 ${getStatusColor(
                                  status.key,
                                  true
                                )}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : isNext ? (
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            ) : (
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p
                                  className={`text-base font-semibold ${getStatusColor(
                                    status.key,
                                    isCompleted
                                  )}`}
                                >
                                  {status.label}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {status.description}
                                </p>
                              </div>
                              {isNext && (
                                <button
                                  onClick={() => {
                                    setPendingUpdate({
                                      orderId: selectedOrder.id,
                                      status: status.key,
                                      statusLabel: status.label,
                                    });
                                    setNoteText("");
                                    setShowNoteModal(true);
                                  }}
                                  disabled={isUpdating}
                                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    isUpdating
                                      ? "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                                      : "text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
                                  }`}
                                >
                                  {isUpdating ? "Updating..." : "Mark Complete"}
                                </button>
                              )}
                            </div>
                            {isCompleted && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg
                                    className="w-4 h-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <p className="text-sm font-medium text-gray-700">
                                    {new Date(tracking.date).toLocaleString()}
                                  </p>
                                </div>
                                {tracking.note && (
                                  <p className="text-sm text-gray-600 italic">
                                    "{tracking.note}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Order Summary */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Order Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 20.4a7.962 7.962 0 01-5.657-2.109c-1.21-1.21-1.878-2.83-1.878-4.533 0-1.704.668-3.323 1.878-4.533A7.962 7.962 0 0112 6.4c2.147 0 4.204.854 5.657 2.309A7.962 7.962 0 0120.4 12a7.962 7.962 0 01-2.109 5.657z"
                            />
                          </svg>
                          Order Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Date:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(
                                selectedOrder.orderDate
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium text-gray-900">
                              {selectedOrder.customer}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium text-gray-900">
                              {selectedOrder.email || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                          Order Items
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Items:</span>
                            <span className="font-medium text-gray-900">
                              {selectedOrder.itemCount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-bold text-lg text-gray-900">
                              ${selectedOrder.total}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment:</span>
                            <span className="font-medium text-gray-900">
                              {selectedOrder.paymentMethod || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      <div className="mt-6">
                        <button 
                        onClick={() => setIsDetailsModalOpen(true)} 
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors">
                      
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                          </svg>
                          Items in Order
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedOrder.items) ? (
                            selectedOrder.items.map((item, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {typeof item === "string"
                                  ? item
                                  : `${item.name || "Item"} (${
                                      item.quantity || 1
                                    })`}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                              {selectedOrder.items} items
                            </span>
                          )}
                        </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select an Order
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose an order from the list to view and manage its tracking
                  details
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Click on any order to get started
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Note Modal */}
        {showNoteModal && pendingUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
            >
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Mark "{pendingUpdate.statusLabel}" as Complete
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Update the order tracking status
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Add a note (optional):
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter any additional information about this status update..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-2">
                  This note will be visible in the tracking history
                </p>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setPendingUpdate(null);
                    setNoteText("");
                  }}
                  disabled={isUpdating}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateOrderTracking(
                      pendingUpdate.orderId,
                      pendingUpdate.status,
                      noteText
                    );
                    setShowNoteModal(false);
                    setPendingUpdate(null);
                    setNoteText("");
                  }}
                  disabled={isUpdating}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isUpdating ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    "Update Status"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

{/* NEW: Items Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Order Details - {selectedOrder.id}</h3>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Customer</label><p>{selectedOrder.customer}</p></div>
                    <div><label className="block text-sm font-medium text-gray-700">Total</label><p className="font-semibold">${selectedOrder.total.toFixed(2)}</p></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Products</label>
                    <div className='overflow-x-auto border rounded-lg'>
                      <table className='w-full'>
                        <thead className='bg-gray-50'>
                          <tr>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Product</th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Color</th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Size</th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Qty</th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Price</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedOrder.products.map((row, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{row.productId.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{row.color}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{row.size}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{row.quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">${row.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
                <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </motion.div>
    </>
  );
};

export default OrderTrackingEditor;
