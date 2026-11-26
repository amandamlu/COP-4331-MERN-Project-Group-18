const crypto = require('crypto'); 
const User = require('../models/User'); 

// POST: /api/auth/reset-password
const resetPassword = async (req, res, next) => {
    
    try {
        
        const {token, newPassword} = req.body || {};

        // Validate the token and new password
        if (typeof token !== 'string' ||
            !/^[a-f0-9]{64}$/.test(token) ||
            typeof newPassword !== 'string' ||
            newPassword.length < 8) {
                
            return res.status(400).json({
                error: 'Invalid token or password. Password must be at least 8 characters.'
            }); 
        }

        // Hash the token provided by the user
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex'); 

        // Find a user with a matching, unexpired token
        const user = await User.findOne({
            PasswordResetToken: hashedToken, 
            PasswordResetExpires: {$gt: new Date()}
        }); 

        if (!user) {
            return res.status(400).json({
                error: 'Password reset link is invalid or expired'
            }); 
        }

        // Update the password
        user.Password = newPassword; 

        // Invalidate the reset token
        user.PasswordResetToken = undefined; 
        user.PasswordResetExpires = undefined; 

        // Triggers the existing bcrypt pre-save hook
        await user.save(); 

        return res.status(200).json({
            message: 'Password reset successfully'
        }); 
        
    } catch (err) {
        next(err); 
    }
}; 

module.exports = {resetPassword}; 