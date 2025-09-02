import getAnalyticsData from "./getAnlyticsData.js";
import getDailySalesData from "./getDailySalesData.js";


const dashboardData = async (req, res) => {
    try {
        const analyticsData = await getAnalyticsData();

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); 

        const dailySalesData = await getDailySalesData(startDate, endDate);


        res.status(200).json({
            analyticsData,
            dailySalesData
        })
    } catch (error) {
        console.error('Error retrieving dashboard data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export default dashboardData;