var canvas = document.getElementById('drawCanvas');
var overlay = document.getElementById('overlay');
var cursorLayer = document.getElementById('cursorLayer');
var cursorCtx = cursorLayer.getContext('2d');
var ctx = canvas.getContext('2d');
var curColour = "#000000"
var curTool = "brush";
var curSize = 5;
var socket = io();

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

socket.on('initSurface', function (data) {
    initSurface(data);
});

socket.on('updateSurface', function (data) {
    updateBrush(data);
    updateText(data);
});

function initSurface(data) {
    var points;
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < data.actionList.length; i++) {
        if (!data.actionList[i].deleted) {
            points = data.actionList[i].points;
            if (data.actionList[i].tool === "text") {
                ctx.font = data.actionList[i].size + "px sans-serif";
                ctx.fillStyle = data.actionList[i].colour;
                ctx.fillText(data.actionList[i].text, points[0].x, points[0].y);
            }
            else {
                ctx.strokeStyle = data.actionList[i].colour;
                ctx.lineWidth = data.actionList[i].size;
                for (var j = 0; j < points.length; j++) {
                    ctx.beginPath();
                    if (j === 0) {
                        ctx.moveTo(points[j].x, points[j].y);
                        ctx.lineTo(points[j].x - 0.01, points[j].y);
                        ctx.closePath();
                        ctx.stroke();
                    }
                    if (j + 1 < points.length) {
                        ctx.moveTo(points[j + 1].x, points[j + 1].y);
                    }
                    else {
                        ctx.moveTo(points[j].x - 0.01, points[j].y);
                    }
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
    }
}

function updateText(data) {
    for (var i in data.surfaceText) {
        for (var j = 0; j < data.surfaceText[i].length; j++) {
            ctx.font = data.surfaceText[i][j].size + "px sans-serif";
            ctx.fillStyle = data.surfaceText[i][j].colour;
            ctx.fillText(data.surfaceText[i][j].text, data.surfaceText[i][j].x, data.surfaceText[i][j].y);
        }
    }
}

function updateBrush(data) {
    ctx.lineJoin = "round";
    for (var i in data.surfaceX) {
        for (var j = 1; j < data.surfaceX[i].length; j++) {
            ctx.strokeStyle = data.surfaceColour[i][j - 1];
            ctx.lineWidth = data.surfaceSize[i][j - 1];
            ctx.beginPath();
            if (data.surfaceDrag[i][j - 1]) {
                ctx.moveTo(data.surfaceX[i][j - 1], data.surfaceY[i][j - 1]);
            }
            else {
                ctx.moveTo(data.surfaceX[i][j], data.surfaceY[i][j]);
            }
            if (data.surfaceX[i][j] > 0) {
                ctx.lineTo(data.surfaceX[i][j], data.surfaceY[i][j]);
                ctx.closePath();
                ctx.stroke();
            }
        }
        // Fix drawing of points
        if (data.surfaceX[i].length === 1) {
            ctx.strokeStyle = data.surfaceColour[i][0];
            ctx.lineWidth = data.surfaceSize[i][0];
            ctx.beginPath();
            ctx.moveTo(data.surfaceX[i][0] - 1, data.surfaceY[i][0]);
            ctx.lineTo(data.surfaceX[i][0], data.surfaceY[i][0]);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

document.getElementById("clearBtn").onclick = function () {
    socket.emit('clear');
};

socket.on('clear', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
overlay.onmousedown = function (e) {
    var pos = getMousePos(overlay, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
};

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
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
};

overlay.onmouseleave = function (e) {
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
};

function changeColour(picker) {
    curColour = picker.toHEXString();
    socket.emit('colour', { value: picker.toHEXString() });
}

document.getElementById("brushSize").onchange = function () {
    curSize = brushSize.value;
    socket.emit('size', { value: brushSize.value });
}

/*
function repeatOften() {
    requestAnimationFrame(repeatOften);
}
requestAnimationFrame(repeatOften);
*/