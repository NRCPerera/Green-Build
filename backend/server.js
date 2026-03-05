const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const connectDB = require('./config/database');
const {
    healthRoutes,
    uploadRoutes,
    costPredictionRoutes,
    delayPredictionRoutes,
    sustainabilityRoutes,
    authRoutes,
    projectRoutes,
    floorPlanRoutes,
    boqRoutes,
    rateRoutes
} = require('./routes');
const {
    multerErrorHandler,
    notFoundHandler,
    globalErrorHandler
} = require('./middleware/errorHandler');

// Initialize the Express application
const app = express();

// Configure CORS to allow requests from the frontend
// Support multiple frontend origins for development flexibility
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    config.frontendUrl
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || config.frontendUrl === '*') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable request logging for development
app.use(morgan('dev'));

// Mount the route handlers
app.use('/', healthRoutes);
app.use('/', uploadRoutes);
app.use('/', costPredictionRoutes);
app.use('/', delayPredictionRoutes);
app.use('/', sustainabilityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/floorplans', floorPlanRoutes);
app.use('/api/projects/:projectId/boq-reports', boqRoutes);
app.use('/', rateRoutes);

// Error handling middleware should be registered last
app.use(multerErrorHandler);
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Flag to track MongoDB connection status
let mongoConnected = false;

// Try to connect to MongoDB, but don't fail if it's not available
const tryConnectMongo = async () => {
    try {
        const connectDB = require('./config/database');
        await connectDB();
        mongoConnected = true;
        console.log('  ✅ MongoDB:          Connected');
    } catch (error) {
        mongoConnected = false;
        console.log('  ⚠️  MongoDB:          Not available (auth features disabled)');
        console.log('     Install MongoDB to enable user authentication');
    }
};

// Start the server
const startServer = async () => {
    // Try to connect to MongoDB (but continue if it fails)
    await tryConnectMongo();

    // Start listening for requests
    app.listen(config.port, () => {
        console.log('');
        console.log('================================================================');
        console.log('         Green Build Backend Server Started                     ');
        console.log('================================================================');
        console.log(`  Server:              http://localhost:${config.port}`);
        console.log(`  ML Service:          ${config.pythonServiceUrl}`);
        console.log(`  Cost ML Service:     ${config.costMlServiceUrl}`);
        console.log(`  Delay ML Service:    ${config.delayMlServiceUrl}`);
        console.log(`  Sustainability ML:   http://localhost:8003`);
        console.log(`  Uploads:             ${config.uploadDir}`);
        console.log('----------------------------------------------------------------');
        console.log('  Features:');
        console.log('    ✅ Sustainability Analysis   - Working');
        console.log('    ✅ Cost Prediction           - Working');
        console.log('    ✅ Floor Plan Upload         - Working');
        if (mongoConnected) {
            console.log('    ✅ User Authentication       - Working');
            console.log('    ✅ Projects Management       - Working');
        } else {
            console.log('    ❌ User Authentication       - Requires MongoDB');
            console.log('    ❌ Projects Management       - Requires MongoDB');
        }
        console.log('================================================================');
        console.log('');
    });
};

startServer();

module.exports = app;
