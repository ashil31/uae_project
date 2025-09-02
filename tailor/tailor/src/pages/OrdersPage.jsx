import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';

// Import all necessary thunks
import { fetchUnassignedOrders, fetchAssignedWork, getTailors, assignOrder } from '../features/tailor/tailorSlice';

// Import child components
import UnassignedOrdersList from '../components/Orders/UnassignedOrdersList';
import AssignedOrdersList from '../components/Orders/AssignedOrdersList';
import AssignWorkModal from '../components/Orders/AssignWorkModal';

const OrdersPage = () => {
    const [activeTab, setActiveTab] = useState('unassigned');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const dispatch = useDispatch();
    const { 
        unassignedOrders, 
        assignedWork, 
        tailors, 
        loading, 
        error 
    } = useSelector((state) => state.tailor);

    // Fetch data on component mount
    useEffect(() => {
        dispatch(fetchUnassignedOrders());
        dispatch(fetchAssignedWork());
        dispatch(getTailors());
    }, [dispatch]);

    const handleOpenAssignModal = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    // This function is passed to the modal to handle the assignment
    const handleAssignWork = (tailorId) => {
        if (!selectedOrder) return;
        dispatch(assignOrder({ orderId: selectedOrder._id, tailorId }))
            .then((result) => {
                if (assignOrder.fulfilled.match(result)) {
                    handleCloseModal(); // Close modal on success
                }
            });
    };

    const renderContent = () => {
        if (loading && unassignedOrders.length === 0 && assignedWork.length === 0) {
            return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
        }
        if (error) {
            return <div className="flex justify-center p-10 text-red-600"><AlertTriangle className="h-8 w-8 mr-2" /> Failed to load data.</div>;
        }
        return activeTab === 'unassigned' 
            ? <UnassignedOrdersList orders={unassignedOrders} onAssignClick={handleOpenAssignModal} /> 
            : <AssignedOrdersList orders={assignedWork} />;
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-gray-50 min-h-screen"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
                        <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => setActiveTab('unassigned')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'unassigned' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600'}`}>Unassigned</button>
                            <button onClick={() => setActiveTab('assigned')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'assigned' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600'}`}>Assigned</button>
                        </div>
                    </div>
                    {renderContent()}
                </div>
            </motion.div>
            
            <AssignWorkModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                order={selectedOrder}
                tailors={tailors}
                onAssign={handleAssignWork} // Pass the handler function
                isLoading={loading} // Pass loading state for the button
            />
        </>
    );
};

export default OrdersPage;
