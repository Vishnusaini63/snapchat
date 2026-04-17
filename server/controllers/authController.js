const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// 📱 Helper to clean Device Name
const getDeviceName = (ua) => {
  if (!ua) return "Unknown Device";
  const str = ua.toLowerCase(); // 🔥 Sabse pehle lowercase karo
  
  let os = "Device";
  // Priority logic for OS detection
  if (str.includes("windows")) os = "Windows PC";
  else if (str.includes("iphone")) os = "iPhone";
  else if (str.includes("ipad")) os = "iPad";
  else if (str.includes("android")) os = "Android Phone";
  else if (str.includes("macintosh") || str.includes("mac os x")) os = "Mac / MacBook";
  else if (str.includes("linux")) os = "Linux PC";
  else os = "Unknown Device";

  let browser = "Browser";
  // Browser detection logic
  if (str.includes("edg")) browser = "Edge";
  else if (str.includes("opr") || str.includes("opera")) browser = "Opera";
  else if (str.includes("firefox")) browser = "Firefox";
  else if (str.includes("chrome")) browser = "Chrome";
  else if (str.includes("safari") && !str.includes("chrome")) browser = "Safari";
  else if (str.includes("safari")) browser = "Safari";

  return `${os} (${browser})`;
};

// ================= REGISTER =================
exports.register = async (req, res) => {

  const { username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  // 👇 default avatar
  const defaultAvatar = "https://i.pravatar.cc/150?img=1";

const sql = "INSERT INTO users (username,email,password,profile_pic) VALUES (?,?,?,?)";

  db.query(sql, [username, email, hashedPassword, defaultAvatar], (err) => {

    if (err) {
      return res.status(500).json({ message: "Email already exists" });
    }

    res.json({ message: "User registered successfully" });

  });

};


// ================= LOGIN =================
exports.login = (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email=?";

  db.query(sql, [email], async (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Wrong password" });
    }

    // 🔐 Check Two-Factor Authentication
    if (user.two_factor_auth) {
      const twoFaId = crypto.randomBytes(16).toString("hex");
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const sqlUpdate = "UPDATE users SET two_fa_id=?, two_fa_code=?, two_fa_status='pending' WHERE id=?";
      db.query(sqlUpdate, [twoFaId, code, user.id], async (updateErr) => {
        if (updateErr) return res.status(500).json(updateErr);

        // Send Email Code
        try {
          const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: "sainivishnu2103@gmail.com", pass: "fcdu lvpv zcfr rqfg" } });
          await transporter.sendMail({ from: "Snapchat Clone", to: user.email, subject: "Your 2FA Code", html: `<h3>Your Login Verification Code is: ${code}</h3>` });
        } catch (e) { console.log("2FA Mail Error:", e); }

        return res.json({
          message: "2FA Required",
          twoFactorRequired: true,
          twoFaId,
          userId: user.id
        });
      });
      return;
    }

    // 🔐 JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      "secretkey",
      { expiresIn: "1d" }
    );

    // 📱 Record Session
    const device = getDeviceName(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection.remoteAddress;

 db.query(
  "INSERT INTO user_sessions (user_id, token, device_name, ip_address) VALUES (?, ?, ?, ?)",
  [user.id, token, device, ip],
  (err, sessionResult) => {

    if (err) {
      console.log("Session insert error:", err);
      return res.status(500).json({ message: "Session error" });
    }

    res.json({
      message: "Login successful",
      token,
      sessionId: sessionResult.insertId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_pic: user.profile_pic
      }
    });
  }
);
  });

};


// ================= PROFILE =================
exports.getProfile = (req, res) => {

  const userId = req.user.id;

  // 👇 avatar bhi add karo
  const sql = "SELECT id, username, email, profile_pic FROM users WHERE id=?";

  db.query(sql, [userId], (err, result) => {

    if (err) return res.status(500).json(err);

    // 👇 clean response (best practice)
    res.json({
      user: result[0]
    });

  });

};


// ================= FORGOT PASSWORD =================
exports.forgotPassword = (req, res) => {

  const { email } = req.body;

  const token = crypto.randomBytes(32).toString("hex");

  const expire = new Date(Date.now() + 3600000); // 1 hour

  const sql =
    "UPDATE users SET reset_token=?, reset_token_expire=? WHERE email=?";

  db.query(sql, [token, expire, email], async (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    try {

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "sainivishnu2103@gmail.com",
          pass: "fcdu lvpv zcfr rqfg" // 🔐 app password
        }
      });
const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

      await transporter.sendMail({
        from: "Snapchat Clone",
        to: email,
        subject: "Reset Password",
        html: `<a href="${resetLink}">Reset Password</a>`
      });

      res.json({ message: "Reset email sent" });

    } catch (error) {

      console.log("Email error:", error);

      res.status(500).json({
        message: "Email sending failed ❌"
      });

    }

  });

};


// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {

  const { token } = req.params;
  const { password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql =
   "UPDATE users SET password=?, reset_token=NULL, reset_token_expire=NULL WHERE reset_token=? AND reset_token_expire > NOW()"

  db.query(sql, [hashedPassword, token], (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.json({ message: "Password reset successful" });

  });

};

// ================= VERIFY 2FA =================
exports.verify2FA = (req, res) => {
  const { userId, code, twoFaId } = req.body;
  const sql = "SELECT * FROM users WHERE id=? AND two_fa_id=?";

  db.query(sql, [userId, twoFaId], async (err, result) => {
    if (err || result.length === 0) return res.status(400).json({ message: "Invalid 2FA session" });

    const user = result[0];

    // Strictly verify email code only
    if (user.two_fa_code !== code) {
      return res.status(401).json({ message: "Incorrect code" });
    }

    if (user.two_fa_status === 'rejected') {
      return res.status(403).json({ message: "Login request was denied" });
    }

    db.query("UPDATE users SET two_fa_id=NULL, two_fa_code=NULL, two_fa_status=NULL WHERE id=?", [userId]);
    const token = jwt.sign({ id: user.id, email: user.email }, "secretkey", { expiresIn: "1d" });

    const device = getDeviceName(req.headers['user-agent'] || '');
    const ip = req.ip || req.connection.remoteAddress;
    db.query("INSERT INTO user_sessions (user_id, token, device_name, ip_address) VALUES (?, ?, ?, ?)", [user.id, token, device, ip], (err, sessionResult) => {
      res.json({
        token,
        sessionId: sessionResult.insertId, // 🔥 Send Session ID
        user: { id: user.id, username: user.username, email: user.email, profile_pic: user.profile_pic }
      });
    });
  });
};

// ================= GET LOGIN ACTIVITY =================
exports.getLoginActivity = (req, res) => {
  const userId = req.user.id;
  let currentToken = req.headers.authorization?.split(" ")[1];
  
  if (!currentToken) return res.status(401).json({ message: "No token" });

  const sql = "SELECT id, device_name, ip_address, last_active, token FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY last_active DESC";
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    
    // Compare tokens to find "This Device"
    const sessions = results.map(s => ({
      ...s,
      isCurrent: String(s.token).trim() === String(currentToken).trim(),
      token: undefined // security: don't send tokens back
    }));
    res.json({ sessions });
  });
};

// ================= LOGOUT FROM DEVICE =================
exports.logoutDevice = (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;
  const sql = "UPDATE user_sessions SET is_active = 0 WHERE id = ? AND user_id = ?";

  db.query(sql, [sessionId, userId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Logged out from device successfully ✅" });
  });
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  const sql = "SELECT password FROM users WHERE id=?";

  db.query(sql, [userId], async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result[0];

    // 🔍 check current password
    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Current password doesn't match ❌"
      });
    }

    // 🔐 hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateSql = "UPDATE users SET password=? WHERE id=?";

    db.query(updateSql, [hashedPassword, userId], (err2) => {
      if (err2) return res.status(500).json(err2);

      res.json({ message: "Password changed successfully ✅" });
    });
  });
};

// ================= DELETE ACCOUNT =================
exports.deleteAccount = (req, res) => {
  const userId = req.user.id; // verifyToken se mila ID

  const sql = "DELETE FROM users WHERE id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "Account deleted successfully from database ✅" });
  });
};

// send friend request
exports.sendRequest = (req, res) => {
  const sender = req.user.id;
  const { receiverId } = req.body;

  const sql = "INSERT INTO friends (sender_id, receiver_id) VALUES (?,?)";

  db.query(sql, [sender, receiverId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Request sent" });
  });
};


// accept request
exports.acceptRequest = (req, res) => {
  const { requestId } = req.body;

  const sql = "UPDATE friends SET status='accepted' WHERE id=?";

  db.query(sql, [requestId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Friend added" });
  });
};

exports.getAllUsers = (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT id, username, email, profile_pic 
    FROM users 
    WHERE id != ?

    -- 🚫 BLOCKED USERS HIDE
    AND id NOT IN (
      SELECT 
        CASE 
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
      FROM friends
      WHERE 
        (sender_id = ? OR receiver_id = ?)
        AND status = 'blocked'
    )

    -- 🚫 ALREADY FRIENDS HIDE
    AND id NOT IN (
      SELECT 
        CASE 
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
      FROM friends
      WHERE 
        (sender_id = ? OR receiver_id = ?)
        AND status = 'accepted'
    )
  `;

  db.query(
    sql,
    [userId, userId, userId, userId, userId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    }
  );

};



// ================= GET FRIEND REQUESTS =================
exports.getRequests = (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT f.id, u.username, u.profile_pic
    FROM friends f
    JOIN users u ON f.sender_id = u.id
    WHERE f.receiver_id=? AND f.status='pending'
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });

};


exports.getFriends = (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT 
      u.id, 
      COALESCE(fn.nickname, u.username) AS username,
      u.profile_pic
    FROM friends f
    JOIN users u 
      ON (
        (f.sender_id = ? AND u.id = f.receiver_id)
        OR
        (f.receiver_id = ? AND u.id = f.sender_id)
      )
    LEFT JOIN friend_nicknames fn
      ON fn.friend_id = u.id AND fn.user_id = ?
    WHERE (f.sender_id=? OR f.receiver_id=?)
    AND f.status='accepted'
  `;

  db.query(sql, [userId, userId, userId, userId, userId], (err, result) => {
    if (err) {
      console.error("❌ getFriends error:", err);
      return res.status(500).json(err);
    }

    res.json(result);
  });

};
