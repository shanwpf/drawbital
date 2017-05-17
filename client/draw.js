var canvas = document.getElementById('drawCanvas');
var ctx = canvas.getContext('2d');
var curTool = "brush";
var socket = io();

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

socket.on('initSurface', function (data) {
    updateBrushInit(data);
    updateText(data);
});

socket.on('updateSurface', function (data) {
    updateBrush(data, false);
    updateText(data);
});

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
            if (data.surfaceDrag[i][j - 1] && j) {
                ctx.moveTo(data.surfaceX[i][j - 1], data.surfaceY[i][j - 1]);
            }
            else {
                ctx.moveTo(data.surfaceX[i][j] - 1, data.surfaceY[i][j]);
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

function updateBrushInit(data) {
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var j = 1; j < data.surfaceX.length; j++) {
            ctx.strokeStyle = data.surfaceColour[j];
            ctx.lineWidth = data.surfaceSize[j];
            ctx.beginPath();
            if (data.surfaceDrag[j - 1] && j) {
                ctx.moveTo(data.surfaceX[j - 1], data.surfaceY[j - 1]);
            }
            else {
                ctx.moveTo(data.surfaceX[j] - 1, data.surfaceY[j]);
            }
            if (data.surfaceX[j] > 0) {
                ctx.lineTo(data.surfaceX[j], data.surfaceY[j]);
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

function changeTool(tool) {
    curTool = tool;
    socket.emit('changeTool', { toolName: tool });
    if (curTool === "text") {
        canvas.onmousedown = function (e) {
            var pos = getMousePos(canvas, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('drawText', { x: posx, y: posy, text: prompt("Enter text:", "") });
        }
    }
    else if (curTool === "brush") {
        canvas.onmousedown = function (e) {
            var pos = getMousePos(canvas, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
        };
    }
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Unnecessary
canvas.onmousedown = function (e) {
    var pos = getMousePos(canvas, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
};

canvas.onmousemove = function (e) {
    var pos = getMousePos(canvas, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousemove', x: posx, y: posy, state: true });
};

canvas.onmouseup = function (e) {
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
    //socket.emit('keyPress', {inputId:'mouseup', state:true});
};

canvas.onmouseleave = function (e) {
    socket.emit('keyPress', { inputId: 'mousedown', state: false });
};

function changeColour(picker) {
    socket.emit('colour', { value: picker.toHEXString() });
}

document.getElementById("brushSize").onchange = function () {
    socket.emit('size', { value: brushSize.value });
}