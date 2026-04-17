const express = require('express');
const router = express.Router();
const { getMessagesByUsers, createMessage } = require('../controllers/messageController');

// GET /api/messages/:receiverId/:senderId - Get chat history between two users
router.get('/:receiverId/:senderId', getMessagesByUsers);

// POST /api/messages - Send message (REST fallback)
router.post('/', createMessage);

module.exports = router;
