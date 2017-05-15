var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var SOCKET_LIST = {};
// canvas contains all drawing data from all clients
var canvasX = {};
var canvasY = {};
var canvasDrag = {};
var canvasColour = {};
var canvasSize = {};
var canvasText = {};
// delta contains data to be sent to clients
var deltaCanvasX = {};
var deltaCanvasY = {};
var deltaCanvasDrag = {};
var deltaCanvasColour = {};
var deltaCanvasSize = {};
var deltaCanvasText = {};
// Send html file to client using Express
app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

// Start server
server.listen(2000);
console.log("Server started");

io.sockets.on('connection', function (socket) {
    console.log('socket connection');
    SOCKET_LIST[socket.id] = socket;
    Client.onConnect(socket);

    socket.on('disconnect', function () {
        delete SOCKET_LIST[socket.id];
        Client.onDisconnect(socket);
    });
})

io.sockets.on('clear', function() {
    clearCanvas(canvasX, canvasY, canvasDrag);
});

class Client {
    constructor(id) {
        this.id = id;
        this.paint = false;
        this.mouseDown = false;
        this.mouseUp = false;
        this.mouseMove = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.dragging = false;
        this.idle = true;
        this.colour = "#000000";
        this.size = 5;
        this.toolList = {
            brush: new Brush(),
            text: new Text()
        };
        this.curTool = "brush";
        Client.list[id] = this;
        return this;
    }

    useCurTool(text) {
        if(this.curTool === "brush") {
            this.toolList.brush.addClick(this.id, this.mouseX, this.mouseY, this.dragging, this.colour, this.size);
        }
        else if(this.curTool === "text") {
            console.log(text);
            this.toolList.text.addText(this.id, this.mouseX, this.mouseY, this.colour, this.size, text);
        }
    }

    update() {
        if (this.mouseDown)
            this.idle = false;
        if (this.mouseMove && this.mouseDown && !this.idle) {
            this.dragging = true;
            this.useCurTool();
        }
        else if (this.mouseDown && !this.idle) {
            this.dragging = true;
            this.useCurTool();
        }
        else if (!this.idle) {
            this.dragging = false;
            this.useCurTool();
            this.idle = true;
        }
    }

    // This function clears the delta after it has been sent to clients for efficiency
    static clearDelta() {
        for (var i in deltaCanvasDrag) {
            if (deltaCanvasDrag[i][deltaCanvasDrag[i].length - 1]) {
                    deltaCanvasX[i].splice(0, deltaCanvasX[i].length - 2);
                    deltaCanvasY[i].splice(0, deltaCanvasY[i].length - 2);
                    deltaCanvasDrag[i].splice(0, deltaCanvasDrag[i].length - 2);
                    deltaCanvasColour[i].splice(0, deltaCanvasColour[i].length - 2);
                    deltaCanvasSize[i].splice(0, deltaCanvasSize[i].length - 2);
                    deltaCanvasText[i].splice(0, deltaCanvasText[i].length - 2);
            }
            else {
                    deltaCanvasX[i] = [];
                    deltaCanvasY[i] = [];
                    deltaCanvasDrag[i] = [];
                    deltaCanvasColour[i] = [];
                    deltaCanvasSize[i] = [];
                    deltaCanvasText[i] = [];
            }
        }
    }

    static clearCanvas(canvasX, canvasY, canvasDrag, canvasColour, canvasSize) {
        for(var i in canvasX) {
            canvasX[i].splice(0, canvasX[i].length);
            canvasY[i].splice(0, canvasY[i].length);
            canvasDrag[i].splice(0, canvasDrag[i].length);
            canvasColour[i].splice(0, canvasColour[i].length);
            canvasSize[i].splice(0, canvasSize[i].length);
            canvasText[i].splice(0, canvasText[i].length);
        }
        for(var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('clear');
        }
    }

    // Handle new connections
    static onConnect(socket) {
        var client = new Client(socket.id);

        canvasX[client.id] = [];
        canvasY[client.id] = [];
        canvasDrag[client.id] = [];
        canvasColour[client.id] = [];
        canvasSize[client.id] = [];
        canvasText[client.id] = [];

        deltaCanvasX[client.id] = [];
        deltaCanvasY[client.id] = [];
        deltaCanvasDrag[client.id] = [];
        deltaCanvasColour[client.id] = [];
        deltaCanvasSize[client.id] = [];
        deltaCanvasText[client.id] = [];

        // Send all drawing data to new client to get their canvas up to date with the current drawings
        var initPack = {
            canvasX: canvasX,
            canvasY: canvasY,
            canvasDrag: canvasDrag,
            canvasColour: canvasColour,
            canvasSize: canvasSize,
            canvasText: canvasText
        }
        socket.emit('initCanvas', initPack);

        socket.on('clear', function() {
            Client.clearCanvas(canvasX, canvasY, canvasDrag, canvasColour, canvasSize);
        })

        socket.on('colour', function(data) {
            client.colour = data.value;
        })

        socket.on('size', function(data) {
            client.size = data.value;
        })

        socket.on('changeTool', function(data) {
            client.curTool = data.toolName;
            console.log("Tool changed to " + data.toolName);
        })

        socket.on('drawText', function(data) {
            client.useCurTool(data.text);
        })

        socket.on('keyPress', function (data) {
            if (data.inputId === 'mousedown') {
                client.mouseDown = data.state;
                console.log("mousedown = " + data.state);
            }
            if (data.inputId === 'mousemove') {
                if (client.mouseDown)
                    client.mouseMove = true;
                else
                    client.mouseMove = false;
            }
            if (data.inputId === 'mouseleave')
                client.mouseDown = data.state;
            if (data.inputId === 'mouseup') {
                client.mouseUp = data.state;
            }
            client.mouseX = data.x;
            client.mouseY = data.y;
        });
    }

    static onDisconnect(socket) {
        console.log("socket disconnected");
        delete Client.list[socket.id];
    }

    static update() {
        var pack = [];
        for (var i in Client.list) {
            var client = Client.list[i];
            client.update();
        }
    }
}

Client.list = {};

class Tool {
    constructor() {
        this.type;
        return this;
    }
}

class Brush extends Tool {
    constructor() {
        super();
        this.type = "brush";
    }

    addClick(id, x, y, dragging, colour, size) {
        canvasX[id].push(x);
        canvasY[id].push(y);
        canvasDrag[id].push(dragging);
        canvasColour[id].push(colour);
        canvasSize[id].push(size);

        deltaCanvasX[id].push(x);
        deltaCanvasY[id].push(y);
        deltaCanvasDrag[id].push(dragging);
        deltaCanvasColour[id].push(colour);
        deltaCanvasSize[id].push(size);
    }
}

class Text extends Tool {
    constructor() {
        super();
        this.type = "text";
    }

    addText(id, x, y, colour, size, text) {
        if(text) {
            canvasText[id].push({x: x, y: y, colour: colour, size: Math.max(7, size), text: text});
            deltaCanvasText[id].push({x: x, y: y, colour: colour, size: Math.max(7, size), text: text});
        }
    }
}

setInterval(function () {
    Client.update();
    var pack = {
        canvasX: deltaCanvasX,
        canvasY: deltaCanvasY,
        canvasDrag: deltaCanvasDrag,
        canvasColour: deltaCanvasColour,
        canvasSize: deltaCanvasSize,
        canvasText: deltaCanvasText
    };
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('updateCanvas', pack);
    }
    Client.clearDelta();
}, 1000/60);