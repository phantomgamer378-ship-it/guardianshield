CREATE TABLE IF NOT EXISTS community_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER REFERENCES users(id),
  report_type TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  comment TEXT,
  reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS nccp_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  scan_type TEXT,
  scan_log_id INTEGER,
  submission_ref TEXT,
  status TEXT DEFAULT 'submitted',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
