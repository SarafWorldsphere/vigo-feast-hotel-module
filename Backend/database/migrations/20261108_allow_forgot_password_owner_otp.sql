-- The forgot-password endpoints store OTPs with this purpose. Keep the
-- database constraint aligned with the application-level validation.
ALTER TABLE public.vgf_restaurant_owner_otp_requests
    DROP CONSTRAINT IF EXISTS vgf_restaurant_owner_otp_requests_purpose_check;

ALTER TABLE public.vgf_restaurant_owner_otp_requests
    ADD CONSTRAINT vgf_restaurant_owner_otp_requests_purpose_check
    CHECK (purpose IN ('REGISTRATION', 'LOGIN', 'FORGOT_PASSWORD'));
