const Joi = require('@hapi/joi');

const validate = {
    word: Joi.object({
        text: Joi.string().min(1).max(100).required().label('Word'),
        storyId: Joi.string().min(3).max(50).required().label('Story ID'),
        userId: Joi.string().min(3).max(50).required().label('Session owner ID'),
    }),
    
    session: Joi.object({
        id: Joi.string().min(3).max(50).label('Story ID'),
        storyTitle: Joi.string().min(2).max(120).label('Story title'),
        sessionOwnerId: Joi.string().min(3).max(50).label('Session owner ID'),
        linkOnly: Joi.bool().default(false).label("Link only status"),
        playersInSessionIds: Joi.object().pattern(Joi.string(), Joi.alternatives().try(
            Joi.object({
                typing: Joi.bool()
            }).label("Player").max(1), 
            Joi.any().valid(null).label("Player"))).label('Players in session').max(1)
    }),
    user: Joi.object({
        name: Joi.string().min(2).max(25).label("Name").required()
    })
}

module.exports = validate;
