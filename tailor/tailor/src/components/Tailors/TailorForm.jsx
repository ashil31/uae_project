import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { unwrapResult } from '@reduxjs/toolkit'; // 1. Import unwrapResult
import { addTailor } from '../../features/tailor/tailorSlice';

const TailorForm = ({ onFinished }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    
    // 2. Add loading and error states for better UX
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const dispatch = useDispatch();

    // 3. Convert handleSubmit to an async function
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email) return;

        setIsLoading(true);
        setError(null);

        try {
            // 4. Dispatch the action and wait for its promise to resolve
            const resultAction = await dispatch(addTailor({ name, email, phone }));
            const newTailor = unwrapResult(resultAction); // Throws an error if the action was rejected

            // Reset form fields on success
            setName('');
            setEmail('');
            setPhone('');
            
            // 5. Call onFinished with the new tailor's name to notify the parent
            if (onFinished) {
                onFinished(newTailor.name);
            }

        } catch (err) {
            // 6. Catch any errors from the API call and display them
            console.error('Failed to save the tailor:', err);
            setError(err.message || 'Could not save tailor. Please try again.');
        } finally {
            // 7. Always stop the loading state
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800">New Tailor Details</h3>
            
            {/* Display error message if one exists */}
            {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" required/>
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" required/>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" />
                </div>
            </div>
            <div className="flex justify-end pt-2">
                {/* 8. Disable the button during submission */}
                <button 
                    type="submit" 
                    className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Tailor'}
                </button>
            </div>
        </form>
    );
};

export default TailorForm;