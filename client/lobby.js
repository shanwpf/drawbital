var roomList = document.getElementById('room-list');
var roomNameForm = document.getElementById('room-name');
var maxUsersForm = document.getElementById('max-users');
var passwordForm = document.getElementById('password');
var createBtn = document.getElementById('createBtn');
var lobbyDiv = document.getElementById('lobbyDiv');
var roomData;
var joinedRoom = false;
var loggedIn = false;

socket.on('signInResponse', function (data) {
    if (data.success)
        loggedIn = true;
});

createBtn.onclick = function () {
    if (!roomNameForm.value.trim() || !maxUsersForm.value.trim()) {
        alert("Please enter valid room information");
        return;
    }
    socket.emit('createRoom', {
        roomName: roomNameForm.value.trim(),
        maxUsers: maxUsersForm.value.trim(),
        password: passwordForm.value,
        creatorId: socket.id
    });
}

socket.on('updateRoomList', function (data) {
    roomData = data
    roomList.innerHTML = "";
    for (var i = 0; i < data.length; i++) {
        roomList.innerHTML += '<a id="' + i + '" href="#" class="list-group-item list-group-item-action">'
            + data[i].roomName
            + '<span class="badge">' + data[i].numUsers + '</span></a>';
    }
})

socket.on('joinStatus', function (data) {
    if (data.value) {
        lobbyDiv.style.display = "none";
        joinedRoom = true;
    }
})

$(document.body).on('dblclick', '.list-group-item', function () {
    socket.emit('joinRoom', { roomNumber: this.id, clientId: socket.id });
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
        lobbyDiv.style.display = "flex";
        displayDiv.style.display = "none";
    }
})