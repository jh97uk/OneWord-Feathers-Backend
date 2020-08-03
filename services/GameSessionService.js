const {nanoid} = require('nanoid');
const _ = require('lodash');
const Schema = require('../schema');

class GameSessionService{
    constructor(app){
        this.games = {};
        this.publicGameIds = [];
        this.events = ['joined', 'left']
        this.app = app;
    }

    initValidators(){
        this.app.service('sessions').hooks({
            before:{
                find:[
                    context=>{
                        if(this.app.services.sessions.publicGameIds.length < 1){
                            throw new NotFound("There's no public games available at this time.");
                        }
                    }
                ],
                get:[
                    context=>{
                        if(!this.app.services.sessions.games[context.id]){
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
                        var validation = Schema.session.validate(context.data);
                        if(validation.error){
                            throw new Error(validation.error.message)
                        }
                        const playerId = Object.keys(context.data.playersInSessionIds)[0];
                        if(this.app.services.sessions.games[context.id].playersInSessionIds[playerId] === undefined && context.data.playersInSessionIds[playerId] != null && Object.keys(this.app.services.sessions.games[context.id].playersInSessionIds).length >=4){
                            throw new Error("There are too many players in this lobby!");
                        } else if(this.app.services.sessions.games[context.id].playersInSessionIds[playerId] === undefined && context.data.playersInSessionIds[playerId] === null){
                            throw new Error("You weren't in this lobby to begin with!");
                        }
                        if(this.app.services.users.users[playerId] != null){
                            if(context.params.connectionID != undefined){
                                if(this.app.services.users.users[playerId].socketID != context.params.connectionID){
                                    throw new Error("You are not that user!");
                                }
                            }
                        }
                    }
                ]
            }
        })
    }

    isSessionEmpty(session){
        var players = Object.keys(session.playersInSessionIds);        
        var isEmpty = true;
        var player;
        for(player in players){
            if(session.playersInSessionIds[players[player]]){
                isEmpty = false;
            }
        }
        return isEmpty;
    }

    async find(){  
        return {id:this.publicGameIds[Math.floor(Math.random()*this.publicGameIds.length)]};
    }

    async get(id, context){        
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

        if(!data.linkOnly){
            this.publicGameIds.push(game.id);
        }

        if(context.connection != null){
            this.app.channel(game.id).join(context.connection);
        }

        return Promise.resolve(game);
    }

    async patch(id, data, params){
        const self = this;
        
        if(data.playersInSessionIds){
            Object.keys(data.playersInSessionIds).forEach(function(key, object){
                if(data.playersInSessionIds[key] == null){
                    self.app.channel(id).leave(params.connection);
                    self.emit('left', {id:id, leftPlayerName:self.app.services.users.users[key].name, leftPlayerId:key});
                    delete self.games[id].playersInSessionIds[key]
                    delete data.playersInSessionIds[key]
                } else if(!self.games[id].playersInSessionIds[key]){
                    self.emit('joined', {id:id, newPlayer:self.app.services.users.users[key].name, userId:key});
                    if(params.connection != null){
                        self.app.channel(id).join(params.connection);
                        self.app.services.users.users[key].currentGame = id;
                    }
                } 
            });
        }
    
        this.games[id] = _.merge(this.games[id], data)

        if(this.isSessionEmpty(this.games[id])){
            if(this.publicGameIds.indexOf(id) != undefined){
                this.publicGameIds.splice(this.publicGameIds.indexOf(id), 1)
            }
            delete this.games[id];
            delete this.app.services.messages.messages[id];
            return Promise.resolve({});
        }

        if(this.app.services.sessions.games[id].linkOnly == false && Object.keys(this.app.services.sessions.games[id].playersInSessionIds).length == 4)
            this.app.services.sessions.publicGameIds.splice(this.app.services.sessions.publicGameIds.indexOf(id), 1);
        return Promise.resolve(this.games[id]);
    }
}

module.exports = {
    GameSessionService: GameSessionService
}
