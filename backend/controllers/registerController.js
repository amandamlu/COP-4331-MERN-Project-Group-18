const crypto = require('crypto'); 
const User = require('../models/User'); 
const {sendEmail} = require('../services/sendEmail');

// POST api/auth/register
exports.register = async (req, res, next) => {
    try {
        // extracting info from the request body
        const {
            firstName, 
            lastName, 
            login, 
            email, 
            password, 
            degree, 
            major, 
            graduationYear
        } = req.body || {}; 

        if (!firstName || !lastName || !login || !password || !email) {
            return res.status(400).json({ error: 'Missing required registration fields' });
        }

        if ((await User.exists({Login: String(login)})) ||
            (await User.exists({Email: String(email)}))) {
            return res.status(409).json({error: 'Username or email already registered'});
        }

        // Verification token for email verification 
        const verificationToken = crypto.randomBytes(32).toString('hex'); 

        const hashedToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');

        const verificationExpires = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        // Creating User
        const user = await User.create({
            FirstName: String(firstName).trim(),
            LastName: String(lastName).trim(), 
            Login: String(login).trim(), 
            Password: String(password), 
            Email: String(email).trim().toLowerCase(), 
            IsVerified: false,
            EmailVerificationToken: hashedToken, 
            EmailVerificationExpires: verificationExpires,
            Degree: String(degree), 
            Major: String(major),
            GraduationYear: graduationYear || undefined
        });

        // Verification email
        const verificationUrl = new URL(
            '/verify-email', 
            process.env.FRONTEND_URL
        ); 

        verificationUrl.searchParams.set('token', verificationToken); 

        await sendEmail({
            to: user.Email, 
            subject: 'Verify your Internship Tracker account', 
            text: `Welcome to Internship Tracker!
            
        Please verify your email address by visiting: 
        
        ${verificationUrl.toString()}
        
        This verification link expires in 24 hours.
        
        If you did not create this account, you can ignore this email.`
        })

        // return the created user
        return res
            .status(201)
            .location(`/api/users/${user._id}`)
            .json({
                message: 'User registered successfully',
                user: {
                    id: user._id, 
                    firstName: user.FirstName, 
                    lastName: user.LastName, 
                    email: user.Email, 
                    isVerified: user.IsVerified
                }
            });

    } catch (err) {
        next(err); 
    }
};