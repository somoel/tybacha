import { useAuthStore } from '@/src/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

/**
 * Hook that manages MySQL auth state initialization.
 * Initializes auth state from AsyncStorage on app startup.
 * Should be called once in the root layout.
 */
export function useAuth() {
    const { setUser, setRole, setProfile, setLoading, user, role, profile, isLoading } = useAuthStore();

    useEffect(() => {
        // Initialize auth state from storage
        const initializeAuth = async () => {
            try {
                // Check if we already have auth state in the store
                if (user && profile && role) {
                    setLoading(false);
                    return;
                }

                // Try to restore auth from stored user ID
                const storedUserId = await AsyncStorage.getItem('tybacha-user-id');
                if (storedUserId) {
                    // In a real app, you would fetch user data from the API here
                    // For now, we'll just set loading to false
                    console.log('Found stored user ID:', storedUserId);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error initializing auth:', error);
                setLoading(false);
            }
        };

        void initializeAuth();
    }, [user, profile, role, setLoading]);

    return { user, role, profile, isLoading };
}
