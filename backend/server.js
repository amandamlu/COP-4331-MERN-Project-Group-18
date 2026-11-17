const express = require("express"); 
const cors = require("cors"); 
require("dotenv").config(); 

const {notFound, errorHandler} = require('./middleware/errorHandler'); 

const connectDB = require("./config/db"); 

// Import registration routes
const registerRoutes = require("./routes/register"); 
const emailWebhookRoutes = require('./routes/emailWebhook');
const emailRoutes = require('./routes/email');

// Initialize Express
const app = express(); 

// Middleware 
app.use(cors()); 
// Resend signs the raw request body, so mount its webhook before the JSON parser.
app.use('/api/email/webhook', emailWebhookRoutes);
app.use(express.json()); 

////// API Routes /////////////
app.use('/api/email', emailRoutes);
// Registration Endpoint
app.use("/api/auth/register", registerRoutes); 

// Test Endpoint 
app.get("/api/ping", (req, res) => {
    res.status(200).json({message: "Hello World"}); 
});

// with the other route imports
const logInRoutes = require("./routes/login");

// user Route
const userRoutes = require('./routes/userProfile');

// application route
const applicationRoutes = require('./routes/application');

// dashboard route
const dashboardRoutes = require('./routes/dashboard');

// All contacts route
const allContactsRoutes = require('./routes/allContacts'); 

// under the registration endpoint
app.use("/api/auth", logInRoutes);

app.use("/api/users", userRoutes); 

app.use("/api/applications", applicationRoutes); 

app.use("/api/dashboard", dashboardRoutes); 

app.use('/api/contacts', allContactsRoutes); 

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

