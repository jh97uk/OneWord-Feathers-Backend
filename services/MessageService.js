const Schema = require('../schema');

class MessageService{
    constructor(app){
        this.messages = {};
        this.app = app;
    }

    initValidators(){
        this.app.service('messages').hooks({
            before:{
                get:[
                    context=>{
                        if(!this.app.services.sessions.games[context.id]){
                            throw new NotFound("This story doesn't exist!")
                        }
                        var playerId = this.app.services.users.connectionsUserIds[context.params.connectionID];
                        if(this.app.services.sessions.games[context.id].playersInSessionIds[playerId] === undefined){
                            throw new Error("You're not in this story!");
                        }
                    }
                ],
                create:[
                    context => {
                        var validation = Schema.word.validate(context.data);
                        if(validation.error){
                            throw new Error(validation.error.message)
                        }
        
                        if(!this.app.services.sessions.games[context.data.storyId]){
                            throw new NotFound("This game doesn't exist!")
                        } else if(!context.data.userId in this.app.services.sessions.games[context.data.storyId].playersInSessionIds){
                            throw new NotFound("User not found in game");
                        }
                    }
                ]
            }
        })
    }

    async find(){
        return this.messages;
    }

    async get(id, context){
        var messages = this.messages[id]
        if(!messages){
            messages = [];
        } 
        return Promise.resolve(messages)
    }

    async create(data, context){
        const message = {
            id: this.messages.length,
            text: data.text.split(' ')[0],
            storyId:data.storyId,
            authorId:data.userId
        };
        if(!this.messages[data.storyId]){
            this.messages[data.storyId] = [message];
        } else{
            this.messages[data.storyId].push(message);
        }
        return Promise.resolve(message);
    }    
}

module.exports = {
    MessageService: MessageService
};