-- Initialize cv_shelves database
-- This script runs when PostgreSQL container starts for the first time

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var)
-- But we can add any additional setup here

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON DATABASE cv_shelves TO cv_shelves_user;
