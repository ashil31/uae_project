import User from "../../models/user.js";
import bcrypt from 'bcrypt';

const registerTailor = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email already exists.' });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the new user with the 'Tailor' role by default
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: 'Tailor', // Automatically assign the 'Tailor' role
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Tailor registered successfully. Please log in.',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export default registerTailor;
