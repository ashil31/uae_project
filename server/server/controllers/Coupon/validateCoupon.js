import Coupon from "../../models/coupon.js";

const validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const { userId } = req.user

        const coupon = await Coupon.findOne({ code:code, userId:userId, isActive:true });

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        if(coupon.expirationDate < Date.now()) {
            coupon.isActive = false;
            await coupon.save();
            return res.status(400).json({ message: "Coupon has expired" });
        }

        return res.status(200).json({ 
            message: "Coupon is valid", 
            coupon 
        });
    } catch (error) {
        console.log("Error in validateCoupon :", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

export default validateCoupon; 