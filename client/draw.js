var canvas = document.getElementById('drawCanvas');
var brushSize = document.getElementById('brushSize');
var ctx = canvas.getContext('2d');
var curTool = "brush";
var socket = io();

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

socket.on('initCanvas', function (data) {
    updateBrush(data, true);
    updateText(data);
});

socket.on('updateCanvas', function(data) {
    updateBrush(data, false);
    updateText(data);
});

function updateText(data) {
    for(var i in data.canvasText) {
        for(var j = 0; j < data.canvasText[i].length; j++) {
            ctx.font = data.canvasText[i][j].size + "px sans-serif";
            ctx.fillStyle = data.canvasText[i][j].colour;
            ctx.fillText(data.canvasText[i][j].text, data.canvasText[i][j].x, data.canvasText[i][j].y);
        }
    }
}

function updateBrush(data, init) {
    if(init)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    for (var i in data.canvasX) {
        for (var j = 1; j < data.canvasX[i].length; j++) {
            ctx.strokeStyle = data.canvasColour[i][j-1];
            ctx.lineWidth = data.canvasSize[i][j-1];
            ctx.beginPath();
            var k = j;
            if(init) 
                k--;
            if (data.canvasDrag[i][j - 1] && k) {
                ctx.moveTo(data.canvasX[i][j - 1], data.canvasY[i][j - 1]);
            }
            else {
                ctx.moveTo(data.canvasX[i][j] - 1, data.canvasY[i][j]);
            }
            if (data.canvasX[i][j] > 0) {
                ctx.lineTo(data.canvasX[i][j], data.canvasY[i][j]);
                ctx.closePath();
                ctx.stroke();
            }
        }
        // Fix drawing of points
        if(!init && data.canvasX[i].length === 1) {
            ctx.strokeStyle = data.canvasColour[i][0];
            ctx.lineWidth = data.canvasSize[i][0];
            ctx.beginPath();
            ctx.moveTo(data.canvasX[i][0] - 1, data.canvasY[i][0]);
            ctx.lineTo(data.canvasX[i][0], data.canvasY[i][0]);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

document.getElementById('clearBtn').onclick = function() {;
    socket.emit('clear');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

socket.on('clear', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("brushBtn").onclick = function() {
    changeTool("brush");
};
document.getElementById("textBtn").onclick = function() {
    changeTool("text");
};

function changeTool(tool) {
    curTool = tool;
    socket.emit('changeTool', {toolName: tool});
    if(curTool === "text") {
        canvas.onmousedown = function(e) {
            var pos = getMousePos(canvas, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('drawText', {x:posx, y: posy, text: prompt("Enter text:", "")});
        }
    }
    else if(curTool === "brush") {
        canvas.onmousedown = function (e) {
            var pos = getMousePos(canvas, e);
            posx = pos.x;
            posy = pos.y;
            socket.emit('keyPress', {inputId: 'mousedown', x: posx, y: posy, state: true});
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

clearBtn.onclick = function () {
    clear(ctx);
}

function changeColour(picker) {
    socket.emit('colour', { value: picker.toHEXString() });
}

brushSize.onchange = function() {
    socket.emit('size', {value: brushSize.value});
}