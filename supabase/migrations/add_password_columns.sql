-- Add password_encrypted column to storage_boxes table
ALTER TABLE storage_boxes 
ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Add password_encrypted column to subaccounts table for storing subaccount passwords
ALTER TABLE subaccounts 
ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN storage_boxes.password_encrypted IS 'Encrypted FTP/storage box password for directory browsing';
COMMENT ON COLUMN subaccounts.password_encrypted IS 'Encrypted subaccount password for FTP/SSH access';