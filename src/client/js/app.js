var io = require('socket.io-client');
var render = require('./render');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');

var playerNameInput = document.getElementById('playerNameInput');
var socket;

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
}

async function startGame(type) {
    global.playerName = playerNameInput.value.toLowerCase();
    global.playerPassword = playerPasswordInput.value.toLowerCase();
    global.playerType = type;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;


    // Do login first for Players //
    let response = undefined;
    let previousJWT = window.localStorage.getItem('previousJWT');
    if (type === 'player' && !previousJWT) {
        response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerName: global.playerName,
                playerPassword: global.playerPassword
            })
        })
            .then(response => response.json());

        if (!response.success) {
            var nickErrorText = document.querySelector('#startMenu .input-error');
            nickErrorText.innerHTML = response.error;
            nickErrorText.style.display = 'block';
            return;
        }

        // Save the PLYR[ID] to localStorage
        window.localStorage.setItem('previousPLYRID', global.playerName);
        window.localStorage.setItem('previousJWT', response.data.sessionJwt);
    }


    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        if (type === 'player') {
            if (previousJWT) {
                socket = io({ query: "type=" + type + "&sessionJwt=" + previousJWT });
            }
            else {
                socket = io({ query: "type=" + type + "&sessionJwt=" + response.data.sessionJwt });
            }
        } else {
            socket = io({ query: "type=" + type });
        }
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    if (playerNameInput.value.length < 3) {
        return false;
    }
    var regex = /^[\w-]*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

window.onload = function () {

    var loginForm = document.getElementById('loginForm'),
        //btn = document.getElementById('startButton'),
        btnS = document.getElementById('spectateButton'),
        nickErrorText = document.querySelector('#startMenu .input-error'),
        playerNameInput = document.getElementById('playerNameInput'),
        playerPasswordInput = document.getElementById('playerPasswordInput'),
        logoutButton = document.getElementById('logoutButton');

    let previousPLYRID = window.localStorage.getItem('previousPLYRID');
    let previousJWT = window.localStorage.getItem('previousJWT');

    logoutButton.onclick = function () {
        window.localStorage.removeItem('previousJWT');
        location.reload();
    }

    if (!previousJWT) {
        logoutButton.style.display = 'none';
        if (previousPLYRID) {
            playerPasswordInput.focus();
            // Set the value of the playerNameInput to the previous PLYR[ID]
            playerNameInput.value = previousPLYRID;
        } else {
            playerNameInput.focus();
        }
    }
    else {
        logoutButton.style.display = 'block';
        playerPasswordInput.style.display = 'none';
        playerNameInput.value = previousPLYRID;
    }


    btnS.onclick = function () {
        startGame('spectator');
    };

    loginForm.onsubmit = function (e) {
        e.preventDefault();

        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.display = 'none';
            startGame('player');
        } else {
            nickErrorText.style.display = 'block';
            nickErrorText.innerHTML = 'PLYR[ID] is invalid!';
        }
    };
};

// TODO: Break out into GameControls.

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screen.width / 2,
    y: global.screen.height / 2,
    screenWidth: global.screen.width,
    screenHeight: global.screen.height,
    target: { x: global.screen.width / 2, y: global.screen.height / 2 }
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var c = window.canvas.cv;

var graph = c.getContext('2d');


document.getElementById("feed").onclick = function () {
    socket.emit('1');
    window.canvas.reenviar = false;
};

document.getElementById("feed").ontouchstart = function () {
    socket.emit('1');
    window.canvas.reenviar = false;
};

document.getElementById("split").onclick = function () {
    socket.emit('2');
    window.canvas.reenviar = false;
};

document.getElementById("split").ontouchstart = function () {
    socket.emit('2');
    window.canvas.reenviar = false;
};

// Disable zoom on desktop //
document.addEventListener("keydown", function (e) {
    if (

        e.ctrlKey &&
        (e.keyCode == "61" ||
            e.keyCode == "107" ||
            e.keyCode == "173" ||
            e.keyCode == "109" ||
            e.keyCode == "187" ||
            e.keyCode == "189")
    ) {
        e.preventDefault();
    }
});
document.addEventListener(
    "wheel",
    function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    },
    {
        passive: false
    }
);



function handleDisconnect() {
    socket.close();
    if (!global.kicked) { // We have a more specific error message 
        render.drawErrorMessage('Disconnected!', graph, global.screen);
    }
}



// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pongcheck', function () {
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
        window.chat.addSystemLine('Ping: ' + latency + 'ms');
    });

    // Handle error.
    socket.on('connect_error', handleDisconnect);
    socket.on('disconnect', handleDisconnect);

    // Handle connection.
    socket.on('welcome', function (playerSettings, gameSizes) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;
        player.target = window.canvas.target;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        window.chat.addSystemLine('Connected to the game!');
        window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
        if (global.mobile) {
            document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
        }
        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();
    });

    // socket.on('eaten', (data) => {
    //     console.log('eaten', data);
    //     document.getElementById('split_cell').currentTime = 0;
    //     document.getElementById('split_cell').play();
    // });

    socket.on('playerDied', (data) => {
        const player = isUnnamedCell(data.playerEatenName) ? 'An unnamed cell' : data.playerEatenName;
        //const killer = isUnnamedCell(data.playerWhoAtePlayerName) ? 'An unnamed cell' : data.playerWhoAtePlayerName;

        //window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten by <b>' + (killer) + '</b>');
        window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten');
    });

    socket.on('playerDisconnect', (data) => {
        window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> disconnected.');
    });

    socket.on('playerJoin', (data) => {
        window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> joined.');
    });

    socket.on('leaderboard', (data) => {
        leaderboard = data.leaderboard;
        playerAmount = data.players;
        render.drawLeaderboard(leaderboard, playerAmount, player);
    });

    socket.on('serverMSG', function (data) {
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on('serverSendPlayerChat', function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });

    // Handle movement.
    socket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList) {
        if (global.playerType == 'player') {
            player.x = playerData.x;
            player.y = playerData.y;
            player.hue = playerData.hue;
            player.massTotal = playerData.massTotal;
            player.cells = playerData.cells;
        }
        users = userData;
        foods = foodsList;
        viruses = virusList;
        fireFood = massList;


    });

    // Death.
    socket.on('RIP', function () {
        global.gameStart = false;
        render.drawErrorMessage('You died!', graph, global.screen);
        window.setTimeout(() => {
            document.getElementById('gameAreaWrapper').style.opacity = 0;
            document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });

    socket.on('kick', function (reason) {
        global.gameStart = false;
        global.kicked = true;
        if (reason !== '') {
            render.drawErrorMessage('You were kicked for: ' + reason, graph, global.screen);
        }
        else {
            render.drawErrorMessage('You were kicked!', graph, global.screen);
        }
        socket.close();
    });
}

const isUnnamedCell = (name) => name.length < 1;

const getPosition = (entity, player, screen) => {
    return {
        x: entity.x - player.x + screen.width / 2,
        y: entity.y - player.y + screen.height / 2
    }
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function adjustViewableArea() {

    //console.log(player);

    let maxCellSize = Math.max(...player.cells.map(cell => cell.radius * 2));

    if (maxCellSize > global.screen.width * 0.33 || maxCellSize > global.screen.height * 0.33) {
        // Log cell size for debugging
        console.log(`Player's cell is larger than 33% of the screen width: ${maxCellSize}px`);

        // Expand the viewable area to ensure all elements are visible
        let scalingFactor = 1.2;  // Increase the scaling factor for better visibility

        // Original screen size //
        if (!global.originalScreenWidth) {
            global.originalScreenWidth = global.screen.width;
            global.originalScreenHeight = global.screen.height;
        }

        global.screen.width *= scalingFactor;
        global.screen.height *= scalingFactor;

        global.scalingFactor = scalingFactor;

        // Update canvas size
        c.width = global.screen.width;
        c.height = global.screen.height;

        // Update player screen size
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;

        // Ensure the player remains centered
        player.x = Math.max(Math.min(player.x, global.game.width - global.screen.width / 2), global.screen.width / 2);
        player.y = Math.max(Math.min(player.y, global.game.height - global.screen.height / 2), global.screen.height / 2);

        // Emit the resized window dimensions to the server
        socket.emit('windowResized', { screenWidth: global.screen.width, screenHeight: global.screen.height });
    }

}

function gameLoop() {
    if (global.gameStart) {

        graph.clearRect(0, 0, global.screen.width, global.screen.height);
        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);
        graph.save();

        if (global.playerType == 'player') {
            adjustViewableArea();
        }
        //render.drawGrid(global, player, global.screen, graph);
        foods.forEach(food => {
            let position = getPosition(food, player, global.screen);
            render.drawFood(position, food, graph);
        });
        fireFood.forEach(fireFood => {
            let position = getPosition(fireFood, player, global.screen);
            render.drawFireFood(position, fireFood, playerConfig, graph);
        });
        viruses.forEach(virus => {
            let position = getPosition(virus, player, global.screen);
            render.drawVirus(position, virus, graph);
        });


        let borders = { // Position of the borders on the screen
            left: global.screen.width / 2 - player.x,
            right: global.screen.width / 2 + global.game.width - player.x,
            top: global.screen.height / 2 - player.y,
            bottom: global.screen.height / 2 + global.game.height - player.y
        }
        //if (global.borderDraw) {
        render.drawBorder(borders, graph);
        //}

        var cellsToDraw = [];
        for (var i = 0; i < users.length; i++) {
            let color = 'hsl(' + users[i].hue + ', 100%, 50%)';
            let borderColor = 'hsl(' + users[i].hue + ', 100%, 45%)';
            for (var j = 0; j < users[i].cells.length; j++) {
                console.log('reward', users[i].cells[j].reward);
                cellsToDraw.push({
                    color: color,
                    borderColor: borderColor,
                    mass: users[i].cells[j].mass,
                    reward: users[i].cells[j].reward,
                    name: users[i].name.toUpperCase(),
                    radius: users[i].cells[j].radius,
                    x: users[i].cells[j].x - player.x + global.screen.width / 2,
                    y: users[i].cells[j].y - player.y + global.screen.height / 2
                });
            }
        }
        cellsToDraw.sort(function (obj1, obj2) {
            return obj1.mass - obj2.mass;
        });
        render.drawCells(cellsToDraw, playerConfig, global.toggleMassState, borders, graph);
        // console.log('target',window.canvas.target);

        graph.restore();

        socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    // reset original screen size //
    global.originalScreenWidth = window.innerWidth;
    global.originalScreenHeight = window.innerHeight;


    global.screen.width = global.playerType == 'player' ? window.innerWidth : global.game.width;
    global.screen.height = global.playerType == 'player' ? window.innerHeight : global.game.height;

    player.screenWidth = c.width = global.screen.width;
    player.screenHeight = c.height = global.screen.height;

    if (global.playerType == 'spectator') {
        player.x = global.game.width / 2;
        player.y = global.game.height / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screen.width, screenHeight: global.screen.height });
}

