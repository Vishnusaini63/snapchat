const db = require('./db');

// Ensure messages table exists
const createMessagesTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
      type VARCHAR(50) DEFAULT 'text',
      is_edited TINYINT(1) DEFAULT 0,
      local_id VARCHAR(100),
      duration INT DEFAULT 0,
      delete_mode VARCHAR(50) DEFAULT 'never',
      delete_at TIMESTAMP NULL DEFAULT NULL,
      is_viewed TINYINT(1) DEFAULT 0,
      INDEX idx_sender_receiver (sender_id, receiver_id),
      INDEX idx_receiver_sender (receiver_id, sender_id)
    )
  `;

  db.query(sql, (err) => {
    if (err) {
      console.error('Error creating messages table:', err);
    } else {
      console.log('✅ Messages table ready');

      db.query("ALTER TABLE messages ADD COLUMN type VARCHAR(50) DEFAULT 'text'", () => {});
      db.query("ALTER TABLE messages ADD COLUMN duration INT DEFAULT 0", () => {});
      db.query("ALTER TABLE messages ADD COLUMN is_edited TINYINT(1) DEFAULT 0", () => {});
      db.query("ALTER TABLE messages ADD COLUMN local_id VARCHAR(100)", () => {});
      db.query("ALTER TABLE messages ADD COLUMN delete_mode VARCHAR(50) DEFAULT 'never'", () => {});
      db.query("ALTER TABLE messages ADD COLUMN delete_at TIMESTAMP NULL DEFAULT NULL", () => {});
      db.query("ALTER TABLE messages ADD COLUMN is_viewed TINYINT(1) DEFAULT 0", () => {});

      console.log("✅ Checked/Updated message columns");
    }
  });
};

// 📞 SAVE CALL START
const saveCallMessage = (data, callback) => {
  const sql = `
    INSERT INTO messages 
    (sender_id, receiver_id, message, status, type, duration)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    data.sender_id,
    data.receiver_id,
    "📞 Call Started",
    "sent",
    data.type,
    0
  ], callback);
};

// 📞 END CALL UPDATE
const endCallMessage = (id, duration) => {
  const sql = `
    UPDATE messages 
    SET message = ?, duration = ?
    WHERE id = ?
  `;

  db.query(sql, [
    `📞 Call Ended (${duration}s)`,
    duration,
    id
  ]);
};

// Call on startup
createMessagesTable();

// ✅ FINAL EXPORT (IMPORTANT 🔥)
module.exports = { 
  createMessagesTable,
  saveCallMessage,
  endCallMessage
};