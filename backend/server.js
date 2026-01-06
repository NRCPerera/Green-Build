const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { healthRoutes, uploadRoutes, costPredictionRoutes, sustainabilityRoutes } = require('./routes');
const connectDB = require('./config/database');
const { healthRoutes, uploadRoutes, costPredictionRoutes, authRoutes, projectRoutes, floorPlanRoutes, boqRoutes } = require('./routes');
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
app.use('/', sustainabilityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/floorplans', floorPlanRoutes);
app.use('/api/projects/:projectId/boq-reports', boqRoutes);

// Error handling middleware should be registered last
app.use(multerErrorHandler);
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start the server and display startup information
app.listen(config.port, () => {
    console.log('');
    console.log('================================================================');
    console.log('         Green Build Backend Server Started                     ');
    console.log('================================================================');
    console.log(`  Server:              http://localhost:${config.port}`);
    console.log(`  ML Service:          ${config.pythonServiceUrl}`);
    console.log(`  Cost ML Service:     ${config.costMlServiceUrl}`);
    console.log(`  Sustainability ML:   http://localhost:8003`);
    console.log(`  Uploads:             ${config.uploadDir}`);
    console.log('----------------------------------------------------------------');
    console.log('  Endpoints:');
    console.log('    GET  /                              - API info');
    console.log('    GET  /api/health                    - Health check');
    console.log('    POST /api/upload-plan               - Upload floor plan');
    console.log('    POST /api/predict-cost-overrun      - Cost overrun prediction');
    console.log('    POST /api/sustainability/analyze    - Full sustainability analysis');
    console.log('    POST /api/sustainability/predict-score    - Sustainability score');
    console.log('    POST /api/sustainability/predict-lifecycle - Lifecycle cost');
    console.log('    POST /api/sustainability/predict-risk     - Risk prediction');
    console.log('================================================================');
    console.log('');
});
// Start the server with database connection
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start listening for requests
        app.listen(config.port, () => {
            console.log('');
            console.log('================================================================');
            console.log('         Green Build Backend Server Started                     ');
            console.log('================================================================');
            console.log(`  Server:          http://localhost:${config.port}`);
            console.log(`  ML Service:      ${config.pythonServiceUrl}`);
            console.log(`  Cost ML Service: ${config.costMlServiceUrl}`);
            console.log(`  Uploads:         ${config.uploadDir}`);
            console.log('----------------------------------------------------------------');
            console.log('  Endpoints:');
            console.log('    GET  /                        - API info');
            console.log('    GET  /api/health              - Health check');
            console.log('    POST /api/upload-plan         - Upload and process plan');
            console.log('    POST /api/predict-cost-overrun - Predict cost overrun');
            console.log('    GET  /api/cost-ml-health      - Cost ML service health');
            console.log('  Authentication:');
            console.log('    POST /api/auth/register       - Register new user');
            console.log('    POST /api/auth/login          - Login user');
            console.log('    GET  /api/auth/profile        - Get user profile');
            console.log('  Projects:');
            console.log('    GET  /api/projects            - List user projects');
            console.log('    POST /api/projects            - Create project');
            console.log('    GET  /api/projects/:id        - Get project details');
            console.log('  Floor Plans:');
            console.log('    POST /api/projects/:id/floorplans  - Upload floor plan');
            console.log('    GET  /api/projects/:id/floorplans  - List floor plans');
            console.log('  BOQ Reports:');
            console.log('    GET  /api/projects/:id/boq-reports - List BOQ reports');
            console.log('    GET  /api/projects/:id/boq-reports/:id - Get BOQ details');
            console.log('================================================================');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;

