CREATE TABLE IF NOT EXISTS global_spam_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    spam_type TEXT,
    risk_level TEXT,
    source TEXT DEFAULT 'external_db',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
