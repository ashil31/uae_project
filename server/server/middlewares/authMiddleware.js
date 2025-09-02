import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Protect routes by verifying the JWT
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using your secret key
            const decoded = jwt.verify(token, process.env.SECRET_KEY);

            // Get the user from the database using the ID in the token
            // Attach the user to the request object, excluding the password
            req.user = await User.findById(decoded.userId).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next(); // Proceed to the next middleware or controller
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
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
