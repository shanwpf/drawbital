var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var SOCKET_LIST = {};
// canvas contains all drawing data from all clients
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

class Room {
    constructor(name) {
        this.name = name;
        this.clientList = {};
        this.surface = new Surface(this);
        Room.list.push(this);
        return this;
    }

    addClient(client) {
        this.clientList[client.id] = client;
        this.surface.onClientJoin(client);
        SOCKET_LIST[client.id].emit('initSurface', this.surface.getCurData());
    }

    removeClient(client) {
        delete this.clientList[client.id];
        this.surface.onClientLeave(client);
    }
}

Room.list = []

class Surface {
    constructor(room) {
        this.room = room;
        this.surfaceX = [];
        this.surfaceY = [];
        this.surfaceDrag = [];
        this.surfaceColour = [];
        this.surfaceSize = [];
        this.surfaceText = [];
        this.deltaSurfaceX = {};
        this.deltaSurfaceY = {};
        this.deltaSurfaceDrag = {};
        this.deltaSurfaceColour = {};
        this.deltaSurfaceSize = {};
        this.deltaSurfaceText = {};
    }

    onClientJoin(client) {
        this.deltaSurfaceX[client.id] = [];
        this.deltaSurfaceY[client.id] = [];
        this.deltaSurfaceDrag[client.id] = [];
        this.deltaSurfaceColour[client.id] = [];
        this.deltaSurfaceSize[client.id] = [];
        this.deltaSurfaceText[client.id] = [];
    }

    onClientLeave(client) {
        delete this.deltaSurfaceX[client.id];
        delete this.deltaSurfaceY[client.id];
        delete this.deltaSurfaceDrag[client.id];
        delete this.deltaSurfaceColour[client.id];
        delete this.deltaSurfaceSize[client.id];
        delete this.deltaSurfaceText[client.id];
    }

    getDeltaData() {
        var pack = {
            surfaceX: this.deltaSurfaceX,
            surfaceY: this.deltaSurfaceY,
            surfaceDrag: this.deltaSurfaceDrag,
            surfaceColour: this.deltaSurfaceColour,
            surfaceSize: this.deltaSurfaceSize,
            surfaceText: this.deltaSurfaceText
        }
        return pack;
    }

    getCurData() {
        var pack = {
            surfaceX: this.surfaceX,
            surfaceY: this.surfaceY,
            surfaceDrag: this.surfaceDrag,
            surfaceColour: this.surfaceColour,
            surfaceSize: this.surfaceSize,
            surfaceText: this.surfaceText
        }
        return pack;
    }

    clearDelta() {
        for (var i in this.deltaSurfaceDrag) {
            if (this.deltaSurfaceDrag[i][this.deltaSurfaceDrag[i].length - 1]) {
                this.deltaSurfaceX[i].splice(0, this.deltaSurfaceX[i].length - 2);
                this.deltaSurfaceY[i].splice(0, this.deltaSurfaceY[i].length - 2);
                this.deltaSurfaceDrag[i].splice(0, this.deltaSurfaceDrag[i].length - 2);
                this.deltaSurfaceColour[i].splice(0, this.deltaSurfaceColour[i].length - 2);
                this.deltaSurfaceSize[i].splice(0, this.deltaSurfaceSize[i].length - 2);
                this.deltaSurfaceText[i].splice(0, this.deltaSurfaceText[i].length - 2);
            }
            else {
                this.deltaSurfaceX[i] = [];
                this.deltaSurfaceY[i] = [];
                this.deltaSurfaceDrag[i] = [];
                this.deltaSurfaceColour[i] = [];
                this.deltaSurfaceSize[i] = [];
                this.deltaSurfaceText[i] = [];
            }
        }
    }

    clearSurface() {
        this.surfaceX.splice(0, this.surfaceX.length);
        this.surfaceY.splice(0, this.surfaceY.length);
        this.surfaceDrag.splice(0, this.surfaceDrag.length);
        this.surfaceColour.splice(0, this.surfaceColour.length);
        this.surfaceSize.splice(0, this.surfaceSize.length);
        this.surfaceText.splice(0, this.surfaceText.length);
        for (var i in this.room.clientList) {
            SOCKET_LIST[i].emit('clear');
        }
    }
}

var defaultRoom = new Room("default");

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
        this.room = defaultRoom;
        this.toolList = {
            brush: new Brush(this.room.surface),
            text: new Text(this.room.surface)
        };
        this.curTool = "brush";
        Client.list[id] = this;
        return this;
    }

    useCurTool(text) {
        if (this.curTool === "brush") {
            this.toolList.brush.addClick(this.id, this.mouseX, this.mouseY, this.dragging, this.colour, this.size);
        }
        else if (this.curTool === "text") {
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

    // Handle new connections
    static onConnect(socket) {
        var client = new Client(socket.id);

        // PLACEHOLDER: Replace when rooms are implemented properly
        defaultRoom.addClient(client);

        socket.on('clear', function () {
            client.room.surface.clearSurface();
        })

        socket.on('colour', function (data) {
            client.colour = data.value;
        })

        socket.on('size', function (data) {
            client.size = data.value;
        })

        socket.on('changeTool', function (data) {
            client.curTool = data.toolName;
        })

        socket.on('drawText', function (data) {
            client.useCurTool(data.text);
        })

        socket.on('keyPress', function (data) {
            if (data.inputId === 'mousedown') {
                client.mouseDown = data.state;
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
        var client = Client.list[socket.id];
        client.room.removeClient(client);
        delete Client.list[socket.id];
    }

    static update() {
        for (var i in Client.list) {
            var client = Client.list[i];
            client.update();
        }
    }
}

Client.list = {};

class Tool {
    constructor(surface) {
        this.surface = surface;
        this.type;
        return this;
    }
}

class Brush extends Tool {
    constructor(surface) {
        super(surface);
        this.type = "brush";
    }

    addClick(id, x, y, dragging, colour, size) {
        this.surface.surfaceX.push(x);
        this.surface.surfaceY.push(y);
        this.surface.surfaceDrag.push(dragging);
        this.surface.surfaceColour.push(colour);
        this.surface.surfaceSize.push(size);

        this.surface.deltaSurfaceX[id].push(x);
        this.surface.deltaSurfaceY[id].push(y);
        this.surface.deltaSurfaceDrag[id].push(dragging);
        this.surface.deltaSurfaceColour[id].push(colour);
        this.surface.deltaSurfaceSize[id].push(size);
    }
}

class Text extends Tool {
    constructor(surface) {
        super(surface);
        this.type = "text";
    }

    addText(id, x, y, colour, size, text) {
        if (text) {
            this.surface.surfaceText.push({ x: x, y: y, colour: colour, size: Math.max(7, size), text: text });
            this.surface.deltaSurfaceText[id].push({ x: x, y: y, colour: colour, size: Math.max(7, size), text: text });
        }
    }
}

setInterval(function () {
    Client.update();
    for (var i = 0; i < Room.list.length; i++) {
        var room = Room.list[i];
        var pack = room.surface.getDeltaData();
        for (var j in room.clientList) {
            SOCKET_LIST[j].emit('updateSurface', pack);
        }
        room.surface.clearDelta();
    }
}, 1000/60);