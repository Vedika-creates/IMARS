-- User login function
CREATE OR REPLACE FUNCTION auth.login(email text, password text)
RETURNS json AS $$
DECLARE
    user_record users%ROWTYPE;
    session_token_val text;
    session_id_val UUID;
    expires_at_val timestamp with time zone;
BEGIN
    -- Find the user
    SELECT * INTO user_record FROM users WHERE email = login.email AND is_active = true;
    
    -- Check if user exists and password is correct
    IF user_record IS NULL OR NOT (user_record.password_hash = crypt(password, user_record.password_hash)) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid email or password');
    END IF;
    
    -- Generate session token
    session_token_val := encode(gen_random_bytes(32), 'hex');
    expires_at_val := NOW() + INTERVAL '24 hours';
    
    -- Create session
    INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
    VALUES (user_record.id, session_token_val, expires_at_val, client_ip_address(), client_user_agent())
    RETURNING id INTO session_id_val;
    
    -- Update last login
    UPDATE users SET last_login = NOW() WHERE id = user_record.id;
    
    -- Return success with user info and session token
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'first_name', user_record.first_name,
            'last_name', user_record.last_name,
            'role', user_record.role,
            'phone', user_record.phone,
            'two_factor_enabled', user_record.two_factor_enabled
        ),
        'session_token', session_token_val,
        'expires_at', expires_at_val
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.login TO authenticated, anon;
