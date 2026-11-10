-- Owner-only refund request workflow.  This migration is non-destructive and
-- leaves platform-admin execution/status updates to the shared backend.
ALTER TABLE vgf_refunds
    ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES vgf_restaurants(id);
ALTER TABLE vgf_refunds
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE vgf_refunds
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Backfill tenancy for existing requests before adding the query index.
UPDATE vgf_refunds r
SET restaurant_id = o.restaurant_id
FROM vgf_orders o
WHERE o.order_id = r.order_id
  AND r.restaurant_id IS NULL;

CREATE INDEX IF NOT EXISTS ix_vgf_refunds_restaurant_id
    ON vgf_refunds (restaurant_id);

-- Existing records keep their values; only the accepted lifecycle expands.
ALTER TABLE vgf_refunds DROP CONSTRAINT IF EXISTS chk_vgf_refunds_status;
ALTER TABLE vgf_refunds
    ADD CONSTRAINT chk_vgf_refunds_status
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'));
