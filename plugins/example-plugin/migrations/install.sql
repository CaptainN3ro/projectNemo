-- Main data table: user-scoped notes with optional file attachment
CREATE TABLE IF NOT EXISTS example_notes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  content           TEXT,
  file_path         VARCHAR(500),
  original_filename VARCHAR(255),
  file_size         INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Singleton settings row (id always = 1)
CREATE TABLE IF NOT EXISTS example_plugin_settings (
  id                   INT PRIMARY KEY DEFAULT 1,
  max_notes_per_user   INT     DEFAULT 50,
  allow_file_uploads   BOOLEAN DEFAULT TRUE,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO example_plugin_settings (id) VALUES (1);
