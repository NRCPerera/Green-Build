/**
 * MongoDB Database Connection Configuration
 * 
 * This module handles the connection to MongoDB using Mongoose.
 * It includes connection event handlers and graceful shutdown handling.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenbuild';

        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        const conn = await mongoose.connect(mongoURI, options);

        console.log(`  MongoDB Connected: ${conn.connection.host}`);
        console.log(`  Database: ${conn.connection.name}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

        // Graceful shutdown handling
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

        return conn;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        // Exit process with failure in production, continue in development
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        return null;
    }
};

module.exports = connectDB;
