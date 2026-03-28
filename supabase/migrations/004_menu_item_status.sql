-- Add status column: 'available', 'sold_out', 'hidden'
ALTER TABLE menu_items ADD COLUMN status text NOT NULL DEFAULT 'available';

-- Backfill from existing available boolean
UPDATE menu_items SET status = CASE WHEN available THEN 'available' ELSE 'hidden' END;

-- Create index for filtering
CREATE INDEX idx_menu_items_status ON menu_items(status);
