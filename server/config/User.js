const db = require('./db');

// Ensure users table exists with status columns
const createUsersTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_online BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dob DATE,
      city VARCHAR(100),
      bio TEXT,
      profile_pic TEXT,
      two_factor_auth TINYINT(1) DEFAULT 0,
      two_fa_id VARCHAR(255),
      two_fa_code VARCHAR(10),
      two_fa_status VARCHAR(50)
    )
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
      
      // Ensure missing columns exist if the table was already created
      const columns = [
        "dob DATE", 
        "city VARCHAR(100)", 
        "bio TEXT", 
        "profile_pic TEXT",
        "two_factor_auth TINYINT(1) DEFAULT 0",
        "two_fa_id VARCHAR(255)",
        "two_fa_code VARCHAR(10)",
        "two_fa_status VARCHAR(50)",
        "reset_token VARCHAR(255)",
        "reset_token_expire DATETIME"
      ];
      columns.forEach(col => {
        db.query(`ALTER TABLE users ADD COLUMN ${col}`, (err) => {
          // Silence errors if columns already exist
        });
      });
    }
  });
};

// Ensure sessions table exists
const createSessionsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      device_name VARCHAR(255),
      ip_address VARCHAR(100),
      is_active TINYINT(1) DEFAULT 1,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error('Error creating user_sessions table:', err);
    } else {
      console.log('✅ User Sessions table ready');
    }
  });
};

// Call on startup
createUsersTable();
createSessionsTable();

module.exports = { createUsersTable, createSessionsTable };