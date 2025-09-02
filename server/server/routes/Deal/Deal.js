import express from 'express';
import AdminRoute from '../../middlewares/AdminRoute.js'
import addDeal from '../../controllers/Deal/addDeal.js';
import getDeals from '../../controllers/Deal/getDeals.js';
import updateDeal from '../../controllers/Deal/updateDeal.js';
import deleteDeal from '../../controllers/Deal/deleteDeal.js';


const router = express.Router();

router.get('/getDeals', getDeals)
router.post('/addDeal', AdminRoute, addDeal)
router.patch('/:id', AdminRoute, updateDeal)
router.delete('/:id', AdminRoute, deleteDeal)


export default router