-- Non-destructive Razorpay refund and restaurant-recovery migration.
ALTER TABLE vgf_payments ADD COLUMN IF NOT EXISTS gateway_payment_ref VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vgf_payments_gateway_payment_ref
    ON vgf_payments (gateway_payment_ref) WHERE gateway_payment_ref IS NOT NULL;

ALTER TABLE vgf_refunds ADD COLUMN IF NOT EXISTS payment_id BIGINT;
DO $$ BEGIN
    ALTER TABLE vgf_refunds ADD CONSTRAINT fk_vgf_refunds_payment
        FOREIGN KEY (payment_id) REFERENCES vgf_payments(payment_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS ix_vgf_refunds_payment_id ON vgf_refunds(payment_id);

CREATE TABLE IF NOT EXISTS vgf_refund_recoveries (
    recovery_id BIGSERIAL PRIMARY KEY,
    refund_id BIGINT NOT NULL UNIQUE REFERENCES vgf_refunds(refund_id),
    restaurant_id UUID NOT NULL REFERENCES vgf_restaurants(id),
    original_batch_id BIGINT NULL REFERENCES vgf_settlement_batches(batch_id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0 AND recovered_amount <= amount),
    status VARCHAR(20) NOT NULL DEFAULT 'OUTSTANDING' CHECK (status IN ('OUTSTANDING', 'RECOVERED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_vgf_refund_recoveries_restaurant_status
    ON vgf_refund_recoveries(restaurant_id, status, created_at);

CREATE TABLE IF NOT EXISTS vgf_refund_recovery_allocations (
    allocation_id BIGSERIAL PRIMARY KEY,
    recovery_id BIGINT NOT NULL REFERENCES vgf_refund_recoveries(recovery_id),
    batch_id BIGINT NOT NULL REFERENCES vgf_settlement_batches(batch_id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vgf_recovery_batch UNIQUE(recovery_id, batch_id)
);
