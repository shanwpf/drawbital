var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var chatTab = document.getElementById('chatTab');
var userTab = document.getElementById('userTab');
var userList = document.getElementById('user-list');
var userListPanel = document.getElementById('user-list-panel');

var timerCanvas = document.getElementById('timerCanvas');
var timerCtx = timerCanvas.getContext('2d');
// Game audio
var audioNewDrawer = new Audio('./client/audio/you_are_drawer.wav');
var audioAnswerFound = new Audio('./client/audio/answer_found.wav');
var audioNewRound = new Audio('./client/audio/new_round.wav');
var audioWin = new Audio('./client/audio/win.wav');
var audioClock = new Audio('./client/audio/clock_ticking.wav');
var audioDing = new Audio('./client/audio/ding.wav');

timerCanvas.width = timerCanvas.height = 50;

// Draws timer graphics on game panel
// time is the current timer in seconds
// totalTime is the starting timer in seconds
function drawTimer(time, totalTime) {
    timerCtx.save();
    timerCtx.translate(timerCanvas.width / 2, timerCanvas.height / 2);
    timerCtx.rotate(0.5*Math.PI);
    timerCtx.scale(-1, 1);
    timerCtx.translate(-timerCanvas.width / 2, -timerCanvas.height / 2);
    timerCtx.clearRect(0, 0, timerCanvas.width, timerCanvas.height);
    timerCtx.beginPath();
    timerCtx.arc(timerCanvas.width / 2, timerCanvas.height / 2, timerCanvas.height / 2 - 3, 0, 2*Math.PI);
    timerCtx.stroke();
    timerCtx.closePath();
    timerCtx.beginPath();
    timerCtx.moveTo(timerCanvas.width / 2, timerCanvas.height / 2);
    timerCtx.arc(timerCanvas.width / 2, timerCanvas.height / 2, timerCanvas.height / 2 - 5, 0, (time/totalTime)*2*Math.PI);
    timerCtx.lineTo(timerCanvas.width / 2, timerCanvas.height / 2);
    timerCtx.closePath();
    if(time / totalTime <= 0.167) 
        timerCtx.fillStyle = 'red';
    else
        timerCtx.fillStyle = 'blue';
    timerCtx.fill();
    timerCtx.stroke();
    timerCtx.restore();
}

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
            chatText.innerHTML += '<div><strong>' +data.chatTextList[i].userName +"</strong>: "+ data.chatTextList[i].message + '</div>';
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
        case 'clock': audioClock.play(); break;
        case 'ding': audioDing.play(); break;
    }
})

socket.on('stopAudio', function (data) {
    switch(data.track) {
        case 'newDrawer': audioNewDrawer.pause(); audioNewDrawer.load(); break;
        case 'answerFound': audioAnswerFound.pause(); audioAnswerFound.load(); break;
        case 'newRound': audioNewRound.pause(); audioNewRound.load(); break;
        case 'win': audioWin.pause(); audioWin.load(); break;
        case 'clock': audioClock.pause(); audioClock.load(); break;
        case 'ding': audioDing.pause(); audioDing.load(); break;
    }
})

// Game handlers
socket.on('gameTimer', function (data) {
    $('#timerText').replaceWith("<h4 id='timerText'>&emsp;Timer: " + Math.ceil(data.timer) +"</h4>");
    drawTimer(data.timer, 60);
})

socket.on('gameHint', function (data) {
    if(data.hint == "") 
        $('#hintText').replaceWith("<h4 id='hintText'></h4>");

    else 
        $('#hintText').replaceWith("<h4 id='hintText'>&emsp;Hint: " + data.hint + "</h4>");
})

$('#hintBtn').on('click', function() {
    socket.emit('showHint', { id: socket.id });
})

$('#skipBtn').on('click', function() {
    socket.emit('skip');
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