import express from 'express'
const router = express.Router()
import User from '../../models/user.js'
import admin from '../../firebase/firebase-admin.js'


router.post('/', async (req, res) => {
  try {
    const { uid } = req.body;
    
    // 1. Verify with Firebase
    console.log(uid)
    const firebaseUser = await admin.auth().getUser(uid);
    if (!firebaseUser.emailVerified) {
      return res.json({ success: false, message: 'Email not verified' });
    }

    // 2. Update user in database
    await User.findOneAndUpdate(
      { firebaseUid: uid },
      { 
        isEmailVerified: true,
        verifiedAt: new Date() 
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false });
  }
});

export default router;