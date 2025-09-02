import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion'; // AnimatePresence is good for exit animations
import TailorList from '../components/Tailors/TailorList';
import TailorForm from '../components/Tailors/TailorForm';
import { getTailors } from '../features/tailor/tailorSlice';

const TailorsPage = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    // 1. State to manage the success notification
    const [successMessage, setSuccessMessage] = useState('');

    const dispatch = useDispatch();
    const { tailors, status } = useSelector((state) => state.tailor);

    useEffect(() => {
        if(status === 'idle') {
            dispatch(getTailors());
        }
    }, [status, dispatch]);

    // 2. useEffect to automatically clear the success message after a few seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 4000); // Message will disappear after 4 seconds

            return () => clearTimeout(timer); // Cleanup the timer if component unmounts
        }
    }, [successMessage]);

    /**
     * 3. Handler for when the form is submitted successfully.
     * We expect TailorForm to call this with the name of the new tailor.
     * If called with no argument, it just closes the form.
     */
    const handleFormSubmission = (newTailorName) => {
        setIsFormOpen(false);
        if (newTailorName && typeof newTailorName === 'string') {
            setSuccessMessage(`Tailor "${newTailorName}" was added successfully!`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Manage Tailors</h1>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {isFormOpen ? 'Close Form' : '+ Add New Tailor'}
                </button>
            </div>

            {/* 4. Display the success message when it's set */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
                        className="p-3 mb-4 text-center text-green-800 bg-green-100 border border-green-400 rounded-lg"
                        role="alert"
                    >
                        {successMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {isFormOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden"
                >
                    {/* 5. Pass the new handler to the form component */}
                    <TailorForm onFinished={handleFormSubmission} />
                </motion.div>
            )}

            {status === 'loading' && <p>Loading tailors...</p>}
            {status === 'succeeded' && <TailorList tailors={tailors} />}
            {status === 'failed' && <p className="text-red-500">Failed to load tailors.</p>}
        </motion.div>
    );
};

export default TailorsPage;