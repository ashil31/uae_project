import Contact from '../../models/contact.js';
import mongoose from 'mongoose';

// Create a new contact submission (Public endpoint)
export const createContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, subject, and message are required fields'
            });
        }

        // Create new contact
        const newContact = new Contact({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : '',
            subject,
            message: message.trim()
        });

        const savedContact = await newContact.save();

        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully. We will get back to you soon!',
            data: {
                id: savedContact._id,
                name: savedContact.name,
                email: savedContact.email,
                subject: savedContact.subject,
                createdAt: savedContact.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
};

// Get all contacts (Admin only)
export const getAllContacts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const subject = req.query.subject;
        const priority = req.query.priority;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (subject) filter.subject = subject;
        if (priority) filter.priority = priority;

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get contacts with pagination and filtering
        const contacts = await Contact.find(filter)
            .populate('resolvedBy', 'firstName lastName email')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalContacts = await Contact.countDocuments(filter);
        const totalPages = Math.ceil(totalContacts / limit);

        // Get status counts for dashboard
        const statusCounts = await Contact.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                contacts,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalContacts,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                statusCounts: statusCounts.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get single contact by ID (Admin only)
export const getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID'
            });
        }

        const contact = await Contact.findById(id)
            .populate('resolvedBy', 'firstName lastName email');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contact
        });

    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update contact status and add admin notes (Admin only)
export const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, adminNotes } = req.body;
        const adminId = req.user?.userId || req.user?.id; // Handle both middleware formats

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID'
            });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

        // If status is being changed to resolved, add resolved timestamp and admin
        if (status === 'resolved') {
            updateData.resolvedAt = new Date();
            if (adminId) updateData.resolvedBy = adminId;
        }

        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('resolvedBy', 'firstName lastName email');

        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            data: updatedContact
        });

    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete contact (Admin only)
export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID'
            });
        }

        const deletedContact = await Contact.findByIdAndDelete(id);

        if (!deletedContact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get contact statistics (Admin only)
export const getContactStats = async (req, res) => {
    try {
        const stats = await Contact.aggregate([
            {
                $group: {
                    _id: null,
                    totalContacts: { $sum: 1 },
                    pendingContacts: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    resolvedContacts: {
                        $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                    },
                    urgentContacts: {
                        $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Get contacts by subject
        const subjectStats = await Contact.aggregate([
            { $group: { _id: '$subject', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get recent contacts (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentContacts = await Contact.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalContacts: 0,
                    pendingContacts: 0,
                    resolvedContacts: 0,
                    urgentContacts: 0
                },
                subjectBreakdown: subjectStats,
                recentContacts
            }
        });

    } catch (error) {
        console.error('Error fetching contact stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};