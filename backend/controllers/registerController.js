const User = require('../models/User'); 

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

        // Creating User
        const user = await User.create({
            FirstName: String(firstName).trim(),
            LastName: String(lastName).trim(), 
            Login: String(login).trim(), 
            Password: String(password), 
            Email: String(email).trim().toLowerCase(), 
            IsVerified: false,
            Degree: String(degree), 
            Major: String(major),
            GraduationYear: graduationYear || undefined
        });

        // return the created user
        return res
            .status(201)
            .location(`/api/users/${user._id}`)
            .json({
                message: 'User registered successfully',
                user
            });

    } catch (err) {
        next(err); 
    }
};