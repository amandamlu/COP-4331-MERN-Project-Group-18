const express = require("express"); 
const cors = require("cors"); 
require("dotenv").config(); 

const {notFound, errorHandler} = require('./middleware/errorHandler'); 

const connectDB = require("./config/db"); 

// Import registration routes
const registerRoutes = require("./routes/register"); 

// Initialize Express
const app = express(); 

// Middleware 
app.use(cors()); 
app.use(express.json()); 

////// API Routes /////////////
// Registration Endpoint
app.use("/api/auth/register", registerRoutes); 

// Test Endpoint 
app.get("/api/ping", (req, res) => {
    res.status(200).json({message: "Hello World"}); 
});

// Error Handling
app.use(notFound); 
app.use(errorHandler); 

// Server Configuration
const PORT = process.env.PORT || 5000; 

async function startServer() {
    await connectDB(); 

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`); 
    });
}

startServer(); 

