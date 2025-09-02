import express from 'express'
const router = express.Router()
import bcrypt from 'bcrypt'
import User from '../../models/user.js'
import admin from '../../firebase/firebase-admin.js'


router.post('/', async( req, res ) => {
    try {
        const { firstName, lastName, email, phone, password, firebaseUid, emailVerified } = req.body;

        // Verify Firebase user exists
        const firebaseUser = await admin.auth().getUser(firebaseUid);
        if (firebaseUser.email !== email) {
            return res.status(400).json({ error: 'Email mismatch' });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            console.log(existingUser);
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const username = email.replace("@gmail.com",'')
        const salt = await bcrypt.genSalt(12);
        const hashPassword = await bcrypt.hash(password, salt);
        
        

        const userData = {
            username,
            email,
            firstName,
            lastName,
            password: hashPassword,
            phone,
            firebaseUid,
            isEmailVerified: emailVerified,
        }
        const response = await User.create(userData)

        return res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            customerId: response.customerId // Return the generated customerId
        })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
})

export default router;