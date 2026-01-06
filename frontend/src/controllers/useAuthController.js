import { useState, useCallback } from 'react';
import useAuthStore from '../models/useAuthStore';
import { authApi } from '../services/authService';

const useAuthController = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const {
        user,
        isAuthenticated,
        setAuth,
        setUser,
        logout: storeLogout,
        clearError
    } = useAuthStore();

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.login({ email, password });

            if (response.success) {
                setAuth(response.data.user, response.data.token);
                return { success: true, user: response.data.user };
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setAuth]);

    const register = useCallback(async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.register(userData);

            if (response.success) {
                setAuth(response.data.user, response.data.token);
                return { success: true, user: response.data.user };
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setAuth]);

    const logout = useCallback(() => {
        storeLogout();
    }, [storeLogout]);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authApi.getProfile();
            if (response.success) {
                setUser(response.data.user);
                return { success: true, user: response.data.user };
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
        return { success: false };
    }, [setUser]);

    const updateProfile = useCallback(async (profileData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.updateProfile(profileData);

            if (response.success) {
                setUser(response.data.user);
                return { success: true, user: response.data.user };
            } else {
                throw new Error(response.message || 'Update failed');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Update failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setUser]);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.changePassword({ currentPassword, newPassword });

            if (response.success) {
                return { success: true };
            } else {
                throw new Error(response.message || 'Password change failed');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Password change failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    const verifyToken = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return false;

        try {
            const response = await authApi.verifyToken();
            if (response.success) {
                setUser(response.data.user);
                return true;
            }
        } catch (err) {
            storeLogout();
        }
        return false;
    }, [setUser, storeLogout]);

    return {
        user,
        isAuthenticated,
        loading,
        error,
        login,
        register,
        logout,
        fetchProfile,
        updateProfile,
        changePassword,
        verifyToken,
        clearError: () => {
            setError(null);
            clearError();
        }
    };
};

export default useAuthController;
