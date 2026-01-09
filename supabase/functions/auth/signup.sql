-- User signup function
CREATE OR REPLACE FUNCTION auth.signup(email text, password text, first_name text, last_name text, phone text DEFAULT NULL)
RETURNS json AS $$
DECLARE
    user_id_val UUID;
    hashed_password text;
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = signup.email) THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;
    
    -- Hash the password
    hashed_password := crypt(password, gen_salt('bf', 12));
    
    -- Create the user
    INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
    VALUES (email, hashed_password, first_name, last_name, phone, 'warehouse_staff')
    RETURNING id INTO user_id_val;
    
    -- Return success with user ID
    RETURN json_build_object('success', true, 'user_id', user_id_val);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.signup TO authenticated, anon;
