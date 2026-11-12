const Contact = require('../models/Contact'); 

// GET /api/dashboard/followups
exports.getUpcomingFollowUps = async (req, res) => {
    try {
        const userId = req.user.id; 

        // Current date in YYYY-MM-DD format (UTC)
        const today = new Date().toISOString().slice(0, 10); 

        const followUps = await Contact.find({
            UserId: userId, 
            NextFollowUp: {$gte: today}
        })
            .sort({NextFollowUp: 1, _id: 1})
            .limit(5);

        return res.status(200).json({
            data: followUps, 
            count: followUps.length
        }); 

    } catch (err) {
        console.error('getUpcomingFollowUps error:', err); 

        return res.status(500).json({
            error: 'Server error.'
        });
    }
};