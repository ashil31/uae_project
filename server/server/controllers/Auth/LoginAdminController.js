import User from "../../models/user.js";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const loginAdmin = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User Not Found' });
        }

        console.log(user)
        if (role && user.role !== role) {
            return res.status(403).json({ success: false, message: 'Invalid role for this user' });
        }

        const isMatch = bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        const data = {
            username: user.username,
            email: email.split("@")[0],
            userId: user._id,
            role: user.role,
        };

        const token = jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '7h' });

        return res.status(200).json({
            success: true,
            message: 'User Found',
            token,
            role: user.role,
            user: user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

export default loginAdmin