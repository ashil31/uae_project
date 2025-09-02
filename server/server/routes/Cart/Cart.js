import express from 'express';
import getCart from '../../controllers/Cart/getCart.js';
import addToCart from '../../controllers/Cart/addToCart.js';
import updateCart from '../../controllers/Cart/updateCart.js';
import deleteCartItem from '../../controllers/Cart/deleteCartItem.js'
import ProtectRoute from '../../middlewares/ProtectRoute.js';
import deleteCart from '../../controllers/Cart/deleteCart.js';

const router = express.Router();


router.get('/getCart', ProtectRoute, getCart);
router.post('/addToCart', ProtectRoute, addToCart);
router.put('/:id', ProtectRoute, updateCart);
router.delete('/clearCart', ProtectRoute, deleteCart);  
router.delete('/:id', ProtectRoute, deleteCartItem);


export default router;