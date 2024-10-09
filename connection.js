var mysql = require("mysql");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "user_info",
});

con.connect(function (error) {
  if (error) throw error;
  else {
    console.log("Database connected");
  }
});

module.exports = con;
