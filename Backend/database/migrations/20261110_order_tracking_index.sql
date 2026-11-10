-- Non-destructive index to support analytics/tracking joins via vgf_orders(id).
CREATE INDEX IF NOT EXISTS ix_vgf_order_tracking_order_id
    ON vgf_order_tracking (order_id);

