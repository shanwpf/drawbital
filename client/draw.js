var canvas = document.getElementById('drawCanvas');
var clearBtn = document.getElementById('clearBtn');
var brushSize = document.getElementById('brushSize');
var ctx = canvas.getContext('2d');
var curColour = "#FFCC00";
var socket = io();
var lastX;
var lastY;
var lastDrag;
var paint;

socket.on('initCanvas', function (data) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";

    for (var i in data.initX) {
        for (var j = 1; j < data.initX[i].length; j++) {
            ctx.strokeStyle = data.initColour[i][j-1];
            ctx.lineWidth = data.initSize[i][j-1];

            ctx.beginPath();
            if (data.initDrag[i][j - 1] && j - 1) {
                ctx.moveTo(data.initX[i][j - 1], data.initY[i][j - 1]);
            }
            else {
                ctx.moveTo(data.initX[i][j] - 1, data.initY[i][j]);
            }
            if (data.initX[i][j] > 0) {
                ctx.lineTo(data.initX[i][j], data.initY[i][j]);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
});

socket.on('updateCanvas', function (data) {
    ctx.lineJoin = "round";
    var j;

    /*
    if(lastX != undefined) {
        for(var i in data.canvasX) {
            data.canvasX[i].unshift(lastX);
            data.canvasY[i].unshift(lastY);
            data.canvasDrag[i].unshift(lastDrag);
        }
    }
    */

    for (var i in data.canvasX) {
        for (j = 1; j < data.canvasX[i].length; j++) {
            ctx.strokeStyle = data.canvasColour[i][j-1];
            ctx.lineWidth = data.canvasSize[i][j-1];
            ctx.beginPath();
            if (data.canvasDrag[i][j - 1] && j - 1) {
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
    }
    /*
    lastX = data.canvasX[i][j - 1];
    lastY = data.canvasY[i][j - 1];
    lastDrag = data.canvasDrag[i][j - 1];
    */
});

socket.on('clear', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
canvas.onmousedown = function (e) {
    var pos = getMousePos(canvas, e);
    posx = pos.x;
    posy = pos.y;
    socket.emit('keyPress', { inputId: 'mousedown', x: posx, y: posy, state: true });
    //socket.emit('keyPress', {inputId:'mouseup', state:false});
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

function clear(ctx) {
    socket.emit('clear');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function changeColour(picker) {
    socket.emit('colour', { value: picker.toHEXString() });
}

brushSize.onchange = function() {
    socket.emit('size', {value: brushSize.value});
}