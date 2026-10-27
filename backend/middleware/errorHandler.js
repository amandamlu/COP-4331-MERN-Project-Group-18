// 404 for any request that didn't match a route
exports.notFound = (req, res) => {
    res.status(404).json({error: `Route not found: ${req.method} ${req.originalUrl}`}); 
}; 

// Central Error Handler
// Controllers call next(err) and will decide the status code
exports.errorHandler = (err, req, res, next) => {
    // Malformed JSON body from express.json()
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({error: 'Request body is not valid JSON'});
    }

    // Mongoose schema validation or type casting failures
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({error: err.message}); 
    }

    // Unique index violation (ex. two simultaneous registrations)
    if (err.code === 11000) {
        return res.status(409).json({error: 'Resource already exists'}); 
    }

    console.error(err); 
    res.status(500).json({error: 'Internal server error'}); 
};