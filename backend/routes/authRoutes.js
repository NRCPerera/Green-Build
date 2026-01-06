/**
 * Authentication Routes
 * 
 * Handles all authentication-related endpoints including
 * registration, login, profile, and user management.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ==================== Public Routes ====================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', authController.login);

// ==================== Protected Routes ====================

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

// ==================== Admin Routes ====================

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (paginated)
 * @access  Admin only
 */
router.get('/users', authenticate, authorize('admin'), authController.getAllUsers);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update a user by ID
 * @access  Admin only
 */
router.put('/users/:id', authenticate, authorize('admin'), authController.updateUser);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete a user by ID
 * @access  Admin only
 */
router.delete('/users/:id', authenticate, authorize('admin'), authController.deleteUser);

// ==================== Token Verification ====================

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is valid
 * @access  Private
 */
router.get('/verify', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid.',
        data: {
            user: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            }
        }
    });
});

module.exports = router;
