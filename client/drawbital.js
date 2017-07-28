SIGNIN_BG_COLOUR = '#72145d';
LOBBY_BG_COLOUR = '#e0597b';
DRAW_BG_COLOUR = '#3d3d3d';

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

function gotoSignin() {
    $('#draw-li').removeAttr('class');
    $('#lobby-li').removeAttr('class');
    lobbyDiv.style.display = "none";
    signInDiv.style.display = 'inline-block';
    displayDiv.style.display = "none";
    transitionBackground(SIGNIN_BG_COLOUR);
}
function transitionBackground(colour) {
    document.body.style.background = colour;
    document.body.style.backgroundImage = 'url(/client/bg-pattern.png)';
}