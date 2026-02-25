import { useAuthStore } from '@/src/stores/authStore';
import type { UserRole } from '@/src/types/auth.types';

/**
 * Hook for checking user role permissions.
 * Used to conditionally show/hide UI elements based on role.
 */
export function usePermissions() {
    const role = useAuthStore((state) => state.role);

    /** Check if user has the specified role */
    const hasRole = (requiredRole: UserRole): boolean => {
        return role === requiredRole;
    };

    /** Whether the current user is a professional */
    const isProfessional = role === 'professional';

    /** Whether the current user is a caregiver */
    const isCaregiver = role === 'caregiver';

    /**
     * Check if user can perform an action that requires a specific role.
     * @param requiredRole - The role needed
     * @returns true if user has the required role
     */
    const canPerform = (requiredRole: UserRole): boolean => {
        return role === requiredRole;
    };

    return {
        role,
        isProfessional,
        isCaregiver,
        hasRole,
        canPerform,
    };
}
