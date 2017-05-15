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
// delta contains data to be sent to clients
var deltaCanvasX = {};
var deltaCanvasY = {};
var deltaCanvasDrag = {};
var deltaCanvasColour = {};
var deltaCanvasSize = {};
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
        this.idle = true;
        this.colour = "#000000";
        this.size = 5;
        Client.list[id] = this;
        return this;
    }

    // This function stores client's clicks
    addClick(x, y, dragging, colour, size) {
        canvasX[this.id].push(x);
        canvasY[this.id].push(y);
        canvasDrag[this.id].push(dragging);
        canvasColour[this.id].push(colour);
        canvasSize[this.id].push(size);

        deltaCanvasX[this.id].push(x);
        deltaCanvasY[this.id].push(y);
        deltaCanvasDrag[this.id].push(dragging);
        deltaCanvasColour[this.id].push(colour);
        deltaCanvasSize[this.id].push(size);
    }

    update() {
        if (this.mouseDown)
            this.idle = false;
        if (this.mouseMove && this.mouseDown && !this.idle) {
            this.addClick(this.mouseX, this.mouseY, true, this.colour, this.size);
        }
        else if (this.mouseDown && !this.idle) {
            this.addClick(this.mouseX, this.mouseY, true, this.colour, this.size);
        }
        else if (!this.idle) {
            this.addClick(this.mouseX, this.mouseY, false, this.colour, this.size);
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
                    deltaCanvasColour[i].splice(0, deltaCanvasDrag[i].length - 2);
                    deltaCanvasSize[i].splice(0, deltaCanvasDrag[i].length - 2);
            }
            else {
                    deltaCanvasX[i] = [];
                    deltaCanvasY[i] = [];
                    deltaCanvasDrag[i] = [];
                    deltaCanvasColour[i] = [];
                    deltaCanvasSize[i] = [];
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

        deltaCanvasX[client.id] = [];
        deltaCanvasY[client.id] = [];
        deltaCanvasDrag[client.id] = [];
        deltaCanvasSize[client.id] = [];

        // Send all drawing data to new client to get their canvas up to date with the current drawings
        var initPack = {
            initX: canvasX,
            initY: canvasY,
            initDrag: canvasDrag,
            initColour: canvasColour,
            initSize: canvasSize
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
            console.log("size changed");
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

setInterval(function () {
    Client.update();
    var pack = {
        canvasX: deltaCanvasX,
        canvasY: deltaCanvasY,
        canvasDrag: deltaCanvasDrag,
        canvasColour: deltaCanvasColour,
        canvasSize: deltaCanvasSize
    };
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('updateCanvas', pack);
    }
    Client.clearDelta();
}, 1000/60);