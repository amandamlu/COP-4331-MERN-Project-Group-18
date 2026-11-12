const mongoose = require('mongoose'); 

const companySchema = new mongoose.Schema(
    {
        UserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId is required'],
            index: true, 
        }, 

        CompanyName: {
            type: String, 
            required: [true, 'Name is required'],
            trim: true,
        }, 

        Industry: {
            type: String, 
            trim: true,
        },

        Website: {
            type: String, 
            trim: true,
        }, 
    },

    {
        collection: 'Companies', 
        versionKey: false, 

        timestamps: {
            createdAt: 'CreatedAt', 
            updatedAt: 'LastUpdated'
        }, 
    }
);

// Prevents duplicate company names for the same user 
companySchema.index(
    {UserId: 1, CompanyName: 1}, 
    {unique: true}
); 

module.exports = mongoose.model('Company', companySchema);