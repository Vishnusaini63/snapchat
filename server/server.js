const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const verifyToken = require("./middleware/authMiddleware");
require("./config/Message"); // Auto-create tables
require("./config/User");

// 🔥 NEW: Ensure chat_settings table exists
db.query(`
  CREATE TABLE IF NOT EXISTS chat_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1 INT NOT NULL,
    user2 INT NOT NULL,
    delete_mode VARCHAR(50) DEFAULT 'never',
    is_global TINYINT(1) DEFAULT 0,
    owner_id INT DEFAULT NULL,
    UNIQUE KEY (user1, user2, is_global, owner_id)
  )
`, (err) => { if (err) console.error("❌ Chat settings table error:", err); });

// 🔥 Ensure mute_settings table exists
db.query(`
  CREATE TABLE IF NOT EXISTS mute_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    is_chat_muted TINYINT(1) DEFAULT 0,
    is_call_muted TINYINT(1) DEFAULT 0,
    UNIQUE KEY (user_id, friend_id)
  )
`, (err) => { if (err) console.error("❌ Mute settings table error:", err); });

// � Ensure uploads directory exists to prevent ENOENT errors
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 📁 storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 1000* 1024 * 1024 }, // 🔥 Increased to 10MB for high-res photos
fileFilter: (req, file, cb) => {
  const allowedTypes = [
    "audio/",
    "image/",
    "video/",
    "application/pdf"
  ];

  const isValid = allowedTypes.some(type =>
    file.mimetype.startsWith(type)
  );

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file ❌"), false);
  }
}
});

const inCallUsers = new Set(); // 🔥 track busy users
const app = express();
const busyUsers = {};
// middleware
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads", {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".webm")) {
      res.setHeader("Content-Type", "audio/webm");
    }
  }
}));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

const frontendPath = path.join(__dirname, "../snapchat-frontend/dist");
app.use(express.static(frontendPath));


//vishnusaini

// routes
app.use("/api/auth", authRoutes);

// 🔥 NEW: Handle Reject Friend Request (Fixes 404 Error)
app.post("/api/auth/reject-request", verifyToken, (req, res) => {
  const { senderId, requestId } = req.body;
  const receiverId = req.user.id; // verifyToken middleware se user ID

  // Agar requestId hai toh usse delete karo, nahi toh sender/receiver combo se
  const targetId = requestId || senderId;
  if (!targetId) return res.status(400).json({ error: "ID is required" });

  db.query(
    "DELETE FROM friends WHERE (id = ? OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
    [targetId, targetId, receiverId],
    (err, result) => {
      if (err) {
        console.error("❌ Reject request error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ success: true, message: "Friend request rejected ✅" });
    }
  );
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// 🔥 NEW: API to fetch Chat History from Database
app.get("/api/messages/history/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;
  // Fetch messages between two users
const sql = `
SELECT m.*, em.edited_text
FROM messages m
LEFT JOIN edited_messages em 
  ON m.id = em.message_id AND em.user_id = ${db.escape(user1)}
WHERE (
  (m.sender_id = ${db.escape(user1)} AND m.receiver_id = ${db.escape(user2)}) 
  OR 
  (m.sender_id = ${db.escape(user2)} AND m.receiver_id = ${db.escape(user1)})
)
AND m.id NOT IN (
  SELECT message_id FROM deleted_messages WHERE user_id = ${db.escape(user1)}
)
ORDER BY m.created_at ASC
`;
  
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.delete('/api/friends/remove', (req, res) => {
  const { userId, friendId } = req.body;

  // 🔥 STEP 1: Remove Friend Relation
  db.query(
    `DELETE FROM friends 
     WHERE (sender_id = ? AND receiver_id = ?) 
     OR (sender_id = ? AND receiver_id = ?)`,
    [userId, friendId, friendId, userId],
    (err) => {
      if (err) {
        console.error("❌ Friend remove error:", err);
        return res.status(500).json({ error: "Failed to remove friend" });
      }

      // 🔥 STEP 2: Delete Chat Messages
      db.query(
        `DELETE FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)`,
        [userId, friendId, friendId, userId],
        (err2) => {
          if (err2) {
            console.error("❌ Chat delete error:", err2);
            return res.status(500).json({ error: "Failed to delete chat" });
          }

          // 🔥 STEP 3: Cleanup deleted_messages table
          db.query(
            `DELETE FROM deleted_messages 
             WHERE user_id IN (?, ?)`,
            [userId, friendId],
            (err3) => {
              if (err3) {
                console.error("❌ deleted_messages cleanup error:", err3);
              }

              // 🔥 STEP 4: Cleanup edited_messages table
              db.query(
                `DELETE FROM edited_messages 
                 WHERE user_id IN (?, ?)`,
                [userId, friendId],
                (err4) => {
                  if (err4) {
                    console.error("❌ edited_messages cleanup error:", err4);
                  }

                  // ✅ FINAL RESPONSE
                  res.json({
                    success: true,
                    message: "Friend + chat पूरी तरह delete हो गया 🔥"
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.post('/api/friends/block', (req, res) => {
  const { userId, friendId } = req.body;

  // 🔥 STEP 1: Pehle purana koi bhi relation delete karo aur naya 'blocked' record dalo
  // Jisme userId (blocker) sender_id banega.
  db.query(
    "DELETE FROM friends WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)",
    [userId, friendId, friendId, userId],
    (err) => {
      if (err) return res.status(500).json({ error: "Block failed" });

      db.query(
        "INSERT INTO friends (sender_id, receiver_id, status) VALUES (?, ?, 'blocked')",
        [userId, friendId],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Block failed" });

          // 🔥 STEP 2: Chat delete karo
          db.query(
            "DELETE FROM messages WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)",
            [userId, friendId, friendId, userId],
            (err3) => {
              if (err3) console.error("Chat delete error:", err3);
              res.json({ success: true, message: "User blocked 🚫" });
            }
          );
        }
      );
    }
  );
});

app.get('/api/friends/blocked/:userId', (req, res) => {
  const { userId } = req.params;

  db.query(
    `SELECT u.id, u.username, u.profile_pic
     FROM friends f
     JOIN users u ON u.id = f.receiver_id
     WHERE f.sender_id=? 
     AND f.status='blocked'`,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});


app.post("/api/friends/nickname", (req, res) => {
  const { userId, friendId, nickname } = req.body;

  const sql = `
    INSERT INTO friend_nicknames (user_id, friend_id, nickname)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE nickname = ?
  `;

  db.query(sql, [userId, friendId, nickname, nickname], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to save nickname" });
    }

    res.json({ success: true });
  });
});


app.post('/api/friends/unblock', (req, res) => {
  const { userId, friendId } = req.body;

  db.query(
    "DELETE FROM friends WHERE sender_id=? AND receiver_id=? AND status='blocked'",
    [userId, friendId],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Unblock failed" });
      }

      res.json({ success: true, message: "User unblocked ✅" });
    }
  );
});

// 🔥 NEW: Get unread counts for Sidebar
app.get("/api/messages/unread-counts/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = `SELECT sender_id, COUNT(*) as count FROM messages WHERE receiver_id = ? AND status != 'read' GROUP BY sender_id`;
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// 🔥 NEW: Get the last message for each conversation for Sidebar
app.get("/api/messages/last-messages/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT m.*, IF(m.sender_id = ?, m.receiver_id, m.sender_id) as friend_id
    FROM messages m
    INNER JOIN (
        SELECT 
            IF(sender_id = ?, receiver_id, sender_id) AS conversation_id,
            MAX(id) as max_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY conversation_id
    ) latest ON m.id = latest.max_id
  `;
  db.query(sql, [userId, userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/api/chat/mute-settings", (req, res) => {
  const { userId, friendId, isChatMuted, isCallMuted } = req.body;

  const sql = `
    INSERT INTO mute_settings (user_id, friend_id, is_chat_muted, is_call_muted)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      is_chat_muted = VALUES(is_chat_muted), 
      is_call_muted = VALUES(is_call_muted)
  `;

 db.query(
  sql,
  [userId, friendId, isChatMuted ? 1 : 0, isCallMuted ? 1 : 0],
  (err, result) => {

    if (err) {
      console.log("❌ DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("🔥 RESULT:", result);   // 👈 ADD THIS

    if (result.affectedRows === 0) {
      console.log("⚠️ NO ROW UPDATED");
    } else {
      console.log("✅ ROW UPDATED");
    }

    io.emit("muteSettingsUpdated", {
      userId: Number(userId),
      friendId: Number(friendId),
      isChatMuted,
      isCallMuted
    });

    res.json({ success: true });
  }
);
});

app.get("/api/chat/mute-settings/:userId/:friendId", (req, res) => {
  const { userId, friendId } = req.params;
  db.query("SELECT is_chat_muted as isChatMuted, is_call_muted as isCallMuted FROM mute_settings WHERE user_id = ? AND friend_id = ?", [userId, friendId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0] || { isChatMuted: false, isCallMuted: false });
  });
});

app.get("/api/chat/mute-settings/all/:userId", (req, res) => {
  const { userId } = req.params;
  db.query("SELECT friend_id, is_chat_muted, is_call_muted FROM mute_settings WHERE user_id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.use("/api/messages", messageRoutes);

// 🔥 Updated to use upload.single("image") to match frontend field name
app.post("/api/upload-profile", upload.single("image"), (req, res) => {
  console.log("FILE:", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = `/uploads/${req.file.filename}`;
  res.json({ url: `${req.protocol}://${req.get('host')}${filePath}` });
});


//  IMPORTANT: http server create
const server = http.createServer(app);

// 👇 socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});


// 🔥 AUTO DELETE JOB (ADD HERE)
setInterval(async () => {
  try {
    await db.promise().query(
      "DELETE FROM messages WHERE delete_at IS NOT NULL AND delete_at <= NOW()"
    );
  } catch (err) {
    console.error("Auto delete error:", err);
  }
}, 60000); // every 1 min
const users = {}; // userId → socketId map
const activeChatRooms = {}; // userId → friendId (current active chat)

// 🎤 AUDIO UPLOAD API
app.post("/api/upload-audio", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get("host")}${filePath}`;

  res.json({ url: fullUrl });
});

// 📸 IMAGE/VIDEO UPLOAD API
app.post("/api/upload-media", upload.single("media"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = `/uploads/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get("host")}${filePath}`;

  res.json({
    url: fullUrl,
    type: req.file.mimetype.split('/')[0]
  });
});

app.post("/api/chat/wallpaper", upload.single("wallpaper"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid format" });
  }

  let { user1, user2, type } = req.body; // type = "me" | "everyone"

  const filePath = `/uploads/${req.file.filename}`;
const fullUrl = `${req.protocol}://${req.get("host")}${filePath}`;

  const u1 = Math.min(Number(user1), Number(user2));
  const u2 = Math.max(Number(user1), Number(user2));

  if (type === "everyone") {
    db.query(
      "REPLACE INTO chat_wallpapers (user1, user2, wallpaper, is_global) VALUES (?, ?, ?, 1)",
      [u1, u2, filePath],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        // 🔥 Notify both users if it's for everyone
        const s1 = users[String(user1)];
        const s2 = users[String(user2)];
        const payload = { url: fullUrl, senderId: user1 };
        if (s1) io.to(s1).emit("wallpaperUpdated", payload);
        if (s2) io.to(s2).emit("wallpaperUpdated", payload);
        res.json({ url: fullUrl });
      }
    );

  } else {
    // 🔥 FOR ME
    db.query(
      `INSERT INTO chat_wallpapers (user1, user2, wallpaper, is_global, owner_id) 
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE wallpaper = VALUES(wallpaper)`,
      [u1, u2, filePath, Number(user1)],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ url: fullUrl });
      }
    );
  }
});

app.get("/api/chat/wallpaper/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;

  const u1 = Math.min(user1, user2);
  const u2 = Math.max(user1, user2);

  const sql = `
    SELECT wallpaper FROM chat_wallpapers 
    WHERE 
      (is_global = 1 AND user1=? AND user2=?)
      OR
      (is_global = 0 AND owner_id=? AND user1=? AND user2=?)
    ORDER BY id DESC
    LIMIT 1
  `;

  db.query(sql, [u1, u2, user1, u1, u2], (err, result) => {
    if (result.length) {
      res.json({
        wallpaper: `${req.protocol}://${req.get("host")}${result[0].wallpaper}`
      });
    } else {
      res.json({ wallpaper: null });
    }
  });
});

app.post("/api/chat/theme", async (req, res) => {
  let { user1, user2, theme, type } = req.body;

  const u1 = Math.min(Number(user1), Number(user2));
  const u2 = Math.max(Number(user1), Number(user2));
  const ownerId = Number(user1);

  try {
    if (type === "everyone") {
      // Everyone: Pehle sab purana clear karo
      await db.promise().query("DELETE FROM chat_themes WHERE user1=? AND user2=?", [u1, u2]);
      await db.promise().query("DELETE FROM chat_wallpapers WHERE user1=? AND user2=?", [u1, u2]);
      await db.promise().query("INSERT INTO chat_themes (user1, user2, theme, is_global) VALUES (?, ?, ?, 1)", [u1, u2, theme]);

      const s1 = users[String(user1)];
      const s2 = users[String(user2)];
      if (s1) io.to(s1).emit("themeUpdated", { theme });
      if (s2) io.to(s2).emit("themeUpdated", { theme });
      res.json({ success: true });
    } else {
      // For Me: Sirf apna private record clear aur insert karo
      await db.promise().query("DELETE FROM chat_themes WHERE is_global=0 AND owner_id=? AND user1=? AND user2=?", [ownerId, u1, u2]);
      await db.promise().query("DELETE FROM chat_wallpapers WHERE is_global=0 AND owner_id=? AND user1=? AND user2=?", [ownerId, u1, u2]);
      await db.promise().query(
  `INSERT INTO chat_themes (user1, user2, theme, is_global, owner_id)
   VALUES (?, ?, ?, 0, ?)
   ON DUPLICATE KEY UPDATE theme = VALUES(theme), owner_id = VALUES(owner_id)`,
  [u1, u2, theme, ownerId]
);
      res.json({ success: true });
    }
  } catch (err) { 
    console.error("Theme Save Error:", err);
    res.status(500).json({ error: err.message }); 
  }
});

app.get("/api/chat/theme/:user1/:user2", (req, res) => {
  const u1 = Math.min(Number(req.params.user1), Number(req.params.user2));
  const u2 = Math.max(Number(req.params.user1), Number(req.params.user2));
  const currentUserId = Number(req.params.user1);

  // 🔥 PRIVATE FIRST
  const sqlPrivate = `
    SELECT theme FROM chat_themes 
    WHERE is_global = 0 AND owner_id=? AND user1=? AND user2=?
    ORDER BY id DESC
    LIMIT 1
  `;

  db.query(sqlPrivate, [currentUserId, u1, u2], (err, privateResult) => {
    if (err) return res.status(500).send(err);

    if (privateResult.length > 0) {
      return res.json({ theme: privateResult[0].theme });
    }

    // 🔥 GLOBAL
    const sqlGlobal = `
      SELECT theme FROM chat_themes 
      WHERE is_global = 1 AND user1=? AND user2=?
      ORDER BY id DESC
      LIMIT 1
    `;

    db.query(sqlGlobal, [u1, u2], (err2, globalResult) => {
      if (err2) return res.status(500).send(err2);

      res.json({
        theme: globalResult.length ? globalResult[0].theme : "default"
      });
    });
  });
});

// 🔥 NEW: Save Delete Mode preference for a chat
app.post("/api/chat/delete-mode", async (req, res) => {
  // Support both naming conventions to prevent NaN errors
  let { user1, user2, userId, friendId, deleteMode, type } = req.body;

  const id1 = user1 || userId;
  const id2 = user2 || friendId;

  if (!id1 || !id2) return res.status(400).json({ error: "User IDs are required ❌" });

  const u1 = Math.min(Number(id1), Number(id2));
  const u2 = Math.max(Number(id1), Number(id2));
  const ownerId = Number(id1);

  try {
    if (type === "everyone") {
      // 🔥 FIX: Everyone ke liye purani GLOBAL aur PRIVATE saari settings delete karo taaki conflict na ho
      await db.promise().query("DELETE FROM chat_settings WHERE user1=? AND user2=?", [u1, u2]);
      await db.promise().query("INSERT INTO chat_settings (user1, user2, delete_mode, is_global) VALUES (?, ?, ?, 1)", [u1, u2, deleteMode || 'never']);

      // Notify both clients via socket
      const s1 = users[String(id1)];
      const s2 = users[String(id2)];
      const payload = { deleteMode, senderId: id1 };
      if (s1) io.to(s1).emit("deleteModeUpdated", payload);
      if (s2) io.to(s2).emit("deleteModeUpdated", payload);
      res.json({ success: true, message: "Delete mode updated for everyone ✅" });
    } else {
      // For Me: Sirf apna private record update/insert karo
      await db.promise().query(
        `INSERT INTO chat_settings (user1, user2, delete_mode, is_global, owner_id) 
         VALUES (?, ?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE delete_mode = VALUES(delete_mode)`,
        [u1, u2, deleteMode || 'never', ownerId]
      );
      res.json({ success: true, message: "Delete mode updated for you ✅" });
    }
  } catch (err) {
    console.error("Delete Mode Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔥 NEW: Get Delete Mode preference
app.get("/api/chat/delete-mode/:user1/:user2", (req, res) => {
  const u1 = Math.min(Number(req.params.user1), Number(req.params.user2));
  const u2 = Math.max(Number(req.params.user1), Number(req.params.user2));
  const currentUserId = Number(req.params.user1);

  // 🔥 FIX: Private settings ko secondary rakho, Global settings ko priority do agar Everyone enable hai
  const sql = `
    SELECT delete_mode FROM chat_settings 
    WHERE (is_global = 1 AND user1=? AND user2=?)
    OR (is_global = 0 AND owner_id=? AND user1=? AND user2=?)
    ORDER BY is_global DESC, id DESC LIMIT 1
  `;

  db.query(sql, [u1, u2, currentUserId, u1, u2], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ deleteMode: result.length ? result[0].delete_mode : "never" });
  });
});

app.put("/api/update-profile", verifyToken, (req, res) => {
  try {
    console.log("Profile Update Request Body:", req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("Update failed: Request body is empty");
      return res.status(400).json({ error: "No data received. Ensure you are sending JSON." });
    }
const { userId, username, email, dob, city, bio, profile_pic, active_status, read_receipts, two_factor_auth } = req.body;
    const id = userId || req.body.id; // Support both 'userId' and 'id'

    if (!id) {
      console.error("Update failed: User ID is missing from request body");
      return res.status(400).json({ error: "User ID is required" });
    }

    let fields = [];
    let values = [];

    // 🔥 SAFE CHECKS
    if (username && username.trim() !== "") {
      fields.push("username=?");
      values.push(username);
    }

    if (email && email.trim() !== "") {
      fields.push("email=?");
      values.push(email);
    }

    if (dob && dob !== "" && dob !== "Invalid Date") {
      fields.push("dob=?");
      values.push(dob);
    }

    if (city && city.trim() !== "") {
      fields.push("city=?");
      values.push(city);
    }

    if (bio && bio.trim() !== "") {
      fields.push("bio=?");
      values.push(bio);
    }

    if (profile_pic && profile_pic !== "") {
  fields.push("profile_pic=?");
  values.push(profile_pic);
}
if (active_status !== undefined) {
  fields.push("active_status=?");
  values.push(active_status);
}
if (read_receipts !== undefined) {
  fields.push("read_receipts=?");
  values.push(read_receipts);
}

if (two_factor_auth !== undefined) {
  fields.push("two_factor_auth=?");
  values.push(two_factor_auth);
}

    if (fields.length === 0) {
      console.error("Update failed: No fields provided for update");
      return res.status(400).json({ error: "No data to update" });
    }

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id=?`;
  values.push(id);

    console.log("SQL:", sql);
    console.log("VALUES:", values);

    db.query(sql, values, (err) => {
      if (err) {
        console.log("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: "Profile updated successfully ✅" });
    });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/user/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result[0]);
  });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let currentUserId = null;
// 🔥 Track when a user enters a specific chat
socket.on("enterChat", ({ userId, friendId }) => {
  activeChatRooms[String(userId)] = String(friendId);

  // 🔥 ONLY presence logic (NO AUTO READ ❌)
  db.query(
    "SELECT active_status FROM users WHERE id = ?",
    [userId],
    (err, results) => {
      if (err || !results.length) return;

      const { active_status } = results[0];

      // 🔥 Only notify presence if active_status ON
      if (!active_status) return;

      const friendSocket = users[String(friendId)];

      // If both users are in same chat
      if (activeChatRooms[String(friendId)] === String(userId)) {
        if (friendSocket) {
          io.to(friendSocket).emit("presenceUpdate", {
            friendId: userId,
            inChat: true
          });
        }

        socket.emit("presenceUpdate", {
          friendId,
          inChat: true
        });
      }
    }
  );
});

  // 🔥 Real-time Logout Signal
  socket.on("forceLogoutDevice", ({ sessionId }) => {
    io.emit("sessionTerminated", { sessionId });
  });

  socket.on("leaveChat", ({ userId, friendId }) => {
    delete activeChatRooms[String(userId)];
    const friendSocket = users[String(friendId)];
    if (friendSocket) io.to(friendSocket).emit("presenceUpdate", { friendId: userId, inChat: false });
  });

    // 🔥 Sync Mute Settings across tabs/components
  socket.on("muteSettingsUpdated", (data) => {
    io.emit("muteSettingsUpdated", data); // 📢 Use io.emit to sync all components
  });

socket.on("registerUser", (userId) => {
  currentUserId = String(userId);
  users[currentUserId] = socket.id;

  const now = new Date().toISOString();

  const updateSql = `UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?`;
  db.query(updateSql, [now, userId], () => {

    // ✅ Active status check
    db.query("SELECT active_status FROM users WHERE id=?", [userId], (err, result) => {
      const isActive = result?.[0]?.active_status;

      if (isActive) {
        socket.broadcast.emit("userOnline", { userId: currentUserId });
      }
    });

    // ✅ Send online users list
    socket.emit("getOnlineUsers", Object.keys(users));

const deliverSql = `
UPDATE messages 
SET status = 'delivered' 
WHERE receiver_id = ? 
AND status = 'sent'
`;

db.query(deliverSql, [userId], (err, result) => {
  if (!err && result.affectedRows > 0) {

    // 🔥 FIND ALL SENDERS
    db.query(
      "SELECT DISTINCT sender_id FROM messages WHERE receiver_id=?",
      [userId],
      (err2, rows) => {
        if (!err2) {
          rows.forEach(row => {
            const senderSocket = users[String(row.sender_id)];
            if (senderSocket) {
              io.to(senderSocket).emit("messageStatusUpdate", {
                friendId: userId,
                status: "delivered",
                all: true
              });
            }
          });
        }
      }
    );
  }
});

    console.log("Online users:", users);
  });
});

// 🔥 Relay friend request notification
socket.on("friendRequestSent", ({ to, from }) => {
  const receiverSocket = users[String(to)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("newFriendRequest", { from });
  }
});

// 🔥 Relay friend request accepted/rejected
socket.on("friendRequestAccepted", ({ to, from }) => {
  const receiverSocket = users[String(to)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("friendRequestAccepted", { from });
  }
});

socket.on("friendRequestRejected", ({ to, from }) => {
  const receiverSocket = users[String(to)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("friendRequestRejected", { from });
  }
});

const getInitialStatus = async (receiverId, senderId) => {
  const receiverSocket = users[String(receiverId)];
  if (!receiverSocket) return { status: 'sent', isViewed: 0 };

  // Check receiver's read receipts preference
  const [rows] = await db.promise().query("SELECT read_receipts FROM users WHERE id = ?", [receiverId]);
  const canSeeRead = rows?.[0]?.read_receipts;
  const inChat = activeChatRooms[String(receiverId)] === String(senderId);

  if (canSeeRead && inChat) return { status: 'read', isViewed: 1 };
  if (inChat) return { status: 'delivered', isViewed: 1 }; // Dono chat mein hain par privacy OFF hai
  return { status: 'delivered', isViewed: 0 };
};

socket.on("getFriendStatus", ({ friendId }) => {
  const isOnline = users[String(friendId)];

  // 🔥 DB se active_status lao
  db.query("SELECT active_status, last_seen FROM users WHERE id = ?", [friendId], (err, result) => {
    if (err || !result.length) return;

    const active_status = result[0].active_status;
    const lastSeen = result[0].last_seen;

    let status;

    if (isOnline && active_status) {
      status = "online";
    } else {
      status = "offline";
    }

    socket.emit("friendStatus", {
      userId: String(friendId),
      status,
      lastSeen: status === "offline" ? new Date(lastSeen).toISOString() : null
    });
  });
});

socket.on("sendMessage", async (data) => {
  const { sender, receiver, text, localId, replyTo, type } = data;

  // 🔥 FETCH ACTUAL DELETE MODE FROM DB (Don't trust client state)
  const u1 = Math.min(Number(sender), Number(receiver));
  const u2 = Math.max(Number(sender), Number(receiver));

  const [settings] = await db.promise().query(`
    SELECT delete_mode FROM chat_settings 
    WHERE (is_global = 1 AND user1=? AND user2=?)
    OR (is_global = 0 AND owner_id=? AND user1=? AND user2=?)
    ORDER BY is_global DESC, id DESC LIMIT 1
  `, [u1, u2, sender, u1, u2]);

  const deleteMode = settings.length ? settings[0].delete_mode : "never";

  const { status, isViewed } = await getInitialStatus(receiver, sender);

  // 🔥 delete logic
  let deleteAt = null;

  if (deleteMode === "24_hours") {
    deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const sql = `
  INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, local_id, reply_to, delete_mode, delete_at, is_viewed) 
  VALUES (
    ${db.escape(sender)}, 
    ${db.escape(receiver)}, 
    ${db.escape(text)}, 
    ${db.escape(status)}, 
    ${db.escape(type || 'text')}, 
    ${db.escape(localId)},
    ${db.escape(replyTo)},
    ${db.escape(deleteMode || 'never')},
    ${db.escape(deleteAt)},
    ${isViewed}
  )
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Message save error:', err);
      return io.to(socket.id).emit("messageSent", { localId, status: 'error' });
    }

    const receiverSocket = users[String(receiver)];

    const messageData = {
      ...data,
      id: result.insertId,
      replyTo: data.replyTo || null,
      status: status,
      deleteMode: deleteMode || "never"
    };

    // 📤 send to receiver
    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", messageData);
    }

    // 📤 send back to sender
    io.to(socket.id).emit("messageSent", { 
      localId, 
      status, 
      id: result.insertId,
      replyTo: data.replyTo || null
    });
  });
});


socket.on("messageOpened", async ({ messageId }) => {
  const [rows] = await db.promise().query(
    "SELECT delete_mode, delete_at FROM messages WHERE id = ?",
    [messageId]
  );

  if (rows[0]?.delete_mode === "after_view" && !rows[0]?.delete_at) {
    // 🔥 1 minute baad delete karne ke liye DB mein timestamp update karein
    await db.promise().query(
      "UPDATE messages SET delete_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id = ?",
      [messageId]
    );

    // 🔥 1 minute (60000ms) ka delay timer
    setTimeout(async () => {
      await db.promise().query("DELETE FROM messages WHERE id = ?", [messageId]);
      io.emit("messageDeleted", { messageId });
    }, 60000);
  }
});

socket.on("send_voice", async (data) => {
  const { senderId, receiverId, audioUrl, duration, localId, time } = data;

  // 🔥 FETCH ACTUAL DELETE MODE FROM DB
  const u1 = Math.min(Number(senderId), Number(receiverId));
  const u2 = Math.max(Number(senderId), Number(receiverId));

  const [settings] = await db.promise().query(`
    SELECT delete_mode FROM chat_settings 
    WHERE (is_global = 1 AND user1=? AND user2=?)
    OR (is_global = 0 AND owner_id=? AND user1=? AND user2=?)
    ORDER BY is_global DESC, id DESC LIMIT 1
  `, [u1, u2, senderId, u1, u2]);

  const deleteMode = settings.length ? settings[0].delete_mode : "never";

  const { status, isViewed } = await getInitialStatus(receiverId, senderId);

  // 🔥 delete logic
  let deleteAt = null;
  if (deleteMode === "24_hours") {
    deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const sql = `
  INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, duration, local_id, delete_mode, delete_at, is_viewed) 
  VALUES (
    ${db.escape(senderId)}, 
    ${db.escape(receiverId)}, 
    ${db.escape(audioUrl)}, 
    ${db.escape(status)}, 
    'voice', 
    ${db.escape(duration || 0)},
    ${db.escape(localId)},
    ${db.escape(deleteMode || 'never')},
    ${db.escape(deleteAt)},
    ${isViewed}
  )`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Voice save error:", err);
      return;
    }

    const receiverSocket = users[String(receiverId)];

    const msgData = {
      id: result.insertId,
      localId,
      sender: senderId,
      receiver: receiverId,
      message: audioUrl,
      type: "voice",
      duration,
      status: status,
      deleteMode: deleteMode || "never",
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", msgData);
    }

    io.to(socket.id).emit("messageSent", msgData);
  });
});

// ❤️ REACTION SYSTEM
socket.on("sendReaction", async (data) => {

  const { messageId, userId, emoji, toUserId } = data; // ✅ pehle ye

  if (!messageId) {
    console.log("❌ messageId missing");
    return;
  }

  try {
    let [rows] = await db.promise().query(
      "SELECT reactions FROM messages WHERE id = ?",
      [messageId]
    );

    let reactions = rows[0]?.reactions;

    // ✅ SAFE PARSE (IMPORTANT)
    if (typeof reactions === "string") {
      reactions = JSON.parse(reactions);
    }

    reactions = reactions || {};

    // ✅ add/update reaction
    reactions[userId] = emoji;

    await db.promise().query(
      "UPDATE messages SET reactions = ? WHERE id = ?",
      [JSON.stringify(reactions), messageId]
    );

    socket.emit("reactionUpdated", {
      messageId,
      reactions
    });

    const receiverSocket = users[String(toUserId)];
    if (receiverSocket) {
      io.to(receiverSocket).emit("reactionUpdated", {
        messageId,
        reactions
      });
    }

  } catch (err) {
    console.error("Reaction error:", err);
  }
});
socket.on("messageRead", (data) => {
  const { sender, id } = data;
  if (!id) return;

  db.query("SELECT delete_mode, delete_at, sender_id FROM messages WHERE id = ?", [id], (err, msgRows) => {
    if (err || !msgRows.length) return;
    const { delete_mode, delete_at, sender_id } = msgRows[0];

    // 🔥 1. TIMER START
    if (delete_mode === 'after_view' && !delete_at) {
      db.query("UPDATE messages SET delete_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id=?", [id]);
      setTimeout(() => {
        db.query("DELETE FROM messages WHERE id = ?", [id], () => io.emit("messageDeleted", { messageId: id }));
      }, 60000);
    }

    // 🔥 2. BLUE TICK LOGIC
    db.query("SELECT read_receipts FROM users WHERE id=?", [currentUserId], (err, result) => {
      if (!err && result?.[0]?.read_receipts) {
        // Status tabhi badlein agar message pehle kabhi nahi dekha gaya (is_viewed=0)
        db.query("UPDATE messages SET status='read', is_viewed=1 WHERE id=? AND status='delivered' AND is_viewed=0", [id], (err2, res2) => {
          if (res2.affectedRows > 0) {
            const senderSocket = users[String(sender_id)];
            if (senderSocket) io.to(senderSocket).emit("messageStatusUpdate", { id, status: "read" });
          }
        });
      } else {
        // Privacy OFF hai, toh sirf viewed mark karein taaki baad mein blue tick na ho
        db.query("UPDATE messages SET is_viewed = 1 WHERE id = ?", [id]);
      }
    });
  });
});

socket.on("markAllAsRead", ({ senderId, receiverId }) => {
  // 1. Timer start karein
  db.query(
    "SELECT id FROM messages WHERE sender_id=? AND receiver_id=? AND delete_mode='after_view' AND delete_at IS NULL",
    [senderId, receiverId],
    (err, rows) => {
      if (!err) {
        rows.forEach(row => {
          db.query("UPDATE messages SET delete_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id=?", [row.id]);
          setTimeout(() => {
            db.query("DELETE FROM messages WHERE id = ?", [row.id], () => io.emit("messageDeleted", { messageId: row.id }));
          }, 60000);
        });
      }
    }
  );

  // 2. Status update logic (Respects Privacy & Silent Views)
  db.query("SELECT read_receipts FROM users WHERE id=?", [receiverId], (err, res) => {
    if (!err && res?.[0]?.read_receipts) {
      // Pehle wo IDs nikalein jo sach mein 'read' honi chahiye (is_viewed = 0)
      const findSql = "SELECT id FROM messages WHERE sender_id=? AND receiver_id=? AND status='delivered' AND is_viewed=0";
      db.query(findSql, [senderId, receiverId], (errF, rows) => {
        if (!errF && rows.length > 0) {
          const ids = rows.map(r => r.id);
          const updateSql = "UPDATE messages SET status='read', is_viewed=1 WHERE id IN (?)";
          db.query(updateSql, [ids], (errU) => {
            if (!errU) {
              const senderSocket = users[String(senderId)];
              if (senderSocket) {
                io.to(senderSocket).emit("messageStatusUpdate", { 
                  friendId: receiverId, 
                  status: "read", 
                  messageIds: ids // 🔥 IDs bhejein na ki 'all: true'
                });
              }
            }
          });
        }
      });
      // Mark everything else as viewed silently
      db.query("UPDATE messages SET is_viewed=1 WHERE sender_id=? AND receiver_id=? AND status='delivered'", [senderId, receiverId]);
    } else {
      // Privacy OFF hai, sabko viewed mark kar do (silently)
      db.query("UPDATE messages SET is_viewed=1 WHERE sender_id=? AND receiver_id=? AND status='delivered'", [senderId, receiverId]);
    }
  });
});



  socket.on("typing", (data) => {
  const receiverSocket = users[String(data.receiver)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("typing", data);
  }
});
  socket.on("stopTyping", (data) => {
    const receiverSocket = users[String(data.receiver)];
    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", data);
    }
  });
socket.on("recording", (data) => {
  const receiverSocket = users[String(data.receiver)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("recording", data);
  }
});
socket.on("stopRecording", (data) => {
  const receiverSocket = users[String(data.receiver)];
  if (receiverSocket) {
    io.to(receiverSocket).emit("stopRecording", data);
  }
});
socket.on("disconnect", () => {
  if (currentUserId) {

    // Clean up chat presence on disconnect
    const myFriendId = activeChatRooms[currentUserId];
    if (myFriendId) {
      const fSock = users[myFriendId];
      if (fSock) io.to(fSock).emit("presenceUpdate", { friendId: currentUserId, inChat: false });
    }
    delete activeChatRooms[currentUserId];

    // 🔥 REMOVE FROM CALL LIST
    inCallUsers.delete(String(currentUserId));

    delete users[currentUserId];

   const now = new Date().toISOString();
    const updateSql = `UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?`;
    db.query(updateSql, [now, currentUserId], () => {
      io.emit("userOffline", { userId: currentUserId, lastSeen: now });
      io.emit("getOnlineUsers", Object.keys(users));
    });
  }
});


socket.on("callUser", ({ to, from, name, callType }) => {
  console.log("Call request:", from, "→", to);
  console.log("Socket ID mapping:", to, "->", users[String(to)]);

  // 🔥 CALL START LOG (YAHI ADD KARNA HAI)
  const typeValue = callType === "video" ? "video_call" : "voice_call";

  const startMsg = `📞 ${callType === "video" ? "Video" : "Voice"} Call Started`;

  const sql = `INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, duration) 
  VALUES (
    ${db.escape(from)}, 
    ${db.escape(to)}, 
    ${db.escape(startMsg)}, 
    'sent', 
    ${db.escape(typeValue)},
    0
  )`;

  db.query(sql, (err) => {
    if (err) {
      console.error("❌ Call start save error:", err);
    }
  });

  // ❌ receiver busy
  if (inCallUsers.has(String(to))) {
    return io.to(users[String(from)]).emit("userBusy");
  }

  // ❌ caller busy
  if (inCallUsers.has(String(from))) {
    return;
  }

  // ✅ mark caller busy
  inCallUsers.add(String(from));

  const receiverSocket = users[String(to)];

  if (receiverSocket) {
    io.to(receiverSocket).emit("incomingCall", {
      from,
      name,
      callType
    });
  }
});

socket.on("endCall", ({ from, to, duration=0, callType }) => {
  console.log("Call ended:", from, "↔", to);

  inCallUsers.delete(String(from));
  inCallUsers.delete(String(to));

  const senderSocket = users[String(from)];
  const receiverSocket = users[String(to)];

  // 🔥 FORMAT
  const icon = callType === "video" ? "📹" : "📞";
  const typeText = callType === "video" ? "Video" : "Voice";

  let callLogMsg = `${icon} ${typeText} Call Ended`;

  if (duration !== undefined) {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const timeString = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    callLogMsg = `${icon} ${typeText} call ended • ${timeString}`;
  }

  // ✅ TYPE
  const typeValue = callType === "video" ? "video_call" : "voice_call";

  // ✅ SAVE IN DB
  const sql = `INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, duration) 
  VALUES (
    ${db.escape(from)}, 
    ${db.escape(to)}, 
    ${db.escape(callLogMsg)}, 
    'read', 
    ${db.escape(typeValue)},
    ${db.escape(duration || 0)}
  )`;

 db.query(sql, (err) => {
  if (err) {
    console.error("❌ DB Error saving call log:", err.sqlMessage || err);
  } else {
    console.log("✅ Call END saved in DB");
  }

  const msgData = {
    localId: `sys_${Date.now()}_${from}_${to}`,
    sender: from,
    receiver: to,
    text: callLogMsg,
    type: typeValue,
    duration: duration || 0,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'read'
  };

  if (receiverSocket) {
    io.to(receiverSocket).emit("receiveMessage", msgData);
    io.to(receiverSocket).emit("callEnded", msgData);
  }

  if (senderSocket) {
    io.to(senderSocket).emit("callEnded");
  }
});
});
socket.on("answerCall", ({ to, from }) => {
  console.log("Call accepted:", from, "↔", to);

  // ✅ dono busy
  inCallUsers.add(String(from));
  inCallUsers.add(String(to));

  const receiverSocket = users[String(to)];

  if (receiverSocket) {
    io.to(receiverSocket).emit("callAccepted");
  }
});
socket.on("rejectCall", ({ to, from, callType }) => {
  console.log("Call rejected:", from, "→", to);

  inCallUsers.delete(String(from));
  inCallUsers.delete(String(to));

  const receiverSocket = users[String(to)];

  // 🔥 FORMAT
  const icon = callType === "video" ? "📹" : "📞";
  const typeText = callType === "video" ? "Video" : "Voice";
  const dbMsg = `❌ ${icon} ${typeText} Missed Call`;

  // ✅ FIX TYPE
  const typeValue = callType === "video" ? "video_call" : "voice_call";

  // ✅ FIX SQL: Sender=Caller(to), Receiver=Rejector(from)
  const sql = `INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, duration) 
  VALUES (
    ${db.escape(to)}, 
    ${db.escape(from)}, 
    ${db.escape(dbMsg)}, 
    'read', 
    ${db.escape(typeValue)},
    0
  )`;

  db.query(sql, (err) => {
    if (err) {
      console.error("❌ DB Error saving reject log:", err.sqlMessage || err);
    }

    if (receiverSocket) {
      io.to(receiverSocket).emit("callRejected");
    }
  });
});


socket.on("offer", ({ to, from, offer }) => {
  const receiverSocket = users[String(to)];
  console.log(`Relaying OFFER from ${from} to ${to} (${receiverSocket})`);
  if (receiverSocket) {
    io.to(receiverSocket).emit("offer", { offer, from });
  }
});

socket.on("answer", ({ to, from, answer }) => {
  const receiverSocket = users[String(to)];
  console.log(`Relaying ANSWER from ${from} to ${to} (${receiverSocket})`);
  if (receiverSocket) {
    io.to(receiverSocket).emit("answer", { answer, from });
  }
});

socket.on("ice-candidate", ({ to, from, candidate }) => {
  const receiverSocket = users[String(to)];
  console.log(`Relaying ICE from ${from} to ${to}`);
  if (receiverSocket) {
    io.to(receiverSocket).emit("ice-candidate", {
      candidate,
      from   // 🔥 ADD THIS
    });
  }
});

socket.on("deleteMessage", async ({ messageId, sender, receiver }) => {

  if (!messageId) return;

  try {
    // ✅ DB se delete
    await db.promise().query(
      "DELETE FROM messages WHERE id = ?",
      [messageId]
    );

    // ✅ sender ko update
    socket.emit("messageDeleted", { messageId });

    // ✅ receiver ko update
    const receiverSocket = users[String(receiver)];
    if (receiverSocket) {
      io.to(receiverSocket).emit("messageDeleted", { messageId });
    }

  } catch (err) {
    console.error("Delete error:", err);
  }
});

socket.on("deleteForMe", async ({ messageId, userId }) => {

  if (!messageId || !userId) return;

  try {
    await db.promise().query(
      "INSERT INTO deleted_messages (user_id, message_id) VALUES (?, ?)",
      [userId, messageId]
    );

    socket.emit("messageDeletedForMe", { messageId });

  } catch (err) {
    console.error("Delete for me error:", err);
  }
});
socket.on("editMessageEveryone", async ({ messageId, newText, sender, receiver }) => {

  if (!messageId) return;

  try {
    await db.promise().query(
      "UPDATE messages SET message = ?, is_edited = 1 WHERE id = ?",
      [newText, messageId]
    );

    const data = { messageId, newText, isEdited: true };

    socket.emit("messageEdited", data);

    const receiverSocket = users[String(receiver)];
    if (receiverSocket) {
      io.to(receiverSocket).emit("messageEdited", data);
    }

  } catch (err) {
    console.error("Edit error:", err);
  }
});

socket.on("editMessageForMe", async ({ messageId, userId, newText }) => {

  if (!messageId || !userId) return;

  try {
 await db.promise().query(
  `INSERT INTO edited_messages (user_id, message_id, edited_text) 
   VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE edited_text = ?`,
  [userId, messageId, newText, newText]
);

    socket.emit("messageEditedForMe", { messageId, newText });

  } catch (err) {
    console.error("Edit for me error:", err);
  }
});

socket.on("send_media", async (data) => {
  const { senderId, receiverId, mediaUrl, mediaType, localId, time, duration } = data;

  // 🔥 FETCH ACTUAL DELETE MODE FROM DB
  const u1 = Math.min(Number(senderId), Number(receiverId));
  const u2 = Math.max(Number(senderId), Number(receiverId));

  const [settings] = await db.promise().query(`
    SELECT delete_mode FROM chat_settings 
    WHERE (is_global = 1 AND user1=? AND user2=?)
    OR (is_global = 0 AND owner_id=? AND user1=? AND user2=?)
    ORDER BY is_global DESC, id DESC LIMIT 1
  `, [u1, u2, senderId, u1, u2]);

  const deleteMode = settings.length ? settings[0].delete_mode : "never";

  const { status, isViewed } = await getInitialStatus(receiverId, senderId);

  // 🔥 delete logic
  let deleteAt = null;
  if (deleteMode === "24_hours") {
    deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const sql = `
  INSERT INTO messages 
  (sender_id, receiver_id, message, status, type, local_id, duration, delete_mode, delete_at, is_viewed) 
  VALUES (
    ${db.escape(senderId)}, 
    ${db.escape(receiverId)}, 
    ${db.escape(mediaUrl)}, 
    ${db.escape(status)}, 
    ${db.escape(mediaType)},
    ${db.escape(localId)},
    ${db.escape(duration || 0)},
    ${db.escape(deleteMode || 'never')},
    ${db.escape(deleteAt)},
    ${isViewed}
  )`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Media save error:", err);
      return;
    }

    const receiverSocket = users[String(receiverId)];

    const msgData = {
      id: result.insertId,
      localId,
      sender: senderId,
      receiver: receiverId,
      message: mediaUrl,
      type: mediaType,
      duration: duration || 0,
      status: status,
      deleteMode: deleteMode || "never",
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", msgData);
    }

    io.to(socket.id).emit("messageSent", msgData);
  });
});



});


app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    console.error("Server Error:", err.message);
    return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  }
  next();
});



app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});