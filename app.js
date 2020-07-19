const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const {NotFound, GeneralError, BadRequest} = require('@feathersjs/errors');
const {nanoid} = require('nanoid');
const _ = require('lodash');
const Joi = require('@hapi/joi');
const Schema = require('./schema');
const app = express(feathers());

class UserService{
    constructor(){
        this.users = {}
        this.connectionsUserIds = {};
    }

    async find(){
        return this.users;
    }
    async get(id, context){
    }
    async create(data, context){
        const playerId = nanoid(5) 
        const user = {
            name:data.name,
            currentGame:null
        }
        app.channel(context.connectionID).join(context.connection);
        this.users[playerId] = {...user, ...{socketID:context.connectionID}};
        this.connectionsUserIds[context.connectionID] = playerId;
        return Promise.resolve({...user, ...{id:playerId}});
    }
}

class MessageService{
    constructor(){
        this.messages = [];
    }

    async find(){
        return this.messages;
    }

    async create(data, context){
        if(!app.services.sessions.games[data.storyId]){
            return new NotFound("This game doesn't exist!")
        } else if(!data.userId in app.services.sessions.games[data.storyId].playersInSessionIds){
            return new NotFound("User not found in game");
        }

        const message = {
            id: this.messages.length,
            text: data.text.split(' ')[0],
            storyId:data.storyId,
            authorId:data.userId
        };
        this.messages.push(message);
        return Promise.resolve(message);
    }    
}

class GameSessionService{
    constructor(){
        this.games = {};
        this.events = ['joined', 'left']
    }

    async find(){
        return this.games;
    }

    async get(id, context){
        if(!this.games[id]){
            return new NotFound("This game doesn't exist!")
        }
        return Promise.resolve(this.games[id]);
    }

    async create(data, context){
        this.playersInSessionIds = {};

        const game = {
            id:nanoid(10),
            name:data.storyTitle,
            sessionOwnerId:this.playersInSessionIds[0],
            linkOnly:data.linkOnly,
            playersInSessionIds:this.playersInSessionIds
        }

        this.games[game.id] = game;

        if(context.connection != null){
            app.channel(game.id).join(context.connection);
        }

        return Promise.resolve(game);
    }

    async update(id, data, params){
        this.games[id.game].playersInSessionIds[id.player] = data;
    
        if(params.connection != null){
            app.channel(id.game).join(params.connection);key
    }
    async patch(id, data, params){
        const self = this;
        
        if(data.playersInSessionIds){
            Object.keys(data.playersInSessionIds).forEach(function(key, object){
                if(data.playersInSessionIds[key] == null){
                    app.channel(id).leave(params.connection);
                    self.emit('left', {id:id, leftPlayer:app.services.users.users[key].name});
                } else if(!self.games[id].playersInSessionIds[key]){
                    self.emit('joined', {id:id, newPlayer:app.services.users.users[key].name});
                    if(params.connection != null){
                        app.channel(id).join(params.connection);
                        app.services.users.users[key].currentGame = id
                    }
                    return Promise.resolve(this.games[id]);
                } 
            });
        }
        
        this.games[id] = _.merge(this.games[id], data)
    
        return Promise.resolve(this.games[id]);
    }
}

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

app.use('/messages', new MessageService());
app.use('/sessions', new GameSessionService());
app.use('/users', new UserService());

app.use(express.errorHandler());


app.listen(3030).on('listening', ()=>console.log('Feathers listening'));

app.service('users').publish('created', function(data, context){
    return app.channel(context.params.connectionID).send(data);
})

app.service('messages').publish('created', function(data, context){
    return app.channel(data.storyId).send(data);
});

app.service('sessions').publish('created', function(data, context){
    return app.channel(data.id).send(data);
});

app.service('sessions').publish('patched', function(data, context){
    return app.channel(data.id).send(data);
})

app.service('sessions').publish('joined', function(data, context){
    return app.channel(data.id).send(data)
});

app.service('sessions').publish('left', function(data, context){
    return app.channel(data.id).send(data);
})

app.service('messages').hooks({
    before:{
        create:[
            context => {
                var validation = Schema.word.validate(context.data);
                if(validation.error){
                    throw new Error(validation.error.message)
                }
            }
        ]
    }
})

app.service('sessions').hooks({
    before:{
        get:[
            context=>{
                if(!app.services.sessions.games[context.id]){
                    throw new NotFound("This story doesn't exist!")
                }
            }
        ],
        create:[
            context=>{
                var validation = Schema.session.with('storyTitle', 'linkOnly').validate(context.data);
                if(validation.error){
                    throw new Error(validation.error.message)
                }
            }
        ],
        patch:[
            context=>{
                console.log("patch!")
                var validation = Schema.session.validate(context.data);
                if(validation.error){
                    throw new Error(validation.error.message)
                }
                const playerId = Object.keys(context.data.playersInSessionIds)[0];
                if(app.services.users.users[playerId] != null){
                    console.log(context.params.connectionID);
                    if(context.params.connectionID != undefined){
                        if(app.services.users.users[playerId].socketID != context.params.connectionID){
                            throw new Error("You are not that user!");
                        }
                    }
                }
            }
        ]
    }
})

app.on('disconnect', function(connection){
    const disconnectedUserId = app.services.users.connectionsUserIds[connection.connectionID];
    const disconnectedUser = app.services.users.users[disconnectedUserId];
    if(disconnectedUser == undefined || disconnectedUser.currentGame == null)
        return;
    const playersInSessionIds = {}
    playersInSessionIds[disconnectedUserId] = null;
    app.service('sessions').patch(disconnectedUser.currentGame, {playersInSessionIds:playersInSessionIds}).then(function(){
        delete disconnectedUser;
        delete app.services.users.connectionsUserIds[connection.connectionID];
    })
});
