let enviaMensagens = (callback) => {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/recebemensagens');
    //xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    var mensagem = document.getElementById("mensagem").value;
    xhr.send('mensagem='+ mensagem);
    xhr.onload = () => {
        let status = xhr.status;
        if (status == 200) {
            document.getElementById("mensagem").value = ""
            buscaMensagens();
        } 
    };
};

let buscaMensagens = (callback) => {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/buscamensagens');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => {
        let status = xhr.status;

        if (status == 200) {
            //mostraMensagens(null, xhr.response);
            let dado = JSON.parse(xhr.response);
            document.getElementById('chat-conteudo').innerHTML = dado;
            $('#chat-conteudo').scrollTop($('#chat-conteudo')[0].scrollHeight);

        } 
    };
    xhr.send();
};
