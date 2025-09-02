import Coupon from '../../models/coupon.js';

const getCoupon = async(req, res) => {
    try {
        const userId = req.user.userId;
        const coupon = await Coupon.findOne({userId:userId, isActive:true})
        res.status(200).json({
            coupon,
            success: true,
        })
    } catch (error) {
        console.log("Error in getCoupon :",error.message)
        res.status(500).json({message: "Server Error",error:error.message})
    }
}

export default getCoupon;