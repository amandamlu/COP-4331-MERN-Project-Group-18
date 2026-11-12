const mongoose = require('mongoose'); 

const compensationSchema = new mongoose.Schema(
    {
        HourlyPay: Number, 
        HousingStipend: Number, 
        RelocationBonus: Number, 
        SignOnBonus: Number, 
    }, 
    {_id: false}
); 

const offerContactsSchema = new mongoose.Schema(
    {
        HiringManager: mongoose.Schema.Types.Mixed, 
        RecruiterEmail: String, 
        RecruiterName: String,
    }, 
    {_id: false}
); 

const offerDatesSchema = new mongoose.Schema(
    {
        EndDate: Date, 
        OfferDate: Date, 
        ResponseDate: Date, 
        StartDate: Date,
    }, 
    {_id: false}
);

const documentSchema = new mongoose.Schema(
    {
        DocumentType: String, 
        FileName: String, 
        FilePath: String, 
        UploadedAt: Date, 
    }, 
    {_id: false}
); 

const requirementsSchema = new mongoose.Schema(
    {
        BackgroundCheck: Boolean, 
        DrugScreen: Boolean, 
        ExportControl: Boolean, 
        GPARequirement: Number, 
        SecurityClearance: Boolean,
    }, 
    {_id: false}
); 


// Main internship offer schema
const internshipOfferSchema = new mongoose.Schema (
    {
        UserId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: [true, 'UserId is required'], 
            index: true,
        }, 

        ApplicationId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Application',
            required: [true, 'ApplicationId is required'],
            index: true,
        },

        CompanyId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Company', 
            index: true
        },

        Company: {
            type: String, 
            trim: true, 
        },

        RoleTitle: {
            type: String, 
            trim: true, 
        }, 

        OfferStatus: {
            type: String, 
            trim: true, 
        }, 

        Location: {
            type: String, 
            trim: true, 
        },

        Compensation: compensationSchema, 
        Contacts: offerContactsSchema, 
        Dates: offerDatesSchema, 
        Documents: [documentSchema], 
        Requirements: requirementsSchema, 

        MigratedAt: {
            type: Date,
        }, 
    }, 

    {
        collection: 'Internship_offers', 
        versionKey: false, 

        timestamps: {
            createdAt: 'CreatedAt', 
            updatedAt: 'LastUpdated',
        }, 
    }
); 

module.exports = mongoose.model(
    'InternshipOffer', 
    internshipOfferSchema 
); 