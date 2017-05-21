var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var SOCKET_LIST = {};
var MIN_FONT_SIZE = 15;
var DEBUG = true;

// Send html file to client using Express
app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

// Start server
server.listen(process.env.PORT || 2000);
console.log("Server started");

io.sockets.on('connection', function (socket) {
    console.log('socket connection');
    SOCKET_LIST[socket.id] = socket;
    Client.onConnect(socket);
 

    socket.on('disconnect', function () {
        console.log('socket disconnected');
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
        this.deltaSurfaceX = {};
        this.deltaSurfaceY = {};
        this.deltaSurfaceDrag = {};
        this.deltaSurfaceColour = {};
        this.deltaSurfaceSize = {};
        this.deltaSurfaceText = {};
        this.actionList = [];
        this.actionMap = {}
        this.deletedActionMap = {}
    }

    onClientJoin(client) {
        this.deltaSurfaceX[client.id] = [];
        this.deltaSurfaceY[client.id] = [];
        this.deltaSurfaceDrag[client.id] = [];
        this.deltaSurfaceColour[client.id] = [];
        this.deltaSurfaceSize[client.id] = [];
        this.deltaSurfaceText[client.id] = [];
        this.actionMap[client.id] = [];
        this.deletedActionMap[client.id] = [];
    }

    onClientLeave(client) {
        delete this.deltaSurfaceX[client.id];
        delete this.deltaSurfaceY[client.id];
        delete this.deltaSurfaceDrag[client.id];
        delete this.deltaSurfaceColour[client.id];
        delete this.deltaSurfaceSize[client.id];
        delete this.deltaSurfaceText[client.id];
        delete this.actionMap[client.id];
        delete this.deletedActionMap[client.id];
    }

    undo(id) {
        if (this.actionMap[id].length > 0) {
            var idx = this.actionMap[id].pop();
            this.actionList[idx].deleted = true;
            this.deletedActionMap[id].push(idx);
            this.refresh();
        }
    }

    redo(id) {
        if (this.deletedActionMap[id].length > 0) {
            var idx = this.deletedActionMap[id].pop();
            this.actionList[idx].deleted = false;
            this.actionMap[id].push(idx);
            this.refresh();
        }
    }

    refresh() {
        for (var i in this.room.clientList) {
            SOCKET_LIST[i].emit('initSurface', this.getCurData());
        }
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
            actionList: this.actionList
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
        this.actionList = [];
        for (var i in this.actionMap) {
            this.actionMap[i] = [];
            this.deletedActionMap[i] = [];
        }
        for (var i in this.room.clientList) {
            SOCKET_LIST[i].emit('clear');
        }
    }
}

var defaultRoom = new Room("default");

class Client {
    constructor(id) {
        this.name = "default";
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
            brush: new Brush(this.room.surface, this),
            text: new Text(this.room.surface, this)
        };
        this.curTool = "brush";
        Client.list[id] = this;
        emitConnection(this.name);
        return this;
    }

    useCurTool(text) {
        if (this.curTool === "brush") {
            this.toolList.brush.use();
        }
        else if (this.curTool === "text") {
            this.toolList.text.use(text);
        }
    }

    update() {
        if (this.mouseDown) {
            this.idle = false;
        }
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
            this.idle = true;
            this.useCurTool();
        }
    }

    // Handle new connections
    static onConnect(socket) {
        var client = new Client(socket.id);

        // PLACEHOLDER: Replace when rooms are implemented properly
        defaultRoom.addClient(client);

        socket.on('undo', function () {
            client.room.surface.undo(client.id);
        })
        socket.on('redo', function () {
            client.room.surface.redo(client.id);
        })
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

        // on socket to handle chat
        socket.on('Apply',function(data){
            if(client.name != data.username){
                emitToChat(client.name + " now named: " + data.username);
                client.name = data.username;
            }
        });
        
        socket.on('sendMsgToServer',function(data){
            for(var i in SOCKET_LIST){
                SOCKET_LIST[i].emit('addToChat',  client.name + ': ' + data);
            }
        });

        socket.on('evalServer',function(data){
            if(!DEBUG)
                return;
            //debugg purpose
            var res = eval(data);
            socket.emit('evalAnswer',res);     
        });
    }

    static onDisconnect(socket) {
        var client = Client.list[socket.id];
        emitDisconnect(client.name);
        client.room.removeClient(client);
        delete Client.list[socket.id];
    }

    static update(ClientArr) {
        for (var i in Client.list) {
             Client.list[i].update();
        }
    }
}

Client.list = {};

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Action {
    constructor(id, points, tool, colour, size, text) {
        this.id = id;
        this.points = points;
        this.tool = tool;
        this.colour = colour;
        this.size = size;
        this.text = text;
        this.deleted = false;
    }
}

class Tool {
    constructor(surface, client) {
        this.surface = surface;
        this.client = client;
        this.type;
        return this;
    }
}

class Brush extends Tool {
    constructor(surface, client) {
        super(surface, client);
        this.type = "brush";
        this.points = [];
    }

    use() {
        this.addClick();
        if (this.client.idle) {
            var action = new Action(this.client.id, this.points, "brush", this.client.colour,
                this.client.size);
            this.points = [];
            this.surface.actionList.push(action);
            this.surface.actionMap[this.client.id].push(this.surface.actionList.length - 1);
        }
    }

    addClick() {
        var id = this.client.id;
        this.points.push(new Point(this.client.mouseX, this.client.mouseY));
        this.surface.deltaSurfaceX[id].push(this.client.mouseX);
        this.surface.deltaSurfaceY[id].push(this.client.mouseY);
        this.surface.deltaSurfaceDrag[id].push(this.client.dragging);
        this.surface.deltaSurfaceColour[id].push(this.client.colour);
        this.surface.deltaSurfaceSize[id].push(this.client.size);
    }
}

class Text extends Tool {
    constructor(surface, client) {
        super(surface, client);
        this.type = "text";
    }

    use(text) {
        if (text) {
            this.surface.actionList.push(new Action(this.client.id, new Array(new Point(this.client.mouseX, this.client.mouseY)), "text",
                this.client.colour, Math.max(MIN_FONT_SIZE, this.client.size), text));
            this.surface.deltaSurfaceText[this.client.id].push({
                x: this.client.mouseX,
                y: this.client.mouseY,
                colour: this.client.colour,
                size: Math.max(MIN_FONT_SIZE, this.client.size),
                text: text
            });
            this.surface.actionMap[this.client.id].push(this.surface.actionList.length - 1);
        }
    }
}



// functions for chat
function emitConnection(name)
{
    for(var i in SOCKET_LIST){
    SOCKET_LIST[i].emit('addToChat',  name + ': ' + "has connected");
    }
}
function emitDisconnect(name)
{
    for(var i in SOCKET_LIST){
    SOCKET_LIST[i].emit('addToChat',   name + " has Disconnected");
    }
}

function emitToChat(string)
{
    for(var i in SOCKET_LIST){
    SOCKET_LIST[i].emit('addToChat', string);
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