const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  // 🔥 handle "Bearer TOKEN"
  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {

    const decoded = jwt.verify(token, "secretkey");

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({ message: "Invalid token" });

  }

};