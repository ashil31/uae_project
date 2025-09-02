import React, { useState, useEffect } from 'react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import EditModal from '../components/EditModal';
import adminApi from '../services/adminApi';

// Contact Edit Modal Component
const ContactEditModal = ({ isOpen, onClose, contact, onSave }) => {
  const [formData, setFormData] = useState({
    status: contact?.status || 'pending',
    priority: contact?.priority || 'medium',
    adminNotes: contact?.adminNotes || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        status: contact.status || 'pending',
        priority: contact.priority || 'medium',
        adminNotes: contact.adminNotes || ''
      });
    }
  }, [contact]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSave(contact._id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Contact"
      onSave={handleSubmit}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
          <textarea
            value={formData.adminNotes}
            onChange={(e) => handleChange('adminNotes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any admin notes here..."
          />
        </div>
      </div>
    </EditModal>
  );
};

const ContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalContacts: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    subject: '',
    priority: '',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [stats, setStats] = useState({});
  const [selectedContact, setSelectedContact] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllContacts(filters);
      setContacts(response.data.contacts);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Fetch contact statistics
  const fetchStats = async () => {
    try {
      const response = await adminApi.getContactStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch contact stats:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle contact update
  const handleUpdateContact = async (id, updateData) => {
    try {
      await adminApi.updateContact(id, updateData);
      fetchContacts();
      setShowEditModal(false);
      setSelectedContact(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle contact delete
  const handleDeleteContact = async (id) => {
    try {
      await adminApi.deleteContact(id);
      fetchContacts();
      setShowDeleteModal(false);
      setSelectedContact(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Table headers for AdminTable
  const headers = ['Name', 'Subject', 'Status', 'Priority', 'Date'];

  // Transform contacts data for AdminTable
  const transformedContacts = contacts.map(contact => {
    // Store original contact data in a way that preserves it
    const transformedContact = {
      ...contact,
      // Store original contact for actions
      _originalContact: contact,
      name: (
        <div>
          <div className="font-medium text-gray-900">{contact.name}</div>
          <div className="text-sm text-gray-500">{contact.email}</div>
        </div>
      ),
      subject: <span className="capitalize">{contact.subject.replace('-', ' ')}</span>,
      status: (
        <StatusBadge 
          status={contact.status} 
          className={getStatusColor(contact.status)}
        />
      ),
      priority: (
        <StatusBadge 
          status={contact.priority} 
          className={getPriorityColor(contact.priority)}
        />
      ),
      date: (
        <div className="text-sm text-gray-900">
          {new Date(contact.createdAt).toLocaleDateString()}
        </div>
      )
    };
    return transformedContact;
  });

  // Actions function for AdminTable
  const getActions = (transformedContact) => {
    // Get the original contact data
    const originalContact = transformedContact._originalContact || transformedContact;
    
    return [
      <button
        key="view"
        onClick={() => {
          console.log('View contact:', originalContact);
          setSelectedContact(originalContact);
          setShowViewModal(true);
        }}
        className="text-blue-600 hover:text-blue-900 text-sm"
      >
        View
      </button>,
      <button
        key="edit"
        onClick={() => {
          console.log('Edit contact:', originalContact);
          setSelectedContact(originalContact);
          setShowEditModal(true);
        }}
        className="text-indigo-600 hover:text-indigo-900 text-sm"
      >
        Edit
      </button>,
      <button
        key="delete"
        onClick={() => {
          console.log('Delete contact:', originalContact);
          setSelectedContact(originalContact);
          setShowDeleteModal(true);
        }}
        className="text-red-600 hover:text-red-900 text-sm"
      >
        Delete
      </button>
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contact Management</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Contacts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview?.totalContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview?.pendingContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Resolved
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview?.resolvedContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Urgent
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview?.urgentContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Subjects</option>
                <option value="general">General</option>
                <option value="wholesale">Wholesale</option>
                <option value="returns">Returns</option>
                <option value="complaint">Complaint</option>
                <option value="product">Product</option>
                <option value="order">Order</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white shadow rounded-lg">
          <AdminTable
            headers={headers}
            data={transformedContacts}
            actions={getActions}
            isLoading={loading}
            emptyMessage={error || "No contacts found"}
          />
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                  {Math.min(pagination.currentPage * filters.limit, pagination.totalContacts)} of{' '}
                  {pagination.totalContacts} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Contact Modal */}
        {showViewModal && selectedContact && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedContact.subject.replace('-', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <StatusBadge 
                        status={selectedContact.status} 
                        className={getStatusColor(selectedContact.status)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <StatusBadge 
                        status={selectedContact.priority} 
                        className={getPriorityColor(selectedContact.priority)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedContact.message}</p>
                  </div>
                  
                  {selectedContact.adminNotes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedContact.adminNotes}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedContact.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {selectedContact.resolvedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Resolved At</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedContact.resolvedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {showEditModal && selectedContact && (
          <ContactEditModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            contact={selectedContact}
            onSave={handleUpdateContact}
          />
        )}

        {/* Delete Contact Modal */}
        {showDeleteModal && selectedContact && (
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => handleDeleteContact(selectedContact._id)}
            title="Delete Contact"
            message={`Are you sure you want to delete the contact from ${selectedContact.name}? This action cannot be undone.`}
          />
        )}
    </div>
  );
};

export default ContactManager;