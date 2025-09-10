import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Protect routes by verifying the JWT
const protect = async (req, res, next) => {
    let token;
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.SECRET_KEY);

            // Support different token claim names (userId, id, _id)
            const uid = decoded?.userId ?? decoded?.id ?? decoded?._id ?? null;

            if (!uid) return res.status(401).json({ message: 'Not authorized, token missing user id' });

            req.user = await User.findById(uid).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        }
    } catch (error) {
        console.error('protect: token verification error', error && (error.stack ?? error));
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

// Middleware to grant access only to 'Tailor' or 'MasterTailor' roles
const tailor = (req, res, next) => {
    if (req.user && (req.user.role === 'Tailor' || req.user.role === 'MasterTailor')) {
        next(); // User has the correct role, proceed
    } else {
        res.status(403).json({ message: 'Not authorized. Access restricted to tailors.' });
    }
};

export { protect, tailor };
