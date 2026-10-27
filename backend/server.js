const express = require("express"); 
const cors = require("cors"); 
require("dotenv").config(); 

const connectDB = require("./config/db"); 

// Initialize Express
const app = express(); 

// Middleware 
app.use(cors()); 
app.use(express.json()); 

// Test Endpoint 
app.get("/api/ping", (req, res) => {
    res.status(200).json({message: "Hello World"}); 
});

// Server Configuration
const PORT = process.env.PORT || 5000; 

async function startServer() {
    await connectDB(); 

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`); 
    });
}

startServer(); 

