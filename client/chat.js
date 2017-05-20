var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');

socket.on('addToChat',function(data){
        //detect if the user is at the end of the scroll
        var auto = false;
        if(Math.abs( chatText.scrollTop - (chatText.scrollHeight - chatText.offsetHeight)) <1)
                auto = true;

        // add string into the chatbox
        chatText.innerHTML += '<div>' + data + '</div>';

        // auto scrolling to the most recent
        if(auto)
        chatText.scrollTop = chatText.scrollHeight - chatText.offsetHeight;
});

socket.on('evalAnswer',function(data){
        console.log(data);
});


chatForm.onsubmit = function(e){
        e.preventDefault();
        if(chatInput.value[0] === '/')
            socket.emit('evalServer',chatInput.value.slice(1));
        else
            socket.emit('sendMsgToServer',chatInput.value);
        chatInput.value = '';      
}
   


var signDiv = document.getElementById('signDiv');
var signDivUsername = document.getElementById('signDiv-username');
var signDivApply = document.getElementById('signDiv-Apply');

signDivApply.onclick = function(){
        socket.emit('Apply',{username:signDivUsername.value});
}