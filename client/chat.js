var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var chatTab = document.getElementById('chatTab');
var userTab = document.getElementById('userTab');
var userList = document.getElementById('user-list');
var userListPanel = document.getElementById('user-list-panel');
// Game audio
var audioNewDrawer = new Audio('./client/audio/you_are_drawer.wav');
var audioAnswerFound = new Audio('./client/audio/answer_found.wav');
var audioNewRound = new Audio('./client/audio/new_round.wav');
var audioWin = new Audio('./client/audio/win.wav');

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
                        userList.innerHTML += '<li class="list-group-item">' + data[i].name + ' <span class="badge">' + data[i].score + '</span></li>';
                }
              
       }else
       {
                for(var i in data)
                {
                        userList.innerHTML += '<li class="list-group-item">' + data[i] + '</li>';
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

socket.on('playAudio', function (data) {
        switch(data.track) {
                case 'newDrawer': audioNewDrawer.play(); break;
                case 'answerFound': audioAnswerFound.play(); break;
                case 'newRound': audioNewRound.play(); break;
                case 'win': audioWin.play(); break;
        }
})

// Game handlers

/* Unnecessary
socket.on('gameCheckAnswer', function (data) {
    if (data.value) {
        alert('You are correct!');
    }
    else {
        alert('Try again');
    }
})

socket.on('gameWord', function (data) {

})
*/

socket.on('gameTimer', function (data) {
    gameTimer = data.value;
    gameTimerDiv.innerHTML = "<h4>Time Left: " + Math.round(data.value) + "</h4>";
})
// /Game handlers

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
        userListPanel.style.width = chatDiv.style.width;
})
userTab.onclick = function () {
        chatTab.setAttribute("class", "");
        userTab.setAttribute("class", "active");
        chatText.setAttribute("style", "display:none;");
        userListPanel.setAttribute("style", "display:flex;");
}
chatTab.onclick = function () {
        userTab.setAttribute("class", "");
        chatTab.setAttribute("class", "active");
        chatText.setAttribute("style", "display:inline;");
        userListPanel.setAttribute("style", "display:none;");
}