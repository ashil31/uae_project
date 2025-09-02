import User from "../../models/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const loginTailorController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User Not Found' });
        }

        // --- Role Verification Logic ---
        // Check if the user's role is either 'MasterTailor' or 'Tailor'.
        const allowedRoles = ['MasterTailor', 'Tailor'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. User is not a MasterTailor or Tailor.' 
            });
        }
        // --- End of Role Verification ---

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const data = {
            username: user.username,
            email: user.email,
            userId: user._id,
            role: user.role,
        };

        const token = jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '7h' });

        return res.status(200).json({
            success: true,
            message: 'Login Successful',
            token,
            role: user.role,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

export default loginTailorController;
