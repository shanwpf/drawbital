// Real-time client drawing
var canvas = document.getElementById('publicSurface');
var ctx = canvas.getContext('2d');

// Saved client drawing but not permanent (able to undo/redo)
var serverCanvas = document.getElementById('serverSurface');
var serverCtx = serverSurface.getContext('2d');

// Saved and permanent drawings (unable to undo/redo)
var permCanvas = document.getElementById('permanentSurface');
var permCtx = permCanvas.getContext('2d');

// Draw cursors
var cursorLayer = document.getElementById('cursorLayer');
var cursorCtx = cursorLayer.getContext('2d');

// Client viewport
var viewCanvas = document.getElementById('view');
var viewCtx = viewCanvas.getContext('2d');

// For input capture
var overlay = document.getElementById('overlay');

var canvasArray = [canvas, serverCanvas, cursorLayer, permCanvas, overlay];
var curColour = "#000000"
var curTool = "brush";
var curSize = 5;
var socket = io();
var lastUpdateTime = 0;
var SCROLL_SPEED = 2;
var scale = 1;
var ZOOM_SMOOTHNESS = 10;

$(document).ready(function () {
    $('#full').spectrum({
        color: '#ECC',
        showInput: true,
        className: 'full-spectrum',
        showInitial: true,
        showPalette: true,
        showSelectionPalette: true,
        maxSelectionSize: 10,
        preferredFormat: 'hex',
        localStorageKey: 'spectrum.drawbital',
        showAlpha: true,
        move: function (colour) {
            curColour = colour.toRgbString();
            socket.emit('colour', { value: colour.toRgbString() });
        }
    });
});

socket.on('initSurface', function (data) {
    initSurface(data);
});

socket.on('updateSurface', function (data) {
    onServerUpdateReceived(data);
});

socket.on('updatePerm', function (data) {
    updatePerm(data);
})

// Start the requestAnimationFrame loop on successful sign in
socket.on('signInResponse', function (data) {
    if (data.success)
        repeat();
})

function onServerUpdateReceived(data) {
    var timeElapsed = Date.now() - lastUpdateTime;
    if (timeElapsed >= 1000 / 60) {
        updateBrush(data);
        lastUpdateTime = Date.now();
    }
}

function updatePerm(data) {
    var points;
    permCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < data.actionList.length; i++) {
        if (!data.actionList[i].deleted) {
            points = data.actionList[i].points;
            if (data.actionList[i].tool === "text") {
                permCtx.font = data.actionList[i].size + "px sans-serif";
                permCtx.fillStyle = data.actionList[i].colour;
                permCtx.fillText(data.actionList[i].text, points[0][0], points[0][1]);
            }
            else {
                permCtx.lineJoin = "round";
                permCtx.lineCap = "round";
                permCtx.strokeStyle = data.actionList[i].colour;
                permCtx.lineWidth = data.actionList[i].size;
                permCtx.beginPath();
                permCtx.moveTo(points[0][0], points[0][1] - 0.01);
                for (var j = 1; j < points.length; j++) {
                    if (points[j][0] > 0)
                        permCtx.lineTo(points[j][0], points[j][1]);
                }
                permCtx.stroke();
            }
        }
    }
}

function initSurface(data) {
    var points;
    serverCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < data.actionList.length; i++) {
        if (!data.actionList[i].deleted) {
            points = data.actionList[i].points;
            if (data.actionList[i].tool === "text") {
                serverCtx.font = data.actionList[i].size + "px sans-serif";
                serverCtx.fillStyle = data.actionList[i].colour;
                serverCtx.fillText(data.actionList[i].text, points[0][0], points[0][1]);
            }
            else {
                serverCtx.lineJoin = "round";
                serverCtx.lineCap = "round";
                serverCtx.strokeStyle = data.actionList[i].colour;
                serverCtx.lineWidth = data.actionList[i].size;
                serverCtx.beginPath();
                serverCtx.moveTo(points[0][0], points[0][1] - 0.01);
                for (var j = 1; j < points.length; j++) {
                    if (points[j][0] > 0)
                        serverCtx.lineTo(points[j][0], points[j][1]);
                }
                serverCtx.stroke();
            }
        }
    }
}

function updateText(data) {
    for (var i in data.surfaceText) {
        for (var j = 0; j < data.surfaceText[i].length; j++) {
            serverCtx.font = data.surfaceText[i][j].size + "px sans-serif";
            serverCtx.fillStyle = data.surfaceText[i][j].colour;
            serverCtx.fillText(data.surfaceText[i][j].text, data.surfaceText[i][j].x, data.surfaceText[i][j].y);
        }
    }
}

function updateBrush(data) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i in data.publicPathMap) {
        ctx.strokeStyle = data.clientColours[i];
        ctx.lineWidth = data.clientSizes[i];
        if (data.publicPathMap[i][0]) {
            ctx.beginPath();
            ctx.moveTo(data.publicPathMap[i][0][0], data.publicPathMap[i][0][1]);
            for (var j = 1; j < data.publicPathMap[i].length; j++) {
                ctx.lineTo(data.publicPathMap[i][j][0], data.publicPathMap[i][j][1]);
            }
            ctx.stroke();
        }
    }
}

document.getElementById("clearBtn").onclick = function () {
    socket.emit('clear');
};

socket.on('clear', function () {
    serverCtx.clearRect(0, 0, canvas.width, canvas.height);
    permCtx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("brushBtn").onclick = function () {
    changeTool("brush");
};
document.getElementById("textBtn").onclick = function () {
    changeTool("text");
};
document.getElementById("undoBtn").onclick = function () {
    socket.emit('undo');
};
document.getElementById("redoBtn").onclick = function () {
    socket.emit('redo');
};

function changeTool(tool) {
    curTool = tool;
    socket.emit('changeTool', { toolName: tool });
    if (curTool === "text") {
        overlay.onmousedown = function (e) {
            var pos = getMousePos(overlay, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('drawText', { x: posx, y: posy, text: prompt("Enter text:", "") });
        }

        // Clear the brush cursor
        cursorCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    else if (curTool === "brush") {
        overlay.onmousedown = function (e) {
            var pos = getMousePos(overlay, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
        };
    }
}

function getMousePos(canvas, evt) {
    var rect = viewCanvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left + (viewX * scale)) / scale,
        y: (evt.clientY - rect.top + (viewY * scale)) / scale
    };
}

// Unnecessary
var mousedown = false;
var mouseX, mouseY;
overlay.onmousedown = function (e) {
    // Prevent text selection while dragging
    document.onselectstart = function () { return false; }

    var pos = getMousePos(overlay, e);
    posx = mouseX = pos.x;
    posy = mouseY = pos.y;
    socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
}

var prevPosX, prevPosY;
overlay.onmousemove = function (e) {
    var pos = getMousePos(overlay, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousemove', x: posx, y: posy, state: true });
    if (curTool == "brush") {
        var r = curSize / 2;
        if (prevPosX || prevPosX >= 0)
            cursorCtx.clearRect(prevPosX - 2 * r, prevPosY - 2 * r, r * 4, r * 4);
        cursorCtx.fillStyle = curColour;
        cursorCtx.lineWidth = 1;
        cursorCtx.beginPath();
        cursorCtx.arc(posx, posy, r, 0, Math.PI * 2, true);
        cursorCtx.closePath();
        cursorCtx.fill();
    }
    prevPosX = posx;
    prevPosY = posy;
};

overlay.onmouseup = function (e) {
    // Allow text selection after dragging
    document.onselectstart = function () { return true; }

    mousedown = false;
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
};

overlay.onmouseleave = function (e) {
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
};


document.getElementById("brushSize").onchange = function () {
    curSize = brushSize.value;
    socket.emit('size', { value: brushSize.value });
}

var viewX = 0;
var viewY = 0;
var keyStates = {
    'W': false,
    'A': false,
    'S': false,
    'D': false
}

var chatDiv = document.getElementById('chatDiv');
// Update loop
function repeat() {
    viewCanvas.width = window.innerWidth - 400;
    viewCanvas.height = window.innerHeight - 250;
    chatDiv.style.height = viewCanvas.height + "px";
    document.getElementById('chat-text').style.width = chatDiv.style.width;
    viewCtx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);
    translateAll();
    drawZoomed();
    requestAnimationFrame(repeat);
}

// Draw taking zoom into account
function drawZoomed() {
    viewCtx.save();
    viewCtx.scale(scale, scale);
    viewCtx.drawImage(permCanvas, viewX, viewY, viewCanvas.width / scale, viewCanvas.height / scale, 0, 0,
        viewCanvas.width / scale, viewCanvas.height / scale);
    viewCtx.drawImage(serverCanvas, viewX, viewY, viewCanvas.width / scale, viewCanvas.height / scale, 0, 0,
        viewCanvas.width / scale, viewCanvas.height / scale);
    viewCtx.drawImage(cursorLayer, viewX, viewY, viewCanvas.width / scale, viewCanvas.height / scale, 0, 0,
        viewCanvas.width / scale, viewCanvas.height / scale);
    viewCtx.drawImage(canvas, viewX, viewY, viewCanvas.width / scale, viewCanvas.height / scale, 0, 0,
        viewCanvas.width / scale, viewCanvas.height / scale);
    viewCtx.restore();
}

overlay.onmousewheel = function (event) {
    var wheel = event.wheelDelta / 120;//n or -n
    var zoom = 1 + wheel / ZOOM_SMOOTHNESS;
    scale *= zoom;
}

function translateAll() {
    if (keyStates['W']) {
        for (var i = 0; i < canvasArray.length && viewY > 0; i++) {
            canvasArray[i].top = (viewY -= SCROLL_SPEED);
            canvasArray[i].left = viewX;
        }
    }
    if (keyStates['D']) {
        for (var i = 0; i < canvasArray.length && viewX + viewCanvas.width < canvas.width; i++) {
            canvasArray[i].top = viewY;
            canvasArray[i].left = (viewX += SCROLL_SPEED);
        }
    }
    if (keyStates['S']) {
        for (var i = 0; i < canvasArray.length && viewY + viewCanvas.height < canvas.height; i++) {
            canvasArray[i].top = (viewY += SCROLL_SPEED);
            canvasArray[i].left = viewX;
        }
    }
    if (keyStates['A']) {
        for (var i = 0; i < canvasArray.length && viewX > 0; i++) {
            canvasArray[i].top = viewY;
            canvasArray[i].left = (viewX -= SCROLL_SPEED);
        }
    }
}

overlay.onkeydown = function (event) {
    if (String.fromCharCode(event.keyCode) == 'W') {
        keyStates['W'] = true;
    }
    if (String.fromCharCode(event.keyCode) == 'A') {
        keyStates['A'] = true;
    }
    if (String.fromCharCode(event.keyCode) == 'S') {
        keyStates['S'] = true;
    }
    if (String.fromCharCode(event.keyCode) == 'D') {
        keyStates['D'] = true;
    }
}

overlay.onkeyup = function (event) {
    if (String.fromCharCode(event.keyCode) == 'W') {
        keyStates['W'] = false;
    }
    if (String.fromCharCode(event.keyCode) == 'A') {
        keyStates['A'] = false;
    }
    if (String.fromCharCode(event.keyCode) == 'S') {
        keyStates['S'] = false;
    }
    if (String.fromCharCode(event.keyCode) == 'D') {
        keyStates['D'] = false;
    }
}
