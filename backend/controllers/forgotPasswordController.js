const crypto = require('crypto'); 
const User = require('../models/User'); 
const {sendEmail} = require('../services/sendEmail'); 

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {

        const email = req.body?.email; 

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({
                error: 'A valid email is required'
            }); 
        }

        const normalizedEmail = email.trim().toLowerCase(); 

        const response = {
            message: 'If an account exists with this email, a password reset link will be sent.'
        }; 

        const user = await User.findOne({
            Email: normalizedEmail
        }); 

        // Avoid exposing whether an account exists. 
        if (!user) {
            return res.status(200).json(response); 
        }

        // Generate a secure, random reset token. 
        const token = crypto.randomBytes(32).toString('hex'); 

        // Store only its hash in database
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        // Token expires in 15 minutes
        user.PasswordResetToken = hashedToken; 
        user.PasswordResetExpires = new Date(
            Date.now() + 15 * 60 * 100
        ); 

        await user.save(); 

        // Construct the password reset link
        const resetUrl = new URL(
            '/reset-password', 
            process.env.FRONTEND_URL
        ); 

        resetUrl.searchParams.set('token', token); 

        // Send the reset email
        await sendEmail({
            to: user.Email, 
            subject: 'Reset your SPLINT password', 
            text: `You requested a password reset.
            
Use this link to reset your password: 

${resetUrl.toString()}

This link expires in 15 minutes. 

If you did not request a password reset, you can ignore this email.`
        }); 

        return res.status(200).json(response); 

    } catch (err) {
        next(err); 
    }
}; 

module.exports = {forgotPassword};