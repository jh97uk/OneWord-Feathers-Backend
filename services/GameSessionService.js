const {nanoid} = require('nanoid');
const _ = require('lodash');
const Schema = require('../schema');

class GameSessionService{
    constructor(app){
        this.games = {};
        this.publicGameIds = [];
        this.events = ['joined', 'left']
        this.app = app;

        this.colorIds = [1, 2, 3, 4];
    }

    initValidators(){
        this.app.service('sessions').hooks({
            before:{
                find:[
                    context=>{
                        if(this.app.services.sessions.publicGameIds.length < 1){
                            throw new Error("There's no public games available at this time.");
                        }
                    }
                ],
                get:[
                    context=>{
                        if(!this.app.services.sessions.games[context.id]){
                            throw new Error("This story doesn't exist!")
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
                        const session = this.app.services.sessions.games[context.id];
                        const patchData = context.data;
                        if(session.playersInSessionIds[playerId] === undefined && patchData.playersInSessionIds[playerId] != null && Object.keys(session.playersInSessionIds).length >=4){
                            throw new Error("There are too many players in this lobby!");
                        } else if(session.playersInSessionIds[playerId] === undefined && patchData.playersInSessionIds[playerId] === null){
                            throw new Error("You weren't in this lobby to begin with!");
                        }
                        const player = this.app.services.users.users[playerId]
                        if(player != null){
                            const connectionId = context.params.connectionID;
                            if(connectionId != undefined){
                                if(player.socketID != connectionId){
                                    throw new Error("You are not that user!");
                                }
                            }
                        }
                    }
                ]
            }
        })
    }

    initEventPublishers(){
        const self = this;
        this.app.service('sessions').publish('created', function(data, context){
            return self.app.channel(data.id).send(data);
        });
        
        this.app.service('sessions').publish('patched', function(data, context){
            return self.app.channel(data.id).send(data);
        })
        
        this.app.service('sessions').publish('joined', function(data, context){
            return self.app.channel(data.id).send(data)
        });
        
        this.app.service('sessions').publish('left', function(data, context){
            return self.app.channel(data.id).send(data);
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

    getPlayerColorIndex(gameId, playerId){
        return this.games[gameId].playersInSessionIds[playerId].colorId;
    }

    async create(data, context){
        this.playersInSessionIds = {};
        this.availablePlayerColors = [0, 1, 2, 3];
        const game = {
            id:nanoid(10),
            name:data.storyTitle,
            sessionOwnerId:this.playersInSessionIds[0],
            linkOnly:data.linkOnly,
            availablePlayerColors:this.availablePlayerColors,
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

    deleteSession(id){
        if(this.publicGameIds.indexOf(id) != undefined){
            this.publicGameIds.splice(this.publicGameIds.indexOf(id), 1)
        }
        delete this.games[id];
        this.app.services.messages.deleteWordsForStory(id);
    }

    retrieveNextAvailablePlayerColor(sessionId){
        const session = this.games[sessionId];
        const colorId = session.availablePlayerColors[0]; 
        session.availablePlayerColors.splice(0, 1);
        return colorId;
    }

    restorePlayerColor(sessionId, playerId){
        const session = this.games[sessionId];
        const colorId = session.playersInSessionIds[playerId].colorId;
        session.availablePlayerColors.unshift(colorId);
    }

    leavePlayer(sessionId, playerId, connection, patchData){
        this.app.channel(sessionId).leave(connection);
        this.restorePlayerColor(sessionId, playerId);
        this.emit('left', {id:sessionId, leftPlayerName:this.app.services.users.users[playerId].name, leftPlayerId:playerId});
        delete this.games[sessionId].playersInSessionIds[playerId]
        delete patchData.playersInSessionIds[playerId]
    }

    joinPlayer(sessionId, playerId, connection, patchData){
        const users = this.app.services.users;
        this.emit('joined', {id:sessionId, newPlayer:users.users[playerId].name, userId:playerId});
        patchData.playersInSessionIds[playerId]['colorId'] = this.retrieveNextAvailablePlayerColor(sessionId);
        if(connection != null){
            this.app.channel(sessionId).join(connection);
            this.app.services.users.setUserCurrentGame(playerId, sessionId);
        }
    }

    async patch(sessionId, data, params){
        const self = this;
        
        if(data.playersInSessionIds){
            Object.keys(data.playersInSessionIds).forEach(function(playerId, object){
                if(data.playersInSessionIds[playerId] == null){
                    self.leavePlayer(sessionId, playerId, params.connection, data);
                } else if(!self.games[sessionId].playersInSessionIds[playerId]){
                    self.joinPlayer(sessionId, playerId, params.connection, data);
                } 
            });
        }
    
        this.games[sessionId] = _.merge(this.games[sessionId], data)

        if(this.isSessionEmpty(this.games[sessionId])){
            this.deleteSession(sessionId);
            return Promise.resolve({});
        }

        if(this.games[sessionId].linkOnly == false && Object.keys(this.games[sessionId].playersInSessionIds).length == 4)
            this.publicGameIds.splice(this.publicGameIds.indexOf(sessionId), 1);
        return Promise.resolve(this.games[sessionId]);
    }
}

module.exports = {
    GameSessionService: GameSessionService
}
