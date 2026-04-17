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
      profile_pic TEXT
    )
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
      
      // Ensure missing columns exist if the table was already created
      const columns = ["dob DATE", "city VARCHAR(100)", "bio TEXT", "profile_pic TEXT"];
      columns.forEach(col => {
        db.query(`ALTER TABLE users ADD COLUMN ${col}`, (err) => {
          // Silence errors if columns already exist
        });
      });
    }
  });
};

// Call on startup
createUsersTable();

module.exports = { createUsersTable };