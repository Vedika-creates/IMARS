-- User logout function
CREATE OR REPLACE FUNCTION auth.logout(session_token text)
RETURNS json AS $$
DECLARE
    session_count integer;
BEGIN
    -- Find and delete the session
    DELETE FROM user_sessions WHERE session_token = logout.session_token;
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    
    IF session_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid session token');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Logged out successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.logout TO authenticated, anon;
