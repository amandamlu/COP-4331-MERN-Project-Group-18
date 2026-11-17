const mongoose = require('mongoose'); 

const RESOURCE_CATEGORIES = [
    'Finding Internships', 
    'Resumes and Applications', 
    'Interview Preparation', 
    'Career Development'
]; 

const resourceSchema = new mongoose.Schema(
    {
        Category: {
            type: String, 
            enum: RESOURCE_CATEGORIES, 
            required: true
        }, 

        Title: {
            type: String, 
            required: true, 
            trim: true
        }, 

        Description: {
            type: String, 
            required: true, 
            trim: true
        }, 

        URL: {
            type: String, 
            required: true, 
            trim: true
        }

    }, 
    
    {
        collection: 'Resources'
    }
);

module.exports = mongoose.model('Resource', resourceSchema); 