const User = require('../models/User'); 

// PATCH /api/users/me
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.sub; 

        // Fields users are allowed to modify
        const allowedFields = [
            'FirstName', 
            'LastName', 
            'Login', 
            'Email', 
            'Degree',
            'Major', 
            'GraduationYear'
        ];

        const updates = {}; 

        // Only include fields provided in the request
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
                updates[field] = req.body[field]; 
            }
        }

        // Prevent updates to restricted or unknown fields
        const invalidFields = Object.keys(req.body || {}).filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid profile fields',
                fields: invalidFields
            }); 
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No profile fields provided'
            }); 
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            {$set: updates}, 
            {new: true, runValidators: true}
        ); 

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            }); 
        }

        return res.status(200).json({
            message: 'Profile updated successfully', 
            user
        }); 

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Username or email already exists'
            }); 
        }

        next(err); 
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const userId = req.user.sub; 
        const {currentPassword, newPassword} = req.body || {}; 

        // Validate request
        if (
            typeof currentPassword != 'string' ||
            typeof newPassword != 'string' ||
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            }); 
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters'
            }); 
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                error: 'New password must differ from current password'
            }); 
        }

        // Password is select: false, so explicity retrieve it
        const user = await User.findById(userId).select('+Password'); 

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Verify the existing password
        const isValid = await user.checkPassword(currentPassword); 

        if (!isValid) {
            return res.status(401).json({
                error: 'Current password is incorrect'
            }); 
        }

        // the User.js pre-save middleware hashes this automatically
        user.Password = newPassword; 
        await user.save(); 

        return res.status(200).json({
            message: 'Password changes successfully'
        }); 

    } catch (err) {
        next(err); 
    }
};

const mongoose = require('mongoose'); 
const Application = require('../models/Application'); 
const Contact = require('../models/Contact'); 

exports.deleteProfile = async (req, res, next) => {

    const session = await mongoose.startSession(); 

    try {
        const userId = req.user.sub; 
        const {password} = req.body || {}; 

        if (typeof password !== 'string' || !password) {
            return res.status(400).json({
                error: 'Password is required to delete account'
            }); 
        }

        // Retrieve user, including their password hash
        const user = await User.findById(userId).select('+Password'); 

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Verify password before deleting
        const isValid = await user.checkPassword(password); 

        if (!isValid) {
            return res.status(401).json({
                error: 'Incorrect Password'
            }); 
        }

        // Delete related records and account atomically
        // THIS IS NOT COMPLETED, need to delete Companies and Internships once added
        await session.withTransaction(async () => {
            await Contact.deleteMany(
                {UserId: user._id}, 
                {session}
            ); 

            await Application.deleteMany(
                {UserId: user._id}, 
                {session}
            ); 

            await User.deleteOne(
                {_id: user._id}, 
                {session}
            ); 
        });

        return res.status(200).json({
            message: 'Account and associated records deleted successfully'
        }); 

    } catch (err) {
        next(err); 
    } finally {
        await session.endSession(); 
    }
};