const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const app = express(feathers());

const GameSessionService = require('./services/GameSessionService').GameSessionService;
const MessageService = require('./services/MessageService').MessageService;
const UserService = require('./services/UserService').UserService;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname));

app.configure(express.rest());
app.configure(socketio(io => {
    io.use((socket, next)=>{
        socket.feathers.connectionID = socket.client.id;
        next();
    })
}));
app.configure(function(){
    app.use(function(req, res, next){
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        next();
    });
})

app.use('/messages', new MessageService(app));
app.services.messages.initValidators();
app.services.messages.initEventPublishers();

app.use('/sessions', new GameSessionService(app));
app.services.sessions.initValidators();
app.services.sessions.initEventPublishers();

app.use('/users', new UserService(app));
app.services.users.initValidators();
app.services.users.initEventPublishers();

app.use(express.errorHandler());

app.listen(3030).on('listening', ()=>console.log('OneWord Backend listening'));

app.on('disconnect', function(connection){
    const disconnectedUserId = app.services.users.connectionsUserIds[connection.connectionID];
    const disconnectedUser = app.services.users.users[disconnectedUserId];
    if(disconnectedUser == undefined){
        return;
    } else if(disconnectedUser.currentGame == null){
        delete app.services.users.users[disconnectedUserId];
        delete app.services.users.connectionsUserIds[connection.connectionID];
        return;
    }
    const playersInSessionIds = {}
    playersInSessionIds[disconnectedUserId] = null;
    app.service('sessions').patch(disconnectedUser.currentGame, {playersInSessionIds:playersInSessionIds}).then(function(){
        delete app.services.users.users[disconnectedUserId];
        delete app.services.users.connectionsUserIds[connection.connectionID];
    })
});

exports.app = app;