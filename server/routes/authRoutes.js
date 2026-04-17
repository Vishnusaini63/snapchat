const express = require("express");
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  getAllUsers,
  sendRequest,
  acceptRequest,
  getRequests,
  getFriends,
  changePassword,
  deleteAccount,
  verify2FA,
  logoutDevice,
  getLoginActivity
} = require("../controllers/authController");

const verifyToken = require("../middleware/authMiddleware");

// Auth
router.post("/register", register);
router.post("/login", login);

// 2FA System
router.post("/verify-2fa", verify2FA);

// Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/change-password", verifyToken, changePassword);
router.delete("/delete-account", verifyToken, deleteAccount);
router.post("/logout-device", verifyToken, logoutDevice);
// Friend system
router.post("/send-request", verifyToken, sendRequest);
router.post("/accept-request", verifyToken, acceptRequest);

// Data
router.get("/profile", verifyToken, getProfile);
router.get("/users", verifyToken, getAllUsers);
router.get("/requests", verifyToken, getRequests);
router.get("/friends", verifyToken, getFriends);
// Is file mein verifyToken middleware pehle se import hona chahiye
router.get("/login-activity", verifyToken, getLoginActivity);

module.exports = router;
     