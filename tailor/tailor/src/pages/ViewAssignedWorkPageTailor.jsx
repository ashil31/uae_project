// ViewAssignedWorkPageTailor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  XCircle,
  Clock,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import apiClient from "../api/apiClient";

const BASE_API = "https://uae-project-1.onrender.com/api";

const ENDPOINTS = {
  fetchAssigned: `${BASE_API}/tailors/my-work`,
  rejectOrder: (orderId) => `${BASE_API}/tailors/${orderId}/reject`,
};

const STATUS_BADGE = {
  Assigned: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-indigo-100 text-indigo-800",
  Rejected: "bg-red-100 text-red-800",
  Done: "bg-green-100 text-green-800",
  Pending: "bg-gray-100 text-gray-800",
};

const PageSize = 8;

const ViewAssignedWorkPageTailor = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, order: null });

  // Fetch orders (with pagination/search/status filter)
  const fetchOrders = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        page: opts.page || page,
        limit: PageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(ENDPOINTS.fetchAssigned, { params });
      console.log("Fetched orders:", res.data);

      if (res?.data?.success) {
        const receivedOrders = res.data.orders || res.data.data || [];
        const total = res.data.pagination?.totalItems ?? res.data.totalItems ?? receivedOrders.length;
        setOrders(receivedOrders);
        setTotalItems(total);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
        setTotalItems(res.data.length);
      } else {
        toast.error("Failed to fetch orders. Check API response.");
        setOrders([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast.error("Error fetching orders. Check console.");
      setOrders([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When paging, search, or status changes - refetch
  useEffect(() => {
    fetchOrders({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / PageSize)), [totalItems]);

  const updateLocalOrderStatus = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId || o._id === orderId ? { ...o, status: newStatus } : o)));
  };

  // Open reject confirm modal
  const handleReject = (order) => {
    setConfirmModal({ open: true, order });
  };

  // Perform the reject action and then reload the page
  const performReject = async (order) => {
    if (!order) return;
    const orderId = order.id ?? order._id;
    const endpoint = ENDPOINTS.rejectOrder(orderId);

    setActionLoadingId(orderId);
    setConfirmModal({ open: false, order: null });

    // Optimistic UI change
    const prevStatus = order.status;
    updateLocalOrderStatus(orderId, "Rejected");

    try {
      const res = await apiClient.put(endpoint, { reason: "Rejected by tailor" });
      if (res?.data?.success) {
        toast.success("Order rejected successfully");
        // Full page reload as requested to re-fetch everything from server
        window.location.reload();
      } else {
        toast.error(res?.data?.message || "Reject failed");
        updateLocalOrderStatus(orderId, prevStatus || "Assigned");
      }
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Server error while rejecting");
      updateLocalOrderStatus(orderId, prevStatus || "Assigned");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onConfirmModalConfirm = () => {
    if (!confirmModal.order) return;
    performReject(confirmModal.order);
  };

  const statusOptions = ["", "Assigned", "In Progress", "Confirmed", "Rejected", "Done", "Pending"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 bg-gray-50 min-h-screen"
    >
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Assigned Orders</h1>
            <p className="text-sm text-gray-500 mt-1">See orders assigned to you — reject if you cannot take them.</p>
          </div>

          <div className="flex gap-2 items-center w-full md:w-auto">
            <label className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm">
              <SearchIcon size={16} className="text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by customer/order id/product..."
                className="outline-none text-sm w-56"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="ml-2 bg-white border rounded-md px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All statuses</option>
              {statusOptions.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order / Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No assigned orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const id = order.id ?? order._id;
                  const prodName =
                    order.products && order.products.length > 0
                      ? order.products[0].name || order.products[0]?.productId?.name || "Product"
                      : "—";
                  const status = order.status || "Assigned";
                  return (
                    <tr key={id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{prodName}</div>
                        <div className="text-xs text-gray-500 mt-1">{id}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-700">{order.customer || order.user || order.email || "Customer"}</div>
                        <div className="text-xs text-gray-400">{order.email || order.phone || ""}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">{order.items ?? (order.products?.length ?? "—")}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">₹{order.total ?? order.totalAmount ?? "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{order.date ?? (order.createdAt ? new Date(order.createdAt).toISOString().split("T")[0] : "—")}</td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${STATUS_BADGE[status] ?? "bg-gray-100 text-gray-800"}`}>
                          <Clock size={12} className="mr-1" />
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            disabled={actionLoadingId === id || status === "Rejected" || status === "Done"}
                            onClick={() => handleReject(order)}
                            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white ${
                              actionLoadingId === id ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                          >
                            <XCircle size={14} className="mr-2" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * PageSize + 1} - {Math.min(page * PageSize, totalItems)} of {totalItems}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center px-2 py-1 rounded-md border bg-white text-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm">
                Page <strong>{page}</strong> / {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center px-2 py-1 rounded-md border bg-white text-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal.open && confirmModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmModal({ open: false, order: null })} />

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-800">Reject Order</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to reject order <span className="font-medium">{confirmModal.order.id ?? confirmModal.order._id}</span>?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmModal({ open: false, order: null })} className="px-4 py-2 rounded-md bg-gray-100">
                Cancel
              </button>

              <button onClick={onConfirmModalConfirm} className="px-4 py-2 rounded-md text-white bg-red-600">
                Yes, reject
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ViewAssignedWorkPageTailor;
