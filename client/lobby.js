var roomList = document.getElementById('room-list');
var roomNameForm = document.getElementById('room-name');
var maxUsersForm = document.getElementById('max-users');
var passwordForm = document.getElementById('password');
var createBtn = document.getElementById('createBtn');
var lobbyDiv = document.getElementById('lobbyDiv');

createBtn.onclick = function () {
    if(!roomNameForm.value.trim() || !maxUsersForm.value.trim()) {
        alert("Please enter valid room information");
    }
    socket.emit('createRoom', {
        roomName: roomNameForm.value.trim(),
        maxUsers: maxUsersForm.value.trim(),
        password: passwordForm.value,
        creatorId: socket.id
    });
}

socket.on('updateRoomList', function (data) {
    roomList.innerHTML = "";
    for(var i = 0; i < data.length; i++) {
        roomList.innerHTML += '<li class="list-group-item">' + data[i].roomName + 
                              '<span class="badge">' + data[i].numUsers + '</span></li>';
    }
})

socket.on('joinStatus', function (data) {
    if (data.value) {
        lobbyDiv.style.display = "none";
    }
})