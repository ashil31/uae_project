import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StickyNote, Type, Scissors } from 'lucide-react';

// Mock fetch function (replace with API call)
const fetchSpecialNotes = () => {
    return Promise.resolve([
        { _id: 'order_assigned_1', productName: "Men's Classic Linen Long-Sleeve Shirt", customization: { name: 'J. DOE', embroidery: 'Left Cuff, White Thread' } },
        { _id: 'order_assigned_2', productName: "Men's Emerald Green Linen-Blend Shirt", customization: { name: 'None', embroidery: 'Collar, Gold Thread' } },
        { _id: 'order_assigned_3', productName: "Men's Terry Cloth Zip-Neck Polo Shirt", customization: { name: 'SMITH', embroidery: 'Chest Pocket' } },
    ]);
};

const OrderNoteCard = ({ order, index }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="bg-white p-5 rounded-lg shadow-md border-l-4 border-yellow-400 hover:shadow-lg transition-shadow"
    >
        <h2 className="font-bold text-lg text-gray-800">{order.productName}</h2>
        <div className="mt-4 border-t pt-4 space-y-3">
            <div className="flex items-start space-x-3">
                <Type className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                <div>
                    <p className="text-sm font-semibold text-gray-700">Name to Embroider:</p>
                    <p className={`font-medium ${order.customization.name === 'None' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                        {order.customization.name}
                    </p>
                </div>
            </div>
            <div className="flex items-start space-x-3">
                <Scissors className="text-green-500 flex-shrink-0 mt-1" size={20} />
                <div>
                    <p className="text-sm font-semibold text-gray-700">Embroidery Details:</p>
                    <p className="text-gray-800 font-medium">{order.customization.embroidery}</p>
                </div>
            </div>
        </div>
    </motion.div>
);

const SpecialNotesPage = () => {
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        fetchSpecialNotes().then(data => setNotes(data));
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gray-50 min-h-screen"
        >
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <StickyNote className="text-yellow-500" /> Special Notes for Customization
                </h1>
                {notes.length > 0 ? (
                    <div className="space-y-4">
                        {notes.map((order, index) => (
                            <OrderNoteCard key={order._id} order={order} index={index} />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No special notes assigned.</p>
                )}
            </div>
        </motion.div>
    );
};

export default SpecialNotesPage;
