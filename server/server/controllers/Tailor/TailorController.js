import Assignment from '../../models/Assignment.js'; // Assuming you have an Assignment model
import Production from '../../models/Production.js'; // Assuming you have a Production model
import Update from '../../models/Update.js';       // Assuming you have an Update model

// @desc    Get all work assigned to the logged-in tailor
// @route   GET /api/tailors/my-work
// @access  Private (Tailor)
export const getMyAssignedWork = async (req, res) => {
    try {
        // We get the tailor's ID from the authenticated user token
        const tailorId = req.user.userId;

        const assignments = await Assignment.find({ tailor: tailorId })
            .populate('clothRoll') // Populates details from the ClothRoll model
            .sort({ createdAt: -1 });

        if (!assignments) {
            return res.status(404).json({ message: 'No work assigned to you yet.' });
        }

        res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching assigned work:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add a daily production entry
// @route   POST /api/tailors/production
// @access  Private (Tailor)
export const addDailyProduction = async (req, res) => {
    try {
        const { clothesMade, notes } = req.body;
        const tailorId = req.user.userId;

        if (!clothesMade || isNaN(clothesMade)) {
            return res.status(400).json({ message: 'A valid number of clothes made is required.' });
        }

        const newProduction = new Production({
            tailor: tailorId,
            clothesMade: Number(clothesMade),
            notes: notes || '',
        });

        await newProduction.save();

        res.status(201).json({ message: 'Production entry added successfully.', production: newProduction });
    } catch (error) {
        console.error('Error adding production entry:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Send an update to the MasterTailor
// @route   POST /api/tailors/update
// @access  Private (Tailor)
export const sendUpdateToMaster = async (req, res) => {
    try {
        const { message } = req.body;
        const fromTailor = req.user.userId;

        if (!message) {
            return res.status(400).json({ message: 'Update message cannot be empty.' });
        }

        const newUpdate = new Update({
            from: fromTailor,
            message: message,
            // You might want to specify a 'to' field if you have multiple MasterTailors
        });

        await newUpdate.save();

        res.status(201).json({ message: 'Update sent successfully.', update: newUpdate });
    } catch (error) {
        console.error('Error sending update:', error);
        res.status(500).json({ message: 'Server error' });
    }
};