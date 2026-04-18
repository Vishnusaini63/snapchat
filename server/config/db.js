const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("MySQL Pool Initialized ✅");
module.exports = db;