const crypto = require('crypto'); 
const User = require('../models/User'); 
const {sendEmail} = require('../services/sendEmail'); 

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
    
    try {
        const email = req.body?.email; 

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({
                error: 'A valid email is required'
            }); 
        }
        
        const normalizedEmail = email.trim().toLowerCase(); 

        const response = {
            message: 'If this email has an unverified account, a verification link will be sent.'
        }; 

        const user = await User.findOne({
            Email: normalizedEmail, 
            IsVerified: false
        }); 

        // Do not reveal whether the account exists
        if (!user) {
            return res.status(200).json(response); 
        }

        const token = crypto.randomBytes(32).toString('hex'); 

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        user.EmailVerificationToken = hashedToken; 
        user.EmailVerificationExpires = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        ); 

        await user.save(); 

        const verificationUrl = new URL(
            '/verify-email', 
            process.env.FRONTEND_URL
        ); 

        verificationUrl.searchParams.set('token', token);

        await sendEmail({
            to: user.Email, 
            subject: 'Verify your Internship Tracker account', 
            text: `Please verify your email address: 
        
        ${verificationUrl.toString()}
        
        This link expires in 24 hours.
        
        If you did not request this email, you can ignore it.`
        }); 

        return res.status(200).json(response); 

    } catch (err) {
        next(err); 
    }
}; 

module.exports = {resendVerification}; 