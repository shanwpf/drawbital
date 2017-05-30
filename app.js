var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var SOCKET_LIST = {};
var MIN_FONT_SIZE = 15;
var MINUTES_UNTIL_PERMANENT = 1;
var DEBUG = true;
var timeThen = 0;

var USERS = {
    //username:password
    "bob":"asd",
    "bob2":"bob",
    "bob3":"ttt",  
}
 
//cb stands for callback
var isValidPassword = function(data,cb){
    setTimeout(function(){
        cb(USERS[data.username] === data.password);
    },10);
}
var isUsernameTaken = function(data,cb){
    setTimeout(function(){
        cb(USERS[data.username]);
    },10);
}
var addUser = function(data,cb){
    setTimeout(function(){
        USERS[data.username] = data.password;
        cb();
    },10);
}

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
    var loggedIn = false;
    console.log('socket connection');
    SOCKET_LIST[socket.id] = socket;

    socket.on('signIn', function(data){
        isValidPassword(data,function(res){
            if(res){
               loggedIn = true;
               Client.onConnect(socket,data.username);
               socket.emit('signInResponse',{success:true});
            } else {
                socket.emit('signInResponse',{success:false});         
            }
        });
    });

    socket.on('signUp', function(data){
        isUsernameTaken(data,function(res){
            if(res){
                socket.emit('signUpResponse',{success:false});     
            } else {
                addUser(data,function(){
                    socket.emit('signUpResponse',{success:true});                  
                });
            }
        });    
    });

    socket.on('disconnect', function () {
        console.log('socket disconnected');
        delete SOCKET_LIST[socket.id];
        if(loggedIn)
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
        this.clientColours = {};
        this.clientSizes = {};
        this.actionList = [];
        this.actionMap = {}
        this.deletedActionMap = {}
        this.publicPathMap = {};
        this.permanentActionList = [];
    }

    onClientJoin(client) {
        this.clientColours[client.id] = [];
        this.clientSizes[client.id] = [];
        this.actionMap[client.id] = [];
        this.deletedActionMap[client.id] = [];
        this.publicPathMap[client.id] = [];
        SOCKET_LIST[client.id].emit('updatePerm', this.getPermData());
    }

    onClientLeave(client) {
        delete this.clientColours[client.id];
        delete this.clientSizes[client.id];
        delete this.actionMap[client.id];
        delete this.deletedActionMap[client.id];
        delete this.publicPathMap[client.id];
    }

    makePermanent() {
        for(var i = 0; i < this.actionList.length; i++) {
            if(!this.actionList[i].deleted) {
                this.permanentActionList.push(this.actionList[i]);
            }
        }
        this.actionList.splice(0);
        for(var i in this.actionMap) {
            this.actionMap[i] = [];
            this.deletedActionMap[i] = [];
        }
        this.refresh(true);
    }

    copyPathToServer(client) {
        this.addAction(client.id, this.publicPathMap[client.id], client.curTool, client.colour, client.size);
        this.publicPathMap[client.id] = [];
        this.refresh();
    }

    addAction(id, path, tool, colour, size, text) {
        var action = new Action(id, path, tool, colour, size, text);
        this.actionList.push(action);
        this.actionMap[id].push(this.actionList.length - 1);
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

    refresh(refreshPerm) {
        if(refreshPerm) {
            for (var i in this.room.clientList) {
                SOCKET_LIST[i].emit('updatePerm', this.getPermData());
                SOCKET_LIST[i].emit('initSurface', this.getCurData());
            }
        }
        else {
            for (var i in this.room.clientList) {
                SOCKET_LIST[i].emit('initSurface', this.getCurData());
            }
        }
    }

    getDeltaData() {
        var pack = {
            clientColours: this.clientColours,
            clientSizes: this.clientSizes,
            publicPathMap: this.publicPathMap
        }
        return pack;
    }

    getPermData() {
        var pack = {
            actionList: this.permanentActionList
        }
        return pack;
    }

    getCurData() {
        var pack = {
            actionList: this.actionList
        }
        return pack;
    }

    clearSurface() {
        this.actionList = [];
        this.permanentActionList = [];
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
    static onConnect(socket, username) {
        var client = new Client(socket.id);
        client.name = username;
        emitConnection(client.name);
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
            this.surface.copyPathToServer(this.client);
        }
    }

    addClick() {
        var id = this.client.id;
        this.surface.clientColours[id] = this.client.colour;
        this.surface.clientSizes[id] = this.client.size;
        this.surface.publicPathMap[id].push([this.client.mouseX, this.client.mouseY]);
    }
}

class Text extends Tool {
    constructor(surface, client) {
        super(surface, client);
        this.type = "text";
    }

    use(text) {
        if (text) {
            this.surface.addAction(this.client.id, [[this.client.mouseX, this.client.mouseY]], "text", this.client.colour,
                                    Math.max(MIN_FONT_SIZE, this.client.size), text);
            this.surface.refresh();
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
}, 15);

setInterval(function () {
    for (var i = 0; i < Room.list.length; i++) {
        var room = Room.list[i];
        var pack = room.surface.getDeltaData();
        for (var j in room.clientList) {
            SOCKET_LIST[j].emit('updateSurface', pack);
        }
    }
    if(Date.now() - timeThen >= MINUTES_UNTIL_PERMANENT * 60 * 1000) {
        for(var i = 0; i < Room.list.length; i++) {
            Room.list[i].surface.makePermanent();
        }
        timeThen = Date.now();
    }
}, 45);