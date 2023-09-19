var mysql = require('mysql');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "siteGremio"
});
con.connect(function (err) {
    if (err) throw err;
    console.log("Conectado!");

    var sql2 = "CREATE TABLE usuarios (idUsuario INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(50), email VARCHAR(255), senha VARCHAR(255), fotoPerfil VARCHAR(255), insta VARCHAR(255), twitter VARCHAR(255), emailContato VARCHAR(255), sobreMim VARCHAR(999), classificacao VARCHAR(50), nivel INT)";
    con.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("Tabela criada");
        const senha = "senhaAdmin123";
        bcrypt.hash(senha, saltRounds, function (err, hash) {
            var sqlInsertData = "INSERT INTO usuarios (nome, email, senha, nivel, classificacao) VALUES ?";
            var adminC = "Administrador";
            var values = [
                ['admin', 'admin@gmail.com', hash, 1, adminC],
            ];
            con.query(sqlInsertData, [values], function (err, result) {
                if (err) throw err;
                console.log("Dados inseridos na tabela");
            });
        });
    });

    var sql3 = "CREATE TABLE noticias (idNoticia INT AUTO_INCREMENT PRIMARY KEY, tituloNoticia VARCHAR(255), resumoNoticia VARCHAR(500), imagensNoticia VARCHAR(255), resumoImagem VARCHAR(255), revisao VARCHAR(255), textoRevisao VARCHAR(255), textoNoticia VARCHAR(5000), dataHora DATETIME)";
    con.query(sql3, function (err, result) {
        if (err) throw err;
        console.log("Tabela criada");
    });

    var sql4 = "CREATE TABLE comentarios (idComentario INT AUTO_INCREMENT PRIMARY KEY, noticia_id INT, usuario INT, FOREIGN KEY (noticia_id) REFERENCES noticias(idNoticia), FOREIGN KEY (usuario) REFERENCES usuarios(idUsuario), comentario VARCHAR(500))";
    con.query(sql4, function (err, result) {
        if (err) throw err;
        console.log("Tabela criada");
    });

    var sqlCreateTable = "CREATE TABLE areas (idArea INT AUTO_INCREMENT PRIMARY KEY, area VARCHAR(255))";
    con.query(sqlCreateTable, function (err, result) {
        if (err) throw err;
        console.log("Tabela criada");

        var sqlInsertData = "INSERT INTO areas (area) VALUES ('Esporte'), ('Ensino'), ('Comunicação'), ('Estrutura'), ('Outros')";
        con.query(sqlInsertData, function (err, result) {
            if (err) throw err;
            console.log("Dados inseridos na tabela");
        });
    });

    var sql6 = "CREATE TABLE avaliacoes (idAvaliacao INT AUTO_INCREMENT PRIMARY KEY, usuario INT, FOREIGN KEY (usuario) REFERENCES usuarios(idUsuario), area INT, FOREIGN KEY (area) REFERENCES areas(idArea), mensagem VARCHAR(255), estrelas VARCHAR(5))";
    con.query(sql6, function (err, result) {
        if (err) throw err;
        console.log("Tabela criada");
    });

    sql2 = "CREATE TABLE chat (id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, enviou_id INT , mensagem VARCHAR(500),FOREIGN KEY (enviou_id) REFERENCES usuarios(idUsuario), recebeu_id INT, FOREIGN KEY (enviou_id) REFERENCES usuarios(idUsuario))";
    con.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("Tabela chat criada");
    });
});
