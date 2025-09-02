import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';

// Import the thunks to fetch data
import { fetchUnassignedOrders } from '../features/tailor/tailorSlice'; // Assuming this is the correct slice
import { getTailors } from '../features/tailor/tailorSlice'; // Using the slice from the previous step

import AssignWorkForm from '../components/Work/AssignWorkForm';

const AssignWorkPage = () => {
    const dispatch = useDispatch();
    
    // Select relevant data from the Redux store
    const { 
        unassignedOrders, 
        tailors, 
        loading: ordersLoading, 
        error: ordersError 
    } = useSelector((state) => state.tailor); 

    const { 
        loading: tailorsLoading, 
        error: tailorsError 
    } = useSelector((state) => state.tailor); // Assuming a separate slice for tailors or combine them

    // Fetch data when the component mounts
    useEffect(() => {
        dispatch(fetchUnassignedOrders());
        dispatch(getTailors());
    }, [dispatch]);

    // Consolidate loading and error states
    const isLoading = ordersLoading || tailorsLoading;
    const error = ordersError || tailorsError;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-48 bg-red-50 border border-red-200 rounded-lg p-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-700 font-semibold">Failed to load data</p>
                    <p className="text-red-600 text-sm">{typeof error === 'string' ? error : 'Please try again later.'}</p>
                </div>
            );
        }

        return <AssignWorkForm orders={unassignedOrders} tailors={tailors} />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="p-4 sm:p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Assign Work</h1>
                    <p className="text-sm text-gray-500 mt-1">Select an order and assign it to an available tailor.</p>
                </div>
                
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
                    {renderContent()}
                </div>
            </div>
        </motion.div>
    );
};

export default AssignWorkPage;
