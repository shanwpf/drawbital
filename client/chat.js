var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var chatTab = document.getElementById('chatTab');
var userTab = document.getElementById('userTab');
var userList = document.getElementById('user-list');

socket.on('addToChat', function (data) {
        //detect if the user is at the end of the scroll
         var auto = false;
        if (Math.abs(chatText.scrollTop - (chatText.scrollHeight - chatText.offsetHeight)) < 1)
                auto = true;

        // add string into the chatbox
        chatText.innerHTML += '<div>' + data + '</div>';

        // auto scrolling to the most recent
        if (auto)
                chatText.scrollTop = chatText.scrollHeight - chatText.offsetHeight;
});



// data is the username
socket.on('initUsers', function (data) {
        //detect if the user is at the end of the scroll
        for(var i in data)
        {
         var iDiv = document.createElement('div');
         iDiv.id = data[i];
         iDiv.innerHTML = data[i];
         userList.appendChild(iDiv);
        }
});


// data is the username
socket.on('connectUsers', function (data) {
        //detect if the user is at the end of the scroll
         var auto = false;
        if (Math.abs(chatText.scrollTop - (chatText.scrollHeight - chatText.offsetHeight)) < 1)
                auto = true;

        // add string into the chatbox
        var iDiv = document.createElement('div');
        iDiv.id = data;
        iDiv.innerHTML = data;
        userList.appendChild(iDiv);

        // auto scrolling to the most recent
        if (auto)
                chatText.scrollTop = chatText.scrollHeight - chatText.offsetHeight;
});


// data is the username
socket.on('disconnectUsers', function (data) {
        var toDel = document.getElementById(data);
        toDel.remove();
});


socket.on('evalAnswer', function (data) {
        console.log(data);
});


chatForm.onsubmit = function (e) {
        e.preventDefault();
        if (chatInput.value[0] === '/')
                socket.emit('evalServer', chatInput.value.slice(1));
        else
                socket.emit('sendMsgToServer', chatInput.value);
        chatInput.value = '';
}

var signDiv = document.getElementById('signDiv');
var signDivUsername = document.getElementById('signDiv-username');
var signDivApply = document.getElementById('signDiv-Apply');

/*
signDivApply.onclick = function () {
        socket.emit('Apply', { username: signDivUsername.value });
}*/

$(document).ready(function() {
        chatText.style.width = chatDiv.style.width;
        userList.style.width = chatDiv.style.width;
})
userTab.onclick = function () {
        chatTab.setAttribute("class", "");
        userTab.setAttribute("class", "active");
        chatText.setAttribute("style", "width:330px;height:500px;overflow-y:scroll;display:none;");
        userList.setAttribute("style", "width:330px;height:500px;overflow-y:scroll;");
}
chatTab.onclick = function () {
        userTab.setAttribute("class", "");
        chatTab.setAttribute("class", "active");
        chatText.setAttribute("style", "width:330px;height:500px;overflow-y:scroll;");
        userList.setAttribute("style", "width:330px;height:500px;overflow-y:scroll;display:none;");
}