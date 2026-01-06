import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            setAuth: (user, token) => {
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    error: null
                });
                localStorage.setItem('authToken', token);
            },

            setUser: (user) => {
                set({ user });
            },

            setLoading: (isLoading) => {
                set({ isLoading });
            },

            setError: (error) => {
                set({ error, isLoading: false });
            },

            clearError: () => {
                set({ error: null });
            },

            logout: () => {
                localStorage.removeItem('authToken');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            checkAuth: () => {
                const token = localStorage.getItem('authToken');
                if (token && get().user) {
                    set({ isAuthenticated: true, token });
                    return true;
                }
                return false;
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);

export default useAuthStore;
