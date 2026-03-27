-- Migration 003: Add order number auto-generation function
-- Format: {SERVICE_PREFIX}{DDMM}-{SEQ}
-- Example: REP2703-001 (First repair order on March 27)

-- ============================================
-- FUNCTION: get_next_order_number
-- ============================================
-- Generates the next order number based on service type and current date
-- Service Type Prefix:
--   - Repair -> REP
--   - Service -> SER
--   - Installation -> INS
-- Date Format: DDMM (e.g., 2703 for March 27)
-- Sequence: 3-digit sequential number per day (001, 002, etc.)

CREATE OR REPLACE FUNCTION get_next_order_number(p_service_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_date_str TEXT;
    v_next_seq INTEGER;
    v_last_order_no TEXT;
    v_today_str TEXT;
BEGIN
    -- Determine prefix based on service type
    SELECT UPPER(SUBSTRING(LOWER(COALESCE(p_service_type, 'repair')) FROM 1 FOR 3))
    INTO v_prefix;
    
    -- Get current date in DDMM format (using UTC+8 for Malaysia timezone)
    SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kuala_Lumpur', 'DDMM')
    INTO v_date_str;
    
    -- Build the prefix part (e.g., 'REP2703')
    v_today_str := v_prefix || v_date_str;
    
    -- Find the last order number with the same prefix and date
    SELECT order_no
    INTO v_last_order_no
    FROM orders
    WHERE order_no LIKE v_today_str || '-%'
    ORDER BY order_no DESC
    LIMIT 1;
    
    -- Calculate next sequence number
    IF v_last_order_no IS NULL THEN
        v_next_seq := 1;
    ELSE
        -- Extract the sequence part after the last hyphen
        v_next_seq := COALESCE(
            NULLIF(SPLIT_PART(v_last_order_no, '-', 2), '')::INTEGER,
            0
        ) + 1;
    END IF;
    
    -- Return the new order number with 3-digit sequence
    RETURN v_today_str || '-' || TO_CHAR(v_next_seq, 'FM000');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT EXECUTE PERMISSION
-- ============================================
GRANT EXECUTE ON FUNCTION get_next_order_number(TEXT) TO authenticated;

-- ============================================
-- COMMENT
-- ============================================
COMMENT ON FUNCTION get_next_order_number IS 'Generates unique order number in format: {PREFIX}{DDMM}-{SEQ} where PREFIX is first 3 letters of service type, DDMM is current date, and SEQ is daily sequence';
