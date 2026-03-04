-- =============================================================================
-- Function: search_caregivers_by_email
-- Purpose: Search caregivers by email address (joins auth.users)
-- =============================================================================

CREATE OR REPLACE FUNCTION search_caregivers_by_email(search_query TEXT)
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
        p.role = 'caregiver'
        AND u.email ILIKE '%' || search_query || '%'
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_caregivers_by_email(TEXT) TO authenticated;
