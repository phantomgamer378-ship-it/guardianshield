CREATE TABLE IF NOT EXISTS video_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  file_name TEXT,
  authenticity_score INTEGER,
  classification TEXT,
  confidence INTEGER,
  factors TEXT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  file_name TEXT,
  ai_probability INTEGER,
  classification TEXT,
  confidence INTEGER,
  factors TEXT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
