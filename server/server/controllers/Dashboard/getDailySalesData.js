import Order from "../../models/order.js";


const getDailySalesData = async(startDate, endDate) => {
    try {
        const dailySalesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    }
                }
            },
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
                    sales: {$sum: 1},
                    revenue: {$sum: '$totalAmount'}
                }
            },
            {
                $sort: {_id: 1}
            }
        ]);

        const dateArray = getDateInRange(startDate, endDate);

        return dateArray.map( date => {
            const foundDate = dailySalesData.find( item => item._id === date );

            return {
                date,
                sales: foundDate?.sales || 0,
                revenue: foundDate?.revenue || 0
            }
        })
    } catch (error) {
        throw error
    }
}


function getDateInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

export default getDailySalesData;