// var SIGNIN_BG_COLOUR = '#72145d';
var LOBBY_BG_COLOUR = '#cc4f6e';
var DRAW_BG_COLOUR = '#303d63';

$('#draw-tab').on('click', () => {
    if (joinedRoom && loggedIn) {
        gotoDraw();
    }
})

$('#lobby-tab').on('click', () => {
    if (loggedIn) 
        gotoLobby();
})

$('#logout-btn').on('click', () => {
    location.reload();
})

function gotoLobby() {
    $('#lobby-li').attr('class', 'active');
    $('#draw-li').removeAttr('class');
    signInDiv.style.display = 'none';
    lobbyDiv.style.display = 'inline';
    displayDiv.style.display = "none";
    transitionBackground(LOBBY_BG_COLOUR);
}

function gotoDraw() {
    $('#draw-li').attr('class', 'active');
    $('#lobby-li').removeAttr('class');
    lobbyDiv.style.display = "none";
    signInDiv.style.display = 'none';
    displayDiv.style.display = "inline-block";
    transitionBackground(DRAW_BG_COLOUR);
}

// function gotoSignin() {
//     $('#draw-li').removeAttr('class');
//     $('#lobby-li').removeAttr('class');
//     lobbyDiv.style.display = "none";
//     signInDiv.style.display = 'inline-block';
//     displayDiv.style.display = "none";
//     transitionBackground(SIGNIN_BG_COLOUR);
// }

function transitionBackground(colour) {
    document.body.style.background = colour;
    document.body.style.backgroundImage = 'url(/client/img/bg-pattern.png)';
}

function showSnackBar(message, type) {
    $.notify(message, {type: type});
}