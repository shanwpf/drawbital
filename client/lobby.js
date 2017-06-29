var roomList = document.getElementById('room-list');
var roomNameForm = document.getElementById('room-name');
var maxUsersForm = document.getElementById('max-users');
var passwordForm = document.getElementById('password');
var createBtn = document.getElementById('createBtn');
var lobbyDiv = document.getElementById('lobbyDiv');
var drawRadio = document.getElementById('drawRadio');
var gameRadio = document.getElementById('gameRadio');
var maxPoints = document.getElementById('max-points');
var roomData;
var joinedRoom = false;
var loggedIn = false;

socket.on('signInResponse', function (data) {
    if (data.success)
        loggedIn = true;
});

createBtn.onclick = function () {
    if (!roomNameForm.value.trim() || !maxUsersForm.value.trim()) {
        return;
    }
    socket.emit('createRoom', {
        roomName: roomNameForm.value.trim(),
        maxUsers: maxUsersForm.value.trim(),
        password: passwordForm.value,
        creatorId: socket.id,
        mode: (drawRadio.checked ? "draw" : "game"),
        pointsToWin: maxPoints.value
    });
    clearChatUser();
}

gameRadio.onclick = function () {
    $('#max-points').removeAttr('disabled');
}
drawRadio.onclick = function () {
    $('#max-points').attr('disabled', '');
}

socket.on('updateRoomList', function (data) {
    roomData = data;
    roomList.innerHTML = "";
    for (var i = 0; i < data.length; i++) {
        if(data[i].isPrivate) {
            roomList.innerHTML += '<a id="' + i + '" href="#" class="list-group-item list-group-item-action">'
                + data[i].roomName + " "
                + '<span class="badge"><i class="fa fa-user"></i> '
                + data[i].numUsers + '</span>'
                + '<i class="fa fa-lock"></i></a>';
        }
        else {
            roomList.innerHTML += '<a id="' + i + '" href="#" class="list-group-item list-group-item-action">'
                + data[i].roomName
                + '<span class="badge"><i class="fa fa-user"></i> '
                + data[i].numUsers + '</span></a>';
        }
    }
})

socket.on('joinStatus', function (data) {
    if (data.value) {
        lobbyDiv.style.display = "none";
        joinedRoom = true;
    }
    else {
        showSnackBar("Incorrect password");
    }
})

$(document.body).on('dblclick', '.list-group-item', function () {
    var room = roomData[this.id];
    if(room.numUsers >= room.maxUsers) {
        showSnackBar("Room is full");
        return;
    }
    var password;
    if(room.isPrivate) {
        password = prompt("Enter password", "");
    }    
    socket.emit('joinRoom', { roomNumber: this.id, clientId: socket.id, password: password });
})

$('#draw-tab').on('click', function () {
    if (joinedRoom && loggedIn) {
        $('#draw-li').attr('class', 'active');
        $('#lobby-li').removeAttr('class');
        lobbyDiv.style.display = "none";
        displayDiv.style.display = "inline-block";
    }
})

$('#lobby-tab').on('click', function () {
    if (loggedIn) {
        $('#lobby-li').attr('class', 'active');
        $('#draw-li').removeAttr('class');
        lobbyDiv.style.display = "inline";
        displayDiv.style.display = "none";
    }
})

function showSnackBar(message) {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar")

    x.innerHTML = message;

    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

