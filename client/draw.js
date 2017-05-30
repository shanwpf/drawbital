var canvas = document.getElementById('publicSurface');
var serverCanvas = document.getElementById('serverSurface');
var overlay = document.getElementById('overlay');
var cursorLayer = document.getElementById('cursorLayer');
var cursorCtx = cursorLayer.getContext('2d');
var serverCtx = serverSurface.getContext('2d');
var ctx = canvas.getContext('2d');
var curColour = "#000000"
var curTool = "brush";
var curSize = 5;
var socket = io();
var lastUpdateTime = 0;

$(document).ready(function() {
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
    move: function(colour) {
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

function onServerUpdateReceived(data) {
    var timeElapsed = Date.now() - lastUpdateTime;
    if(timeElapsed >= 1000/60) {
        updateBrush(data);
        lastUpdateTime = Date.now();
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
                for(var j = 1; j < points.length; j++) {
                    if(points[j][0] > 0)
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
        if(data.publicPathMap[i][0]) {
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
    var rect = overlay.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Unnecessary
var mousedown = false;
overlay.onmousedown = function (e) {
        var pos = getMousePos(overlay, e);
        posx = pos.x;
        posy = pos.y;
        socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
}

overlay.onmousemove = function (e) {
    var pos = getMousePos(overlay, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousemove', x: posx, y: posy, state: true });
    if(curTool == "brush") {
        var r = curSize / 2;
        cursorCtx.clearRect(0, 0, canvas.width, canvas.height);
        cursorCtx.fillStyle = curColour;
        cursorCtx.lineWidth = 1;
        cursorCtx.beginPath();
        cursorCtx.arc(posx, posy, r, 0, Math.PI * 2, true);
        cursorCtx.closePath();
        cursorCtx.fill();
    }
    else {
        cursorCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

overlay.onmouseup = function (e) {
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
