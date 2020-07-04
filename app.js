const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const {nanoid} = require('nanoid');
const _ = require('lodash');

const app = express(feathers());

class MessageService{
    constructor(){
        this.messages = [];
    }

    async find(){
        return this.messages;
    }

    async create(data, context){
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
        this.events = ['joined']
    }

    async find(){
        return this.games;
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

        if(context.connection != null){
            app.channel(game.id).join(context.connection);
        }

        return Promise.resolve(game);
    }

    async update(id, data, params){
        console.log(data);
        this.games[id.game].playersInSessionIds[id.player] = data;
    
        console.log("what the fucking fucker.")
        if(params.connection != null){
            app.channel(id.game).join(params.connection);
        }
        return Promise.resolve(this.games[id.game]);
    }
    async patch(id, data, params){
        const self = this;
        Object.keys(data.playersInSessionIds).forEach(function(key, object){
            if(data.playersInSessionIds[key] == null){
                console.log("leave");
                app.channel(id).leave(params.connection);
            } else if(!self.games[id].playersInSessionIds[key]){
                console.log("rest");
                self.emit('joined', {id:id, newPlayer:key});
                if(params.connection != null){
                    app.channel(id).join(params.connection);
                }
                return;
            } 
        });

        this.games[id] = _.merge(this.games[id], data)
    
        return Promise.resolve(this.games[id]);
    }
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname));
app.configure(express.rest());
app.configure(socketio());

app.use('/messages', new MessageService());
app.use('/sessions', new GameSessionService());

app.use(express.errorHandler());
app.on('connection', function(connection){
});

app.listen(3030).on('listening', ()=>console.log('Feathers listening'));

app.service('messages').create({text:'trest'})
app.service('sessions').create({id:nanoid(10), storyName:'Theresas rampage', sessionOwnerId:'asdjoqwij', linkOnly:true, playersInSessionIds:[this.sessionOwnerId]});

app.service('messages').publish('created', function(data, context)
{
    return app.channel(data.storyId).send(data);
});

app.service('sessions').publish('created', function(data, context){
    return app.channel(data.id).send(data);
});

app.service('sessions').publish('patched', function(data, context){
    return app.channel(data.id).send(data);
})

app.service('sessions').publish('joined', function(data, context){
    console.log("test");
    return app.channel(data.id).send(data)
});
