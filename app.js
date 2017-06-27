var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var firebase = require("firebase");
var SOCKET_LIST = {};
var MIN_FONT_SIZE = 15;
var MINUTES_UNTIL_PERMANENT = 1;
var DEBUG = true;
var GAME_TIME_LIMIT = 60;
var GAME_MAX_POINTS = 10;
var GAME_MIN_POINTS = 2;
var GAME_TRANSITION_TIME = 10;
var timeThen = 0;
var gameWords = {
    "hard": []
}

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
        logInPass: password
    });
}

//cb stands for callback
var isValidPassword = function (data, cb) {
    setTimeout(function () {
        return firebase.database().ref('/users/' + data.username).once('value').then(function (snapshot) {
            cb(snapshot.val() !== null && snapshot.val().logInPass == data.password)
        });
    }, 10);
}
var isUsernameTaken = function (data, cb) {
    setTimeout(function () {
        return firebase.database().ref('/users/' + data.username).once('value').then(function (snapshot) {
            cb(snapshot.val() !== null)
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

class Game {
    constructor(room) {
        this.room = room;
        this.timer = GAME_TIME_LIMIT;
        this.curDrawerIdx = -1;
        this.curDrawer = this.room.clients[0];
        this.category = "hard"; // Current word category
        this.then = 0;
        this.started = false;   // Has the game started?
        this.roundTransition = false;   // Is the game transitioning to a new round?
        this.word = ""; // Current word to guess
        this.pointsAwarded = GAME_MAX_POINTS; // Points awarded to the next user that guesses correctly
    }

    update() {
        if (this.started && this.room.clients.length <= 1)
            this.started = false;
        else if (!this.started && this.room.clients.length >= 2) {
            this.started = true;
            this.then = Date.now();
            this.nextDrawer();
        }

        if(this.roundTransition) {
            if(this.timer > 0) {
                this.updateTimer();
            } 
            else {
                this.nextDrawer();
            }
            return;
        }

        if (this.started) {
            if (this.timer > 0) {
                this.updateTimer();
            }
            else {
                this.roundOver();
            }
        }
    }

    // Run countdown timer
    updateTimer() {
        this.timer -= (Date.now() - this.then) / 1000;
        this.then = Date.now();
        for (var i = 0; i < this.room.clients.length; i++) {
            SOCKET_LIST[this.room.clients[i].id].emit('gameTimer', { value: this.timer });
        }
    }

    // Handle transition period between rounds
    roundOver() {
        this.roundTransition = true;
        this.curDrawer.canDraw = false;
        emitToChat(this.room, 'Round over!');
        emitToChat(this.room, 'The answer was: ' + this.word);
        this.timer = GAME_TRANSITION_TIME;
        refreshUserList(this.room,"empty");
    }

    // Switch to the next drawer and starts a new round
    nextDrawer() {
        this.room.surface.clearSurface();
        this.curDrawerIdx = (this.curDrawerIdx + 1) % this.room.clients.length;
        this.curDrawer = this.room.clients[this.curDrawerIdx];
        this.curDrawer.canDraw = true;
        for (var i = 0; i < this.room.clients.length; i++) {
            this.room.clients[i].solved = false;
        }
        this.word = this.getRandomWord();
        SOCKET_LIST[this.curDrawer.id].emit('gameWord', { value: this.word });
        this.timer = GAME_TIME_LIMIT;
        this.pointsAwarded = GAME_MAX_POINTS;
        this.roundTransition = false;
    }

    // Returns a random word under the current category
    getRandomWord() {
        return gameWords[this.category][Math.floor(Math.random() * (gameWords[this.category].length))];
    }

    // Takes in a client obj and a answer string to verify if the answer is correct
    checkAnswer(client, answer) {
        var correct = answer.toLowerCase().trim() == this.word.toLowerCase().trim();
        if (!client.solved && correct) {
            SOCKET_LIST[client.id].emit("gameCheckAnswer", { value: true });
            client.points += this.pointsAwarded;
            if(this.pointsAwarded > GAME_MIN_POINTS)
                this.pointsAwarded -= 2;
            client.solved = true;
            emitToChat(this.room, '<p class="text-success">'+ client.name + ' got the correct answer!</p>');
            refreshUserList(client.room,"empty");
        }
        /* Unnecessary. Rather keep chat clean
        else {
            if(!client.solved)
                emitToClientChat(client, '<p class="text-danger">'+answer + ' is incorrect, try again.</p>');
        }
        */
        return correct;
    }
}

// Read word bank from text file
function getWords() {
    var fs = require("fs");
    fs.readFile("./words-hard.txt", function (text) {
        var text = fs.readFileSync("./words-hard.txt").toString('utf-8');
        gameWords["hard"] = text.split("\n")
    });
}
getWords();

class Room {
    constructor(name, maxUsers, password, creator, mode) {
        this.name = name;
        this.maxUsers = maxUsers;
        this.password = password;
        this.creatorId = creator;
        this.clientList = {};
        this.clients = [];
        this.mode = mode || "draw"; // "draw" or "game"
        this.game = undefined;
        this.chatText = []; //chatText object structure; .message, .userName
        this.chatUsers = [];
        this.surface = new Surface(this);
        Room.list.push(this);
        return this;
    }

    getGameData() {
        var pack = {
            timer: this.timer,
            curDrawer: this.curDrawer,
        }
        return pack;
    }

    addClient(client) {
        client.joinRoom(this);
        this.clientList[client.id] = client;
        this.clients.push(client);
        this.surface.onClientJoin(client);
        if (this.mode == "draw")
            client.canDraw = true;
        else
            client.canDraw = false;
        SOCKET_LIST[client.id].emit('joinStatus', { value: true, roomMode: this.mode });
        SOCKET_LIST[client.id].emit('drawServerData', this.surface.getServerData());
    }

    removeClient(client) {
        for (var i = 0; i < this.clients.length; i++) {
            if (this.clients[i] == client) {
                this.clients.splice(i, 1);
            }
        }
        delete this.clientList[client.id];
        this.surface.onClientLeave(client);
    }

    static updateRoomList() {
        var pack = [];
        for (var i = 0; i < Room.list.length; i++) {
            pack[i] = {
                roomName: Room.list[i].name,
                numUsers: Object.keys(Room.list[i].clientList).length,
                isPrivate: (Room.list[i].password ? true : false),
                maxUsers: Room.list[i].maxUsers,
                mode: Room.list[i].mode
            }
        }
        return pack;
    }

    addChatMsg(client, message) {
        this.chatText.push({ message: message, userName: client.name });
        if (!this.game || client == this.game.curDrawer
            || (this.game && !this.game.checkAnswer(client, message)))
            emitToChat(this, client.name + ': ' + message);
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
            this.publicPathMap[i] = [];
        }
        for (var i in this.room.clientList) {
            SOCKET_LIST[i].emit('clear');
        }
    }
}

var defaultRoom = new Room("Welcome to Drawbital - Default room - Free draw");

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
        this.canDraw = true;
        this.points = 0;
        this.solved = false;
        Client.list[id] = this;
        return this;
    }

    joinRoom(room) {
        if (this.room) {
            this.room.removeClient(this);
        }
        this.points = 0;
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
        if (this.canDraw) {
            if (!this.room)
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
    }

    // Handle new connections
    static onConnect(socket, username) {
        var client = new Client(socket.id);
        client.name = username;

        //emitConnection(client.name, client); Unnecessary

        socket.on('undo', function () {
            client.room.surface.undo(client.id);
        })
        socket.on('redo', function () {
            client.room.surface.redo(client.id);
        })
        socket.on('clear', function () {
            if (client.canDraw)
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
            if (client.canDraw)
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


        socket.on('sendMsgToServer', function (data) {
            client.room.addChatMsg(client, data);
        });

        socket.on('evalServer', function (data) {
            if (!DEBUG)
                return;
            //debugg purpose
            var res = eval(data);
            socket.emit('evalAnswer', res);
        });

        socket.on('createRoom', function (data) {
            if (client.room) {
                client.room.chatUsers = client.room.chatUsers.filter(function (e) { return e !== client.name });
                refreshUserList(client.room, client.name + " has left the room");
            }
            var room = new Room(data.roomName, data.maxUsers, data.password, data.creatorId, data.mode);
            if (room.mode == "game") {
                room.game = new Game(room);
            }
            room.addClient(Client.list[room.creatorId]);
            //add user's name into the room chatusers list
            room.chatUsers.push(Client.list[room.creatorId].name);
            socket.emit('connectRoom', { chatTextList: client.room.chatText });
            refreshUserList(client.room, '<p class="text-primary">' + client.name + " has joined the room</p>");
        });

        socket.on('joinRoom', function (data) {
            if (!Room.list[data.roomNumber].password || Room.list[data.roomNumber].password == data.password)
                if (client.room) {
                    client.room.chatUsers = client.room.chatUsers.filter(function (e) { return e !== client.name });
                    // refresh for those who are in current room 
                    refreshUserList(client.room, '<p class="text-danger">' + client.name + " has left the room</p>");
                }
            Room.list[data.roomNumber].addClient(Client.list[data.clientId]);
            //add user's name into the room chatusers list
            Room.list[data.roomNumber].chatUsers.push(Client.list[data.clientId].name);
            socket.emit('connectRoom', { chatTextList: client.room.chatText });
            // refresh for those who are in next room
            refreshUserList(client.room, '<p class="text-primary">' + client.name + " has joined the room</p>");
        });
    }


    static onDisconnect(socket) {
        var client = Client.list[socket.id];
        // remove name of users from chatusers
        if (client.room)
            client.room.chatUsers = client.room.chatUsers.filter(function (e) { return e !== client.name });
        //emitDisconnect(client.name); Unecessary
        if (client.room)
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
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('addToChat', name + " has connected to the server");
    }
}
function emitDisconnect(name) {
    for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('addToChat', name + " has Disconnected from the server");
        
    }
}

// Send a message to all clients in room
function emitToChat(room, string) {
    for (var i in room.clientList) {
        SOCKET_LIST[i].emit('addToChat', string);
    }
}

// Send a message to a specific client only
function emitToClientChat(client, string) {
    SOCKET_LIST[client.id].emit('addToChat', string);
}


//feed string "empty" if you dont want display message after refresh, no overloading in js :(
function refreshUserList(room, string) {
    var chatTextList = [];

    if(room.mode!=="game")
        chatTextList = room.chatUsers 
    else{
        for (var i in room.clientList){
            chatTextList.push({name: room.clientList[i].name, score: room.clientList[i].points});
        }
    }

    for (var i in room.clientList){
        SOCKET_LIST[i].emit('refreshUserList', chatTextList);
        if(string != "empty")
            SOCKET_LIST[i].emit('addToChat', string);
    }

}


setInterval(function () {
    for (var i in SOCKET_LIST) {
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

setInterval(function () {
    for (var i = 0; i < Room.list.length; i++) {
        var room = Room.list[i];
        if (room.game)
            room.game.update();
    }
}, 1000)