const db = require('../config/db');

// Get messages between two users
const getMessagesByUsers = (req, res) => {
  const { senderId, receiverId } = req.params;
  
  const sql = `
    SELECT id, sender_id as senderId, receiver_id as receiverId, message, status, created_at as time 
    FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `;
  
  db.query(sql, [senderId, receiverId, receiverId, senderId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Create message (REST fallback for socket)
const createMessage = (req, res) => {
  const { sender_id, receiver_id, message } = req.body;
  
  const sql = `
    INSERT INTO messages (sender_id, receiver_id, message, created_at, status) 
    VALUES (?, ?, ?, NOW(), 'sent')
  `;
  
  db.query(sql, [sender_id, receiver_id, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: result.insertId, status: 'sent' });
  });
};

module.exports = { getMessagesByUsers, createMessage };
