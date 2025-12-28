const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { healthRoutes, uploadRoutes } = require('./routes');
const {
    multerErrorHandler,
    notFoundHandler,
    globalErrorHandler
} = require('./middleware/errorHandler');

// Initialize the Express application
const app = express();

// Configure CORS to allow requests from the frontend
app.use(cors({
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable request logging for development
app.use(morgan('dev'));

// Mount the route handlers
app.use('/', healthRoutes);
app.use('/', uploadRoutes);

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
    console.log(`  Server:      http://localhost:${config.port}`);
    console.log(`  ML Service:  ${config.pythonServiceUrl}`);
    console.log(`  Uploads:     ${config.uploadDir}`);
    console.log('----------------------------------------------------------------');
    console.log('  Endpoints:');
    console.log('    GET  /              - API info');
    console.log('    GET  /api/health    - Health check');
    console.log('    POST /api/upload-plan - Upload and process plan');
    console.log('================================================================');
    console.log('');
});

module.exports = app;
