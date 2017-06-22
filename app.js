var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var firebase = require("firebase");
var SOCKET_LIST = {};
var MIN_FONT_SIZE = 15;
var MINUTES_UNTIL_PERMANENT = 1;
var DEBUG = true;
var timeThen = 0;

//this way of doing is suppose to be for enduser, not for server
//init firebase database
var config = {
    apiKey: "AIzaSyB4MInO1YJZCiHJOg4EqGRzcoz7Kpz1vqA",
    authDomain: "drawer-e233e.firebaseapp.com",
    databaseURL: "https://drawer-e233e.firebaseio.com",
    projectId: "drawer-e233e",
    storageBucket: "drawer-e233e.appspot.com",
    messagingSenderId: "624328057648"
  };
firebase.initializeApp(config);

function writeUserData(userId, password) {
  firebase.database().ref('users/' + userId).set({
    logInPass:password
  });
}

//cb stands for callback
var isValidPassword = function (data, cb) {
    setTimeout(function () {
        return firebase.database().ref('/users/' + data.username).once('value').then(function(snapshot) {
            cb(snapshot.val() !==null && snapshot.val().logInPass == data.password)
        });
    }, 10);
}
var isUsernameTaken = function (data, cb) {
    setTimeout(function () {
        return firebase.database().ref('/users/' + data.username).once('value').then(function(snapshot) {
            cb(snapshot.val() !==null)
        });
    }, 10);
}
var addUser = function (data, cb) {
    setTimeout(function () {
        writeUserData(data.username, data.password);
        cb();
    }, 10);
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

    socket.on('signIn', function (data) {
        isValidPassword(data, function (res) {
            if (res) {
                loggedIn = true;
                Client.onConnect(socket, data.username);
                socket.emit('signInResponse', { success: true });
            } else {
                socket.emit('signInResponse', { success: false });
            }
        });
    });

    socket.on('signUp', function (data) {
        isUsernameTaken(data, function (res) {
            if (res) {
                socket.emit('signUpResponse', { success: false });
            } else {
                addUser(data, function () {
                    socket.emit('signUpResponse', { success: true });
                });
            }
        });
    });

    socket.on('disconnect', function () {
        console.log('socket disconnected');
        delete SOCKET_LIST[socket.id];
        if (loggedIn)
            Client.onDisconnect(socket);
    });
})

class Room {
    constructor(name, maxUsers, password, creator) {
        this.name = name;
        this.maxUsers = maxUsers;
        this.password = password;
        this.creatorId = creator;
        this.clientList = {};
        this.surface = new Surface(this);
        Room.list.push(this);
        return this;
    }

    addClient(client) {
        client.joinRoom(this);
        this.clientList[client.id] = client;
        this.surface.onClientJoin(client);
        SOCKET_LIST[client.id].emit('joinStatus', { value: true });
        SOCKET_LIST[client.id].emit('drawServerData', this.surface.getServerData());
    }

    removeClient(client) {
        delete this.clientList[client.id];
        this.surface.onClientLeave(client);
    }

    static updateRoomList() {
        var pack = [];
        for(var i = 0; i < Room.list.length; i++) {
            pack[i] = {
                roomName: Room.list[i].name,
                numUsers: Object.keys(Room.list[i].clientList).length,
                isPrivate: (Room.list[i].password ? true : false),
                maxUsers: Room.list[i].maxUsers
            }
        }
        return pack;
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
        SOCKET_LIST[client.id].emit('drawPermData', this.getPermData());
    }

    onClientLeave(client) {
        delete this.clientColours[client.id];
        delete this.clientSizes[client.id];
        delete this.actionMap[client.id];
        delete this.deletedActionMap[client.id];
        delete this.publicPathMap[client.id];
    }

    // Makes all existing actions in actionList permanent
    // Actions that are permanent will not be modified by the client
    makePermanent() {
        for (var i = 0; i < this.actionList.length; i++) {
            if (!this.actionList[i].deleted) {
                this.permanentActionList.push(this.actionList[i]);
            }
        }
        this.actionList.splice(0);
        for (var i in this.actionMap) {
            this.actionMap[i] = [];
            this.deletedActionMap[i] = [];
        }
        this.refresh(true);
    }

    // Creates an action after client has finished a stroke
    copyPathToServer(client) {
        this.addAction(client.id, this.publicPathMap[client.id], client.curTool, client.colour, client.size);
        this.publicPathMap[client.id] = [];
        this.refresh(false);
    }

    // Creates an action and adds it to actionList and updates actionMap
    addAction(id, path, tool, colour, size, text) {
        var action = new Action(id, path, tool, colour, size, text);
        this.actionList.push(action);
        this.actionMap[id].push(this.actionList.length - 1);
    }

    // Marks an action as deleted so it is not rendered
    undo(id) {
        if (this.actionMap[id].length > 0) {
            var idx = this.actionMap[id].pop();
            this.actionList[idx].deleted = true;
            this.deletedActionMap[id].push(idx);
            this.refresh();
        }
    }

    // Unmarks a deleted action. It will be rendered
    redo(id) {
        if (this.deletedActionMap[id].length > 0) {
            var idx = this.deletedActionMap[id].pop();
            this.actionList[idx].deleted = false;
            this.actionMap[id].push(idx);
            this.refresh();
        }
    }

    // Refreshes and updates serverCanvas on the client if !refreshPerm
    // Refreshes and updates serverCanvas and permCanvas on the client if refreshPerm
    refresh(refreshPerm) {
        if (refreshPerm) {
            for (var i in this.room.clientList) {
                SOCKET_LIST[i].emit('drawPermData', this.getPermData());
                SOCKET_LIST[i].emit('drawServerData', this.getServerData());
            }
        }
        else {
            for (var i in this.room.clientList) {
                SOCKET_LIST[i].emit('drawServerData', this.getServerData());
            }
        }
    }

    getPublicData() {
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

    getServerData() {
        var pack = {
            actionList: this.actionList
        }
        return pack;
    }

    // Deletes ALL data (including permanent data)
    // Probably won't be a public feature at release
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
        this.room = undefined;
        this.toolList = {
            brush: undefined,
            text: undefined
        };
        this.curTool = "brush";
        Client.list[id] = this;
        return this;
    }

    joinRoom(room) {
        if(this.room) {
            this.room.removeClient(this);
        }
        this.room = room;
        this.toolList.brush = new Brush(this.room.surface, this);
        this.toolList.text = new Text(this.room.surface, this);
    }
    // Use current tool
    useCurTool(text) {
        if (this.curTool === "brush") {
            this.toolList.brush.use();
        }
        else if (this.curTool === "text") {
            this.toolList.text.use(text);
        }
    }

    update() {
        if(!this.room)
            return;
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
        emitConnection(client.name, client);
        // PLACEHOLDER: Replace when rooms are implemented properly
        //defaultRoom.addClient(client);

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
        socket.on('Apply', function (data) {
            if (client.name != data.username) {
                emitToChat(client.name + " now named: " + data.username);
                client.name = data.username;
            }
        });

        socket.on('sendMsgToServer', function (data) {
            for (var i in SOCKET_LIST) {
                SOCKET_LIST[i].emit('addToChat', client.name + ': ' + data);
            }
        });

        socket.on('evalServer', function (data) {
            if (!DEBUG)
                return;
            //debugg purpose
            var res = eval(data);
            socket.emit('evalAnswer', res);
        });

        socket.on('createRoom', function(data) {
            var room = new Room(data.roomName, data.maxUsers, data.password, data.creatorId);
            room.addClient(Client.list[room.creatorId]);
        })
        
        socket.on('joinRoom', function(data) {
            if(!Room.list[data.roomNumber].password || Room.list[data.roomNumber].password == data.password)
                Room.list[data.roomNumber].addClient(Client.list[data.clientId]);
        })
    }

    static onDisconnect(socket) {
        var client = Client.list[socket.id];
        emitDisconnect(client.name);
        if(client.room) 
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

// An action consists of all the data required to draw an element on the canvas
// text is optional, only needed if the action is to draw text
class Action {
    constructor(id, points, tool, colour, size, text) {
        this.id = id;
        this.points = points; // points = array of x,y coordinates = [[x,y], [x,y], ...]
        this.tool = tool; // "brush", "text", etc.
        this.colour = colour; // RGBA format
        this.size = size;
        this.text = text;
        this.deleted = false; // Mark for lazy deletion
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

    // Record the path travelled by client's cursor
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
function emitConnection(name, client) {
    var dataArr = [];
    for (var i in Client.list) {
           dataArr.push(Client.list[i].name);
    }
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('addToChat', name + ': ' + "has connected");
        if(i !== client.id)
           SOCKET_LIST[i].emit('connectUsers', name);
    }
    SOCKET_LIST[client.id].emit('initUsers', dataArr);
}
function emitDisconnect(name) {
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('addToChat', name + " has Disconnected");
          SOCKET_LIST[i].emit('disconnectUsers', name);
    }
}

function emitToChat(string) {
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('addToChat', string);
    }
}

setInterval(function () {
    for(var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('updateRoomList', Room.updateRoomList());
    }
}, 2000)

// Receive data from clients and update their states
setInterval(function () {
    Client.update();
}, 30);

//  Send data to clients
setInterval(function () {
    for (var i = 0; i < Room.list.length; i++) {
        var room = Room.list[i];
        var pack = room.surface.getPublicData();
        for (var j in room.clientList) {
            SOCKET_LIST[j].emit('drawPublicData', pack);
        }
    }
    if (Date.now() - timeThen >= MINUTES_UNTIL_PERMANENT * 60 * 1000) {
        for (var i = 0; i < Room.list.length; i++) {
            Room.list[i].surface.makePermanent();
        }
        timeThen = Date.now();
    }
}, 45);