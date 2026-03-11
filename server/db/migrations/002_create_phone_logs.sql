CREATE TABLE IF NOT EXISTS phone_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  phone_number TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  classification TEXT NOT NULL,
  confidence INTEGER,
  reasons TEXT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
