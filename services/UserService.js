const {nanoid} = require('nanoid');
const Schema = require('../schema');

class UserService{
    constructor(app){
        this.users = {}
        this.connectionsUserIds = {};
        this.app = app
    }

    initValidators(){
        this.app.service('users').hooks({
            before:{
                create:[
                    context => {
                        var validation = Schema.user.validate(context.data);
                        if(validation.error)
                            throw new Error(validation.error.message);
                    }
                ]
            }
        })
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
        this.app.channel(context.connectionID).join(context.connection);
        this.users[playerId] = {...user, ...{socketID:context.connectionID}};
        this.connectionsUserIds[context.connectionID] = playerId;
        return Promise.resolve({...user, ...{id:playerId}});
    }
}

module.exports = {
    UserService:UserService
};