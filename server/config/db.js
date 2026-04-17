const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "vishnu@2103", // agar mysql password hai to yaha likho
  database: "snapchat_clone"
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed ❌");
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;