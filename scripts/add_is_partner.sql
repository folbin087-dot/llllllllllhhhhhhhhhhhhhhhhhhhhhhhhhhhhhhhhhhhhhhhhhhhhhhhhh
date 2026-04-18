-- Add is_partner column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_partner ON users(is_partner);

-- Add comment to explain the column
COMMENT ON COLUMN users.is_partner IS 'Indicates if user is a partner in the affiliate program';
