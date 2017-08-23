// var SIGNIN_BG_COLOUR = '#72145d';
var LOBBY_BG_COLOUR = '#cc4f6e';
var DRAW_BG_COLOUR = '#303d63';
var PRO_TIPS = [
    'You can pan using right mouse button or WASD',
    'You can zoom in and out using your mousewheel',
]
var PRO_TIP_TIMER = 1000 * 60 * 5;
var tipCounter = 0;

$('#draw-tab').on('click', () => {
    if (joinedRoom && loggedIn)
        gotoDraw();
})

$('#lobby-tab').on('click', () => {
    if (loggedIn) 
        gotoLobby();
})

$('#logout-btn').on('click', () => {
    socket.emit('disconnect');
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
    displayDiv.style.display = "grid";
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

//script to detect phone
var uagent = navigator.userAgent.toLowerCase();
if (uagent.search("iphone") > -1 || uagent.search("ipad") > -1 
    || uagent.search("android") > -1 || uagent.search("blackberry") > -1
    || uagent.search("webos") > -1){
    $('#mobileModal').modal() 
    $("#loginbtn").addClass("disabled");
    $("#loginbtn").prop('disabled', true);
}




function transitionBackground(colour) {
    document.body.style.background = colour;
    document.body.style.backgroundImage = 'url(/client/img/bg-pattern.png)';
}

function showSnackBar(message, type) {
    $.notify(message, {type: type});
}

setInterval(() => {
    if(loggedIn) {
        showSnackBar(`Did you know: ${PRO_TIPS[tipCounter]}`, 'warning');
        if(++tipCounter == PRO_TIPS.length)
            tipCounter = 0;
    }    
}, PRO_TIP_TIMER);