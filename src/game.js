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

socket.on('gameTimer', function (data) {
    if(data.timer == -1) {
        $('#timerText').css('display', 'inline');
        $('#timerCanvas').css('display', 'none');
        $('#hintText').replaceWith("<h4 id='hintText'></h4>");
    }
    else {
        $('#timerText').css('display', 'none');
        if(!$('#timerCanvas').css('display') == 'inline')
            $('#timerCanvas').css('display', 'inline');
        drawTimer(data.timer, 60);
    }
})

socket.on('gameHint', function (data) {
    if(data.hint == "") 
        $('#hintText').replaceWith("<h4 id='hintText'></h4>");
    else 
        $('#hintText').replaceWith("<h5 id='hintText'>&emsp;Hint: " + data.hint + "</h5>");
})

$('#hintBtn').on('click', function() {
    socket.emit('showHint', { id: socket.id });
})

$('#skipBtn').on('click', function() {
    socket.emit('skip');
})