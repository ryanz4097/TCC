var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});
con.connect(function(err) {
    if (err) throw err;
    console.log("Conectado!");
    var sql = "CREATE DATABASE siteGremio"
    
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("Base de dados criada");
    });
    con.end();
  });
  
