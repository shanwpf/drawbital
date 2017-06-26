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

socket.on('refreshUserList', function (data) {
        while (userList.firstChild){
                userList.removeChild(userList.firstChild);
        };
        
        if(data[0] === undefined)
                return;
                
       if(data[0].name){
                for(var i in data)
                {
                        userList.innerHTML += '<div>' + data[i].name+ "\t" +data[i].score + '</div>';
                }
              
       }else
       {
                
                for(var i in data)
                {
                   userList.innerHTML += '<div>' + data[i] + '</div>';
                }
       }
});


socket.on('connectRoom', function (data) {
        
        //two ways of adding a child into div
        //console.log(data);
        clearChatUser();

        for(var i in data.chatTextList)
        {
                chatText.innerHTML += '<div>' +data.chatTextList[i].userName +":"+ data.chatTextList[i].message + '</div>';
        }
        // auto scrolling to the most recent
         chatText.scrollTop = chatText.scrollHeight - chatText.offsetHeight;
})


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

function clearChatUser(){
        while (chatText.firstChild) {
                chatText.removeChild(chatText.firstChild);
        };
        while (userList.firstChild) {
                userList.removeChild(userList.firstChild);
        };
}

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