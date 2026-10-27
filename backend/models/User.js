const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs'); 

const SALT_ROUNDS = 10; 

const userSchema = new mongoose.Schema(
    {
        FirstName: {
            type: String,
            required: true, 
            trim: true
        },
        LastName: {
            type: String, 
            required: true, 
            trim: true
        },
        Login: {
            type: String, 
            required: true, 
            unique: true, 
            trim: true
        },
        Email: {
            type: String, 
            required: true, 
            unique: true, 
            lowercase: true,
            trim: true
        },
        Password: {
            type: String,
            required: true, 
            select: false
        }, 
        IsVerified: {
            type: Boolean, 
            default: false
        }, 
        Degree: {
            type: String, 
            default: ''
        }, 
        Major: {
            type: String, 
            default: ''
        },
        GraduationYear: {
            type: Number
        }
    },
    {
        collection: 'Users', 
        versionKey: false
    }
);

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('Password')) return; 

    this.Password = await bcrypt.hash(this.Password, SALT_ROUNDS); 
});

// Verify a password during login
userSchema.methods.checkPassword = function (candidate) {
    return bcrypt.compare(candidate, this.Password); 
}; 

// Remove the password hash from JSON response
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.Password; 
        return ret; 
    }
});

module.exports = mongoose.model('User', userSchema); 
