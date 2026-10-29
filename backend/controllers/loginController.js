const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_LIFETIME = process.env.JWT_EXPIRES_IN || '1h';

function createToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set');
    }
    return jwt.sign(
        { sub: user._id.toString(), login: user.Login },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_LIFETIME }
    );
}

// POST api/auth/login
// Body: { login, password }  ("login" can be the username OR the email)
exports.logIn = async (req, res, next) => {
    try {
        const { login, password } = req.body || {};

        if (!login || !password) {
            return res.status(400).json({ error: 'Missing required login fields' });
        }

        // String() + trim() stops objects like {"$ne": ""} from reaching the query
        const identifier = String(login).trim();

        // Password is select:false on the schema, so it has to be requested explicitly
        const user = await User.findOne({
            $or: [{ Login: identifier }, { Email: identifier.toLowerCase() }]
        }).select('+Password');

        // Same message for unknown user and wrong password so accounts can't be guessed
        if (!user || !(await user.checkPassword(String(password)))) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        return res.status(200).json({
            message: 'Login successful',
            token: createToken(user),
            user // toJSON transform in User.js strips the password hash
        });

    } catch (err) {
        next(err);
    }
};

// GET api/auth/me  (requires verifyToken middleware)
exports.getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ user });

    } catch (err) {
        next(err);
    }
};