-- Create jobs table for async operation tracking
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    error TEXT,
    start_time DATETIME,
    end_time DATETIME,
    cancel_token TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    metadata TEXT,
    result TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_cancel_token ON jobs(cancel_token);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
