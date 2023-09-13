const express = require('express');
const mysql = require('mysql');
const formidable = require('formidable');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require("bcrypt");
const saltRounds = 10;
var session = require('express-session');
const app = express();
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.use(express.static("public"));
const moment = require('moment');

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: false,
    saveUninitialized: true
}));

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "siteGremio"
});
con.connect(function (err) {
    if (err) throw err;
    console.log("Conectado!");
});



/*---------------LOGIN---------------*/

app.get('/', function (req, res) {
    if (req.session.logado) {
        res.render('Menu/menu.ejs');
    }
    else {
        res.redirect('/login');
    }
})

app.get('/cadastro', function (req, res) {
    res.render('Login/cadastro.ejs', { mensagem: "1" });
});

app.post('/cadastro', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        var email = fields['email'];
        var senhaTamanho = fields['senha'];
        console.log(senhaTamanho.length);
        var sql = "SELECT * FROM usuarios where email = ?";
        con.query(sql, [email], function (err, result) {
            if (err) throw err;
            if (result.length) {
                req.session.sucesso = "Email já cadastrado"
                res.redirect('/cadastro');
            } else {
                var oldpath = files.imagem.filepath;
                var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
                var nomeimg = hash + '.' + files.imagem.mimetype.split('/')[1]
                var newpath = path.join(__dirname, 'public/imagens/', nomeimg);
                fs.rename(oldpath, newpath, function (err) {
                    if (err) throw err;
                });
                if (senhaTamanho.length >= 8) {
                    bcrypt.hash(fields['senha'], saltRounds, function (err, hash) {
                        var sql = "INSERT INTO usuarios (nome, email, senha, fotoPerfil, nivel) VALUES ?";
                        var values = [
                            [fields['nome'], fields['email'], hash, nomeimg, "3"]
                        ];
                        con.query(sql, [values], function (err, result) {
                            if (err) throw err;
                            console.log("Numero de registros inseridos: " + result.affectedRows);
                            req.session.sucesso = "Cadastro realizado com sucesso"
                            res.redirect('/login');
                        });
                    });
                } else {
                    res.render('Login/cadastro.ejs', { mensagem: "A senha deve ter mais de 8 digitos" })
                }
            }
        });
    });

})

app.get('/login', function (req, res) {
    res.render('Login/login.ejs', { mensagem: "1" });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
    })
    res.redirect('/login');
});

app.post('/login', function (req, res) {

    var senha = req.body['senha'];
    var email = req.body['email']
    req.session.mensagemSenha = "1"
    var sql = "SELECT * FROM usuarios where email = ?";
    con.query(sql, [email], function (err, result) {
        if (err) throw err;
        if (result.length) {
            bcrypt.compare(senha, result[0]['senha'], function (err, resultado) {
                if (err) throw err;
                if (resultado) {
                    req.session.logado = true;
                    req.session.username = result[0]['nome'];
                    req.session.foto = result[0]['fotoPerfil'];
                    req.session.usId = result[0]['idUsuario'];
                    req.session.nivelUs = result[0]['nivel'];
                    res.redirect('/menu')
                }
                else if (senha != result[0]['senha']) {
                    res.render('Login/login.ejs', { mensagem: "Senha inválida" })
                }
                else { res.render('Login/login.ejs', { mensagem: null }) }
            });
        }
        else { res.render('Login/login.ejs', { mensagem: "E-mail não encontrado" }) }
    });
});


/*---------------MENU---------------*/

app.get('/menu', function (req, res) {
    if (req.session.logado) {
        var nivel = req.session.nivelUs;
        var fotoUserLogado = req.session.foto;
        if (req.session.usId == 1) {
            var id = req.session.usId;

            const sql = "SELECT * FROM usuarios WHERE idUsuario=?"
            const sql2 = "SELECT * FROM noticias"
            const userId = parseInt(req.session.usId);

            con.query(sql, [id], function (err, result, fields) {
                if (err) throw err;
                const dadosUsuario = result[0];

                con.query(sql2, function (err, result) {
                    if (err) throw err;
                    const dadosNoticia = result;
                    res.render('Menu/menu.ejs', { dadosUsuario, id: userId, dadosNoticia, fotoUserLogado, nivel });
                });
            });
        } else {
            var id = req.session.usId
            const sql = "SELECT * FROM usuarios WHERE idUsuario=?"
            const sql2 = "SELECT * FROM noticias"
            con.query(sql, [id], function (err, result, fields) {
                if (err) throw err;
                const userId = parseInt(req.session.usId);
                const dadosUsuario = result[0];
                con.query(sql2, function (err, result) {
                    if (err) throw err;
                    const dadosNoticia = result;

                    res.render('Menu/menu.ejs', { dadosUsuario, id: userId, dadosNoticia, fotoUserLogado, nivel });
                });
            });
        }
    } else {
        res.redirect('/login');
    }
});


/*-----------------CHAT-----------------*/

app.post('/chat', function (req, res) {
    if (req.session.logado) {
        var usuario = req.session.username
        var usuarioid = req.session.usid
        var imagem = req.session.foto
        req.session.amigoid = req.body['id']
        var amigoid = req.body['id']
        var nivel = req.session.nivelUs
        var fotoUserLogado = req.session.foto
        var sql = "SELECT nome FROM usuarios WHERE idUsuario = ?"

        con.query(sql, [amigoid], function (err, result) {
            if (err) throw err;
            const nomeAmigo = result[0];
            res.render('Chat/chat.ejs', { imagem: imagem, usuario: usuario, usuarioid: usuarioid, amigoid: amigoid, nivel, fotoUserLogado, nomeAmigo })
        });
    }
    else {
        req.session.erro = "É necessário fazer login para acessar essa página"
        res.redirect('/login');
    }
});

app.get('/chatComum', function (req, res) {
    if (req.session.logado) {
        var perPage = 3
        var page = 0
        var usuario = req.session.username
        var usuarioid = req.session.usid
        var imagem = req.session.foto
        req.session.amigoid = 1
        var amigoid = 1
        var nivel = req.session.nivelUs
        var fotoUserLogado = req.session.foto
        console.log(req.session.nivel)
        var sql = "SELECT nome FROM usuarios WHERE idUsuario = ?"
        var quantidadeUsers = "SELECT * FROM usuarios WHERE nivel != ?"

        con.query(quantidadeUsers, nivel, function (err, result2, fields) {
            if (err) throw err;
            dadosUsuarios = result2;
            console.log(dadosUsuarios);
            if (dadosUsuarios.length > 1) {
                con.query(sql, [perPage, page], function (err, result, fields) {
                    if (err) throw err;
                    pages = Math.ceil(result2[0]['numero'] / perPage)
                    res.render('Chat/usuarios.ejs', { dadosUsuarios, usuario: usuario, usuarioid: usuarioid, current: page + 1, pages: pages, nivel, fotoUserLogado })
                });
            } else {
                con.query(sql, [amigoid], function (err, result) {
                    if (err) throw err;
                    const nomeAmigo = result;
                    res.render('Chat/chat.ejs', { imagem: imagem, usuario: usuario, usuarioid: usuarioid, amigoid: amigoid, nivel, fotoUserLogado, nomeAmigo })
                });
            }
        });


    }
    else {
        req.session.erro = "É necessário fazer login para acessar essa página"
        res.redirect('/login');
    }
});

app.get('/usuarios', function (req, res) {
    if (req.session.logado) {
        var perPage = 6
        var page = 0
        var usuario = req.session.username
        var usuarioid = req.session.usId
        var nivel = req.session.nivelUs
        var fotoUserLogado = req.session.foto
        var sql = "SELECT * FROM usuarios WHERE nivel != ?"
        contagem = "SELECT COUNT(*) as numero FROM usuarios";
        con.query(contagem, function (err, result2, fields) {
            if (err) throw err;
            con.query(sql, nivel, function (err, result, fields) {
                if (err) throw err;
                pages = Math.ceil(result2[0]['numero'] / perPage)
                res.render('Chat/usuarios.ejs', { dadosUsuarios: result, usuario: usuario, usuarioid: usuarioid, current: page + 1, pages: pages, nivel, fotoUserLogado })
            });
        });
    }
    else {
        req.session.erro = "É necessário fazer login para acessar essa página"
        res.redirect('/login');
    }
});


app.post('/recebemensagens', function (req, res) {
    usuario_logado = req.session.usId;
    amigo = req.session.amigoid;

    var sql = "INSERT INTO chat (enviou_id, recebeu_id, mensagem) VALUES ?";
    var values = [
        [usuario_logado, amigo, req.body['mensagem']]
    ];
    con.query(sql, [values], function (err, result) {
        if (err) throw err;
    });
    res.send("Mensagem salva");
});

app.post('/buscamensagens', function (req, res) {
    usuario_logado = req.session.usId;
    foto_logado = req.session.foto;
    amigo = req.session.amigoid;
    retorno = ""
    var sql = "SELECT * FROM usuarios where idUsuario= ? ORDER BY idUsuario;"
    con.query(sql, amigo, function (err, result, fields) {
        if (err) throw err;
        foto_amigo = result[0]['fotoPerfil'];
        valores = [usuario_logado, amigo, amigo, usuario_logado]
        sql2 = "SELECT * FROM chat WHERE (enviou_id=? && recebeu_id= ?) or (enviou_id=? && recebeu_id= ?) ORDER BY id  LIMIT 100;";
        con.query(sql2, valores, function (err, mensagens, fields) {
            if (err) throw err;
            mensagens.forEach(function (dados) {
                if (usuario_logado == dados['enviou_id']) {
                    retorno = retorno + "<div class='media media-chat media-chat-reverse'>" +
                        "<img class='avatar' src=imagens/" + foto_logado + ">" +
                        "<div class='media-body'>" +
                        "<p>" + dados['mensagem'] + "</p>" +
                        "</div>" +
                        "</div>" +
                        "<div class='media media-meta-day'> </div>"

                } else {
                    retorno = retorno + "<div class='media media-chat'>" +
                        "<img class='avatar' src=imagens/" + foto_amigo + ">" +
                        "<div class='media-body'>" +
                        "<p>" + dados['mensagem'] + "</p>" +
                        "</div>" +
                        "</div>" +
                        "<div class='media media-meta-day'> </div>"

                }
            })
            res.send(JSON.stringify(retorno));
        });
    })
});

/*---------------NOTÍCIAS---------------*/



app.post('/revisao/:id', function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 2) {
            var form = new formidable.IncomingForm();
            form.parse(req, (err, fields) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Erro ao processar o formulário.');
                }
                sql = 'UPDATE noticias SET revisao = ? WHERE idNoticia =?'
                sql2 = 'UPDATE noticias SET textoRevisao = ? WHERE idNoticia =?'
                var values =
                    [fields['textoRevisao']];
                con.query(sql, ["2", req.params.id], function (err) {
                    if (err) throw err;
                    con.query(sql2, [values, req.params.id], function (err) {
                        if (err) throw err;
                        res.redirect('/verNoticia/' + req.params.id);
                    });
                });
            });
        }
        else {
            res.redirect('/menu');
        }
    }
    else {
        res.redirect('/login');
    }
});

app.post('/finalizarRevisao/:id', function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 1) {
            sql = 'UPDATE noticias SET textoRevisao = NULL, revisao = 1 WHERE idNoticia = ?'
            con.query(sql, req.params.id, function (err) {
                if (err) throw err;
                res.redirect('/verNoticia/' + req.params.id);
            });
        } else {
            res.redirect('/menu');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/verNoticia/:id', function (req, res) {
    if (req.session.logado) {
        var idNoticia = req.params.id;
        var id = req.session.usId;
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;

        const sql = "SELECT * FROM noticias WHERE idNoticia=?";
        const sql2 = "SELECT * FROM usuarios WHERE idUsuario=?";
        const sql3 = "SELECT comentarios.*, usuarios.* FROM comentarios LEFT JOIN usuarios ON comentarios.usuario_id = usuarios.idUsuario WHERE noticia_id=?";

        con.query(sql, [idNoticia], function (err, result) {
            if (err) throw err;
            const noticiasEnviada = result[0];

            con.query(sql2, [id], function (err, result) {
                if (err) throw err;
                const userId = parseInt(req.session.usId);
                const dadosUsuario = result[0];

                const sql3 = `
                    SELECT comentarios.*, usuarios.fotoPerfil, usuarios.nome
                    FROM comentarios
                    JOIN usuarios ON comentarios.usuario = usuarios.idUsuario
                    WHERE comentarios.noticia_id = ?
                    `;
                con.query(sql3, [idNoticia], function (err, result) {
                    if (err) throw err;
                    const dadosComentarios = result;
                    res.render('Menu/noticiasTemplate.ejs', { dadosUsuario, id: userId, dadosEnviados: noticiasEnviada, dadosComentarios, fotoUserLogado, nivel });
                });
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/enviarComentario', function (req, res) {
    var comentario = req.body.comentario;
    var idUrlNoticia = req.body.idNoticia;
    var id = req.session.usId;

    var sql = "INSERT INTO comentarios (noticia_id, comentario, usuario) VALUES (?, ?, ?)";
    con.query(sql, [idUrlNoticia, comentario, id], function (err, result) {
        if (err) throw err;
        res.redirect('/verNoticia/' + idUrlNoticia);
    });
});

app.get('/criarNoticia', function (req, res) {
    if (req.session.logado) {
        var id = req.session.usId;
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;
        const sql = "SELECT * FROM usuarios where idUsuario=?"
        if (id == 1) {
            con.query(sql, [id], function (err, result, fields) {
                if (err) throw err;
                const userId = parseInt(req.session.usId);
                const dadosUsuario = result[0];
                res.render('Menu/criarNoticia.ejs', { dadosUsuario, id: userId, fotoUserLogado, nivel });
            });
        }
        else {
            res.redirect('/menu');
        }

    }
    else {
        res.redirect('/login');
    }
});

app.post('/postarNoticia', function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 1) {
            var form = new formidable.IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Erro ao processar o formulário.');
                }

                const conteudoNoticia = fields['conteudoNoticia'] ? fields['conteudoNoticia'].replace(/\n/g, '<br>') : '';

                var oldpath = files.imagem.filepath;
                var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
                var nomeimg = hash + '.' + files.imagem.mimetype.split('/')[1]
                var newpath = path.join(__dirname, 'public/imagens/', nomeimg);
                fs.rename(oldpath, newpath, function (err) {
                    if (err) throw err;
                });
                const dataHoraAtual = new Date();


                const dia = dataHoraAtual.getDate().toString().padStart(2, '0');
                const mes = (dataHoraAtual.getMonth() + 1).toString().padStart(2, '0');
                const ano = dataHoraAtual.getFullYear();


                const hora = dataHoraAtual.getHours().toString().padStart(2, '0');
                const minutos = dataHoraAtual.getMinutes().toString().padStart(2, '0');
                const segundos = dataHoraAtual.getSeconds().toString().padStart(2, '0');


                const dataHoraFormatada = `${ano}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;

                const sql = "INSERT INTO noticias (tituloNoticia, resumoNoticia, imagensNoticia, resumoImagem, textoNoticia, dataHora, revisao) VALUES ?";
                const values = [
                    [fields['titulo'], fields['resumo'], nomeimg, fields['resumoImagem'], conteudoNoticia, dataHoraFormatada, "1"]
                ];
                console.log(dataHoraAtual.getMonth)
                con.query(sql, [values], function (err, result) {
                    if (err) throw err;
                    console.log("Numero de registros inseridos: " + result.affectedRows);
                    req.session.sucesso = "Cadastro realizado com sucesso"
                    res.redirect('/menu')
                });
            });
        } else {
            res.redirect('/menu');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/perfilComentario/:usuario_id', function (req, res) {
    if (req.session.logado) {
        var usuarioId = req.params.usuario_id;
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;
        const sql = "SELECT * FROM usuarios WHERE idUsuario=?";
        const sql2 = "SELECT * FROM usuarios WHERE idUsuario=?";

        con.query(sql, [usuarioId], function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                const userId = parseInt(req.session.usId);
                const dadosUsuario = result[0];
                con.query(sql2, [usuarioId], function (err, result) {
                    const usuarioLogado = result[0];
                    if (err) throw err;
                    res.render('Perfil/perfil.ejs', { dadosUsuario, id: userId, usuarioLogado, fotoUserLogado, nivel, mensagem: "1" });
                });
            } else {
                res.redirect('/menu');
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/editarNoticia/:id', function (req, res) {
    const id = req.session.usId;
    const idNoticia = req.params.id;
    var nivel = req.session.nivelUs;
    var fotoUserLogado = req.session.foto;
    if (req.session.logado) {
        const nivel = req.session.nivelUs;
        if (nivel == 1) {
            const sql = "SELECT * FROM usuarios WHERE idUsuario=?"
            const sql2 = "SELECT * FROM noticias WHERE idNoticia=?"
            con.query(sql, [id], function (err, result) {
                if (err) throw err;
                const dadosUsuario = result[0];
                con.query(sql2, idNoticia, function (err, result) {
                    if (err) throw err;
                    const dadosNoticia = result[0];
                    res.render('Menu/editarNoticia.ejs', { dadosUsuario, id, fotoUserLogado, nivel, dadosNoticia });

                });
            });
        }
        else {
            res.redirect("/menu");
        }
    }
    else {
        res.redirect('/login');
    }
});

app.post('/enviarEdicaoNot/:id', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        var id = req.params.id;
        if (err) throw err;
        var sql = "UPDATE noticias SET tituloNoticia = ?, resumoNoticia = ?, resumoImagem = ? , textoNoticia = ? WHERE idNoticia = ?";
        var values = [
            [fields['tituloNotInput']],
            [fields['resumoNotInput']],
            [fields['resumoImgInput']],
            [fields['conteudoPosNot']],
            [id],
        ];
        con.query(sql, values, function (err, result) {
            if (err) throw err;
            console.log("Numero de registros alterados: " + result.affectedRows);
            if (files.imagem && files.imagem.size > 0) {
                var oldpath = files.imagem.filepath;
                var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
                var nomeimg = hash + '.' + files.imagem.mimetype.split('/')[1];
                var newpath = path.join(__dirname, 'public/imagens/', nomeimg);

                fs.rename(oldpath, newpath, function (err) {
                    if (err) throw err;
                    var inserirImagem = 'UPDATE noticias SET imagensNoticia = ? WHERE idNoticia = ?';
                    var values = [nomeimg, req.params.id];

                    con.query(inserirImagem, values, function (err) {
                        if (err) throw err;
                        console.log("Imagem da noticia atualizada.");
                        res.redirect('/menu');
                    });
                });
            } else {
                res.redirect('/menu');
            }
        });
    });
});

/*---------------AVALIAÇÕES---------------*/

app.get('/irAdicionar', function (req, res) {
    if (req.session.logado) {
        var id = req.session.usId
        var nivel = req.session.nivelUs;
        var fotoUserLogado = req.session.foto;
        const sql = "SELECT * FROM usuarios where idUsuario=?"
        const sql2 = "SELECT * FROM areas"
        con.query(sql, [id], function (err, result, fields) {
            if (err) throw err;
            const userId = parseInt(req.session.usId);
            const dadosUsuario = result[0];
            con.query(sql2, function (err, result) {
                if (err) throw err;
                const dadosAreas = result;
                res.render('Avaliacao/Sugerir.ejs', { dadosUsuario, id: userId, dadosAreas, fotoUserLogado, nivel });
            });
        });
    }
    else {
        res.redirect('/login');
    }
});

app.post('/adicionar', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        console.log('Valor da área selecionada:', fields['area']);
        var sql = "INSERT INTO avaliacoes (area, estrelas, mensagem) VALUES ?";
        var values = [[fields['area'], fields['estrela'], fields['mensagem']]];
        con.query(sql, [values], function (err, result) {
            if (err) throw err;
            console.log("Numero de registros inseridos: " + result.affectedRows);
        });
    });
    res.redirect('/menu');
});


app.get("/exibirAvaliacoes", function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 1) {


            const sql = `
        SELECT 
            areas.area, 
            AVG(avaliacoes.estrelas) AS media_estrelas 
        FROM avaliacoes 
        INNER JOIN areas ON avaliacoes.area = areas.idArea 
        GROUP BY areas.area
    `;

            con.query(sql, function (err, result) {
                if (err) throw err;
                const mediaAvaliacoesPorArea = result;

                var id = req.session.usId;
                var fotoUserLogado = req.session.foto;
                var nivel = req.session.nivelUs;
                const sql2 = "SELECT * FROM usuarios WHERE idUsuario=?";
                const userId = parseInt(req.session.usId);

                con.query(sql2, [id], function (err, result, fields) {
                    if (err) throw err;
                    const dadosUsuario = result[0];

                    const sql3 = "SELECT avaliacoes.idAvaliacao, areas.area, avaliacoes.estrelas, avaliacoes.mensagem FROM avaliacoes INNER JOIN areas ON avaliacoes.area = areas.idArea";
                    con.query(sql3, function (err, result) {
                        if (err) throw err;
                        const dadosAvaliacoes = result;
                        res.render('Avaliacao/Sugestoes.ejs', { dadosUsuario, id: userId, dadosAvaliacoes, mediaAvaliacoesPorArea, fotoUserLogado, nivel });
                    });
                });
            });
        } else {
            res.redirect('/menu');
        }
    } else {
        res.redirect('/login');
    }
});



/*---------------PERFIL---------------*/

app.get('/perfil', function (req, res) {
    if (req.session.logado) {
        var id = req.session.usId;
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;

        const sql = "SELECT * FROM usuarios where idUsuario=?"
        con.query(sql, [id], function (err, result, fields) {
            if (err) throw err;
            const userId = parseInt(req.session.usId);
            const dadosUsuario = result[0];
            res.render('Perfil/perfil.ejs', { dadosUsuario, id: userId, fotoUserLogado, nivel, mensagem: req.session.mensagemSenha });
        });
    }
    else {
        res.redirect('/login');
    }
})

app.post('/edicaoPerfil/:id', function (req, res) {
    if (req.session.logado) {
        var form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            var id = parseInt(req.session.usId);

            var atualizarDadosSQL = "UPDATE usuarios SET sobreMim = ?, insta = ?, twitter = ?, emailContato = ?, nome = ?, classificacao = ? WHERE idUsuario = ?";
            var values = [
                fields['sobreMimInput'],
                fields['instagramInput'],
                fields['twitterInput'],
                fields['emailInput'],
                fields['nomeUsu'],
                fields['classificacao'],
                id
            ];

            con.query(atualizarDadosSQL, values, function (err, resultadoDados) {
                if (err) throw err;

                console.log("Dados do usuário atualizados com sucesso.");

                if (files.imagem && files.imagem.size > 0) {
                    var oldpath = files.imagem.filepath;
                    var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
                    var nomeimg = hash + '.' + files.imagem.mimetype.split('/')[1];
                    var newpath = path.join(__dirname, 'public/imagens/', nomeimg);

                    fs.rename(oldpath, newpath, function (err) {
                        if (err) throw err;

                        req.session.foto = nomeimg;
                        var inserirImagem = 'UPDATE usuarios SET fotoPerfil = ? WHERE idUsuario = ?';
                        var values = [nomeimg, id];

                        con.query(inserirImagem, values, function (err) {
                            if (err) throw err;
                            console.log("Imagem do usuário atualizada com sucesso.");
                            res.redirect('/perfil');
                        });
                    });
                } else {
                    res.redirect('/perfil');
                }
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/editaPerfil/:id', function (req, res) {
    if (req.session.logado) {
        var id = req.session.usId
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;
        req.session.fotoPerfil = req.body.imagem;
        const sql = "SELECT * FROM usuarios where idUsuario=?"
        con.query(sql, [id], function (err, result, fields) {
            if (err) throw err;
            const userId = parseInt(req.session.usId);
            const dadosUsuario = result[0];
            res.render('Perfil/perfilEdicao.ejs', { dadosUsuario, id: userId, fotoUserLogado, nivel, mensagem: "1" });
        });
    }
    else {
        res.redirect('/login');
    }
});

app.get('/gerenciarContas', function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 1) {
            var id = req.session.usId
            var fotoUserLogado = req.session.foto;
            var nivel = req.session.nivelUs;
            const sql = "SELECT * FROM usuarios WHERE idUsuario=?"
            con.query(sql, [id], function (err, result) {
                if (err) throw err;
                const dadosUsuario = result[0];
                res.render('Perfil/gerenciarContas.ejs', { dadosUsuario, id, fotoUserLogado, nivel });
            });
        }
        else {
            res.redirect('/menu');
        }
    } else {
        res.redirect('/login');
    }
});

app.post('/cadastrarNovoUs', function (req, res) {
    if (req.session.logado) {
        if (req.session.nivelUs == 1) {
            var id = req.session.usId;
            const senha = 'senha123';
            var form = new formidable.IncomingForm();
            form.parse(req, (err, fields) => {
                if (err) throw err;
                const sql2 = "INSERT INTO usuarios (nome, email, nivel, senha, classificacao) VALUES ?";
                bcrypt.hash(senha, saltRounds, function (err, hash) {
                    if (err) throw err;
                    if (fields['nivel'] == 1) {
                        const values = [[fields['nome'], fields['email'], fields['nivel'], hash, "Administrador"]];
                        con.query(sql2, [values], function (err, result) {
                            if (err) throw err;
                            console.log("Numero de registros inseridos: " + result.affectedRows);
                            res.redirect('/menu');
                        });
                    } else {
                        const values = [[fields['nome'], fields['email'], fields['nivel'], hash, "Supervisor"]];
                        con.query(sql2, [values], function (err, result) {
                            if (err) throw err;
                            console.log("Numero de registros inseridos: " + result.affectedRows);
                            res.redirect('/menu');
                        });
                    }
                });
            });
        } else {
            res.redirect('/menu');
        }
    } else {
        res.redirect('/login');
    }
});


app.get('/apagarNoticia/:id', function (req, res) {
    const noticia_id = req.params.id;
    var nivel = req.session.nivelUs;
    if (nivel == 1) {
        if (req.session.logado) {
            var selectSql = "SELECT * FROM noticias where idNoticia = ?";
            con.query(selectSql, [noticia_id], function (err, result) {
                if (err) throw err;

                const img = path.join(__dirname, 'public/imagens/', result[0]['imagensNoticia']);
                fs.unlink(img, (err) => {
                    if (err) throw err;
                });

                var deleteSql = "DELETE FROM comentarios WHERE noticia_id = ?";
                con.query(deleteSql, [noticia_id], function (err, result) {
                    if (err) throw err;
                    var deleteSql = "DELETE FROM noticias WHERE idNoticia = ?";
                    con.query(deleteSql, [noticia_id], function (err, result) {
                        if (err) throw err;
                        console.log("Numero de registros Apagados: " + result.affectedRows);
                        res.redirect('/menu');
                    });
                });
            });
        } else {
            res.redirect('/login');
        }
    } else {
        res.redirect('/menu');
    }
});

app.get('/esqueciSenha/:id', function (req, res) {
    if (req.session.logado) {
        req.session.mensagemSenha = "1";
        var nivel = req.session.nivel;
        var fotoUserLogado = req.session.foto;
        var sql = "SELECT * FROM usuarios WHERE idUsuario = ?"
        con.query(sql, [req.params.id], function (err, result) {
            var dadosUsuario = result[0];
            res.render('Perfil/esqueciSenha.ejs', { nivel, fotoUserLogado, mensagem: "1", dadosUsuario });
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/redefinirSenha/:id', function (req, res) {
    if (req.session.logado) {
        var form = new formidable.IncomingForm();
        form.parse(req, (err, fields) => {
            if (err) throw err;
            var id = parseInt(req.params.id);
            console.log(id);
            var senhaUsu = fields['senhaUsu'];
            var senhaUsuNova = fields['senhaUsuNova'];

            if (senhaUsu && senhaUsuNova) {
                var consultaSenhaSQL = "SELECT senha FROM usuarios WHERE idUsuario = ?";

                con.query(consultaSenhaSQL, [id], function (err, result) {
                    if (err) throw err;
                    if (result.length === 1) {
                        var senhaHashNoBanco = result[0].senha;
                        bcrypt.compare(senhaUsu, senhaHashNoBanco, function (err, senhaCorrespondente) {
                            if (err) throw err;

                            if (senhaCorrespondente) {
                                if (senhaUsuNova.length < 8) {
                                    var nivel = req.session.nivel;
                                    var fotoUserLogado = req.session.foto;
                                    var sql = "SELECT * FROM usuarios WHERE idUsuario = ?"
                                    con.query(sql, [req.params.id], function (err, result) {
                                        var dadosUsuario = result[0];
                                        res.render('Perfil/esqueciSenha.ejs', { nivel, fotoUserLogado, mensagem: "Senha não pode ter menos de 8 dígitos", dadosUsuario });
                                    });
                                } else {
                                    var id2 = parseInt(req.params.id);
                                    bcrypt.hash(senhaUsuNova, saltRounds, function (err, novaSenhaHash) {
                                        if (err) throw err;
                                        var atualizarSenhaSQL = "UPDATE usuarios SET senha = ? WHERE idUsuario = ?";
                                        var values = [novaSenhaHash, id2];
                                        con.query(atualizarSenhaSQL, values, function (err) {
                                            if (err) throw err;
                                            req.session.mensagemSenha = "Senha atualizada com sucesso";
                                            console.log("senha atualizada")
                                            res.redirect('/perfil');
                                        });
                                    });
                                }
                            } else {
                                var nivel = req.session.nivel;
                                var fotoUserLogado = req.session.foto;
                                var id = req.params.usId
                                var sql = "SELECT * FROM usuarios WHERE idUsuario = ?"
                                con.query(sql, [req.params.id], function (err, result) {
                                    var dadosUsuario = result[0];
                                    res.render('Perfil/esqueciSenha.ejs', { nivel, fotoUserLogado, mensagem: "Senha incorreta", dadosUsuario });
                                });
                            }
                        });
                    } else {
                        console.log("Erro: Usuário não encontrado.");
                        res.redirect('/perfil');
                    }
                });
            } else {
                var nivel = req.session.nivel;
                var fotoUserLogado = req.session.foto;
                var sql = "SELECT * FROM usuarios WHERE idUsuario = ?"
                con.query(sql, [req.params.id], function (err, result) {
                    var dadosUsuario = result[0];
                    res.render('Perfil/esqueciSenha.ejs', { nivel, fotoUserLogado, mensagem: "Senha não condizente", dadosUsuario });
                });
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/noticias', function (req, res) {
    if (req.session.logado) {
        var id = req.session.usId;
        var fotoUserLogado = req.session.foto;
        var nivel = req.session.nivelUs;
        const sql = "SELECT * FROM usuarios where idUsuario=?"
        con.query(sql, [id], function (err, result, fields) {
            if (err) throw err;
            const userId = parseInt(req.session.usId);
            const dadosUsuario = result[0];
            res.render('Menu/noticiasTemplate.ejs', { dadosUsuario, id: userId, fotoUserLogado, nivel });
        });
    }
    else {
        res.redirect('/login');
    }
})



app.listen(3000, function () {
    console.log("Servidor Escutando na porta 3000");
});