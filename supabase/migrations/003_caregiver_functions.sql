-- =============================================================================
-- Function: verify_caregiver_by_email
-- Purpose: Verify if a user with given email exists and has role 'caregiver'
-- =============================================================================

CREATE OR REPLACE FUNCTION verify_caregiver_by_email(caregiver_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN public.profiles p ON u.id = p.id
        WHERE 
            u.email = caregiver_email
            AND p.role = 'caregiver'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: get_caregiver_details_by_email
-- Purpose: Get caregiver details (id, full_name) by email
-- =============================================================================

CREATE OR REPLACE FUNCTION get_caregiver_details_by_email(caregiver_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name
    FROM 
        auth.users u
    JOIN 
        public.profiles p ON u.id = p.id
    WHERE 
        u.email = caregiver_email
        AND p.role = 'caregiver';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_caregiver_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_caregiver_details_by_email(TEXT) TO authenticated;
