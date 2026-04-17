const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection(
  process.env.DATABASE_URL || {
    host: "localhost",
    user: "root",
    password: "vishnu@2103",
    database: "snapchat_clone"
  }
);

db.connect((err) => {
  if (err) {
    console.log("Database connection failed ❌", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;