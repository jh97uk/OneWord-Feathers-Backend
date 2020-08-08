const Schema = require('../schema');
const Tables = require('../Database.js').Tables;
const {Op} = require('sequelize');

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
                        const session = this.app.services.sessions.games[context.id]
                        if(!session){
                            throw new NotFound("This story doesn't exist!")
                        }
                        const playerId = this.app.services.users.connectionsUserIds[context.params.connectionID];
                        if(session.playersInSessionIds[playerId] === undefined){
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
                        const session = this.app.services.sessions.games[context.data.storyId];
                        if(!session){
                            throw new NotFound("This game doesn't exist!")
                        } else if(!context.data.userId in session.playersInSessionIds){
                            throw new NotFound("User not found in game");
                        }
                    }
                ]
            }
        })
    }

    initEventPublishers(){
        const self = this;
        this.app.service('messages').publish('created', function(data, context){
            return self.app.channel(data.storyId).send(data);
        });
    }

    async find(){
        return this.messages;
    }

    async get(id, context){
        var messages = []
        await Tables.Words.findAll({
            where: {
                storyId:{
                    [Op.eq]:id
                }
            },
            raw:true
        }).then(function(successData){
            messages = successData;
        })
        if(!messages){
            messages = [];
        } 
        return Promise.resolve(messages)
    }

    async deleteWordsForStory(id){
        delete this.messages[id];
        await Tables.Words.destroy({
            where:{
                storyId:id
            }
        });
    }

    async create(data, context){
        const message = {
            id: this.messages.length,
            text: data.text.split(' ')[0],
            storyId:data.storyId,
            authorId:data.userId,
            playerColorIndex:this.app.services.sessions.getPlayerColorIndex(data.storyId, data.userId)
        };
        if(!this.messages[data.storyId]){
            this.messages[data.storyId] = [message];
        } else{
            this.messages[data.storyId].push(message);
        }
        const word = await Tables.Words.create({
            text:message.text,
            storyId: message.storyId,
            authorId: message.authorId,
            playerColorIndex: message.playerColorIndex
        });
        return Promise.resolve(message);
    }    
}

module.exports = {
    MessageService: MessageService
};