/** Typed route constants for Expo Router navigation */
export const Routes = {
    AUTH: {
        LOGIN: '/(auth)/login' as const,
    },
    APP: {
        HOME: '/(app)/home' as const,
        PATIENTS: {
            LIST: '/(app)/patients' as const,
            NEW: '/(app)/patients/new' as const,
            DETAIL: (id: string) => `/(app)/patients/${id}` as const,
            EDIT: (id: string) => `/(app)/patients/${id}/edit` as const,
            ASSIGN_CAREGIVER: (id: string) => `/(app)/patients/${id}/assign-caregiver` as const,
            BATTERIES: {
                LIST: (id: string) => `/(app)/patients/${id}/batteries` as const,
                NEW: (id: string) => `/(app)/patients/${id}/batteries/new` as const,
                DETAIL: (id: string, batteryId: string) =>
                    `/(app)/patients/${id}/batteries/${batteryId}` as const,
            },
        },
        TESTS: {
            LIST: '/(app)/tests' as const,
            ACTIVE: (testType: string) => `/(app)/tests/${testType}/active` as const,
        },
        RESULTS: '/(app)/results' as const,
        PROFILE: '/(app)/profile' as const,
    },
} as const;
