import express from'express'
const router = express.Router();
import RegisterController from'../../controllers/Auth/RegisterController.js'
import VerifyEmailController from'../../controllers/Auth/verifyEmailController.js'
import { login } from'../../controllers/Auth/LoginController.js'
import LogoutController from'../../controllers/Auth/LogoutController.js'
import loginAdmin from '../../controllers/Auth/LoginAdminController.js';
import { refreshAccessToken } from '../../controllers/Auth/refreshToken.js';
import debugAuth from '../../controllers/Auth/DebugController.js';
import loginTailorController from '../../controllers/Auth/LoginTailorController.js';
import registerTailor from '../../controllers/Tailor/RegisterTailorController.js';

// import bcrypt from 'bcrypt'; 


// app.use('/login', LoginRoute);
router.use('/register', RegisterController);
router.post('/loginAdmin', loginAdmin)
router.use('/verify-email', VerifyEmailController)
router.get('/refresh', refreshAccessToken)
router.post('/refresh', refreshAccessToken)
router.post('/login', login)
router.post('/logout', LogoutController)
router.get('/debug', debugAuth)
router.post('/tailor-login', loginTailorController);
// --- Registration Route ---
// Handles POST requests to /api/auth/tailor-register
router.post('/tailor-register', registerTailor);



// router.get('/hash-password/:password', async (req, res) => {
//     try {
//         const password = req.params.password;
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);
//         res.status(200).json({ originalPassword: password, hashedPassword: hashedPassword });
//     } catch (error) {
//         res.status(500).json({ message: "Error hashing password", error: error.message });
//     }
// });
export default router;