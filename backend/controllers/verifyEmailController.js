const crypto = require('crypto'); 
const User = require('../models/User'); 

// GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res, next) => {
    try {
        const {token} = req.query; 

        if (typeof token !== 'string' ||
            !/^[a-f0-9]{64}$/.test(token)) {
            
            return res.status(400).json({
                error: 'Invalid verification token'
            }); 

        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex'); 

        const user = await User.findOneAndUpdate(
            {
                EmailVerificationToken: hashedToken, 
                EmailVerificationExpires: {$gt: new Date() }, 
                IsVerified: false
            }, 
            {
                $set: {IsVerified: true}, 
                $unset: {
                    EmailVerificationToken: '', 
                    EmailVerificationExpires: ''
                }
            }, 
            {new: true}
        ); 

        if (!user) {
            return res.status(400).json({
                error: 'Verification link is invalid or expired'
            });
        }

        return res.status(200).json({
            message: 'Email verified successfully'
        }); 
    } catch (err) {
        next(err); 
    }
};

module.exports = {verifyEmail};