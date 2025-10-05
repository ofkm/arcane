-- Create jobs table for async operation tracking
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    error TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    cancel_token TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    metadata JSONB,
    result JSONB
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_cancel_token ON jobs(cancel_token);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Add foreign key constraint to users table
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
