const Resource = require('../models/Resource'); 

// GET /api/resources
const getResources = async (req, res) => {
    try {

        const {category, q} = req.query; 

        const filter = {}; 

        // Filter by category
        if (category) {
            filter.Category = category; 
        }

        // Search by title or description
        if (q && q.trim()) {
            const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 

            filter.$or = [
                {Title: {$regex: escaped, $options: 'i'}}, 
                {Description: {$regex: escaped, $options: 'i'}}
            ]; 
        }

        const resources = await Resource.find(filter)
            .sort({ Title: 1}); 
        
        return res.status(200).json({
            resources
        }); 

    } catch (error) {
        console.error('Error fetching resouces:', error); 

        return res.status(500).json({
            message: 'Failed to retrieve resources'
        }); 
    }
};

module.exports = {
    getResources
};