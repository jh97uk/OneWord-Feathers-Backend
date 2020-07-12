const Joi = require('@hapi/joi');

const validate = {
    word: Joi.object({
        text: Joi.string().min(1).max(100).required(),
        storyId: Joi.string().required(),
        userId: Joi.string().min(3).max(50).required(),
    }),
    
    session: Joi.object({
        id: Joi.any().disallow(Joi.any()),
        storyTitle: Joi.string().min(2).max(120).alphanum().label('Story title'),
        sessionOwnerId: Joi.any().disallow(Joi.any()),
        linkOnly: Joi.bool().default(false).label("Link only"),
        playersInSessionIds: Joi.object().pattern(Joi.string(), Joi.alternatives().try(
            Joi.object({
                typing: Joi.bool()
            }).label("Player"), 
            Joi.any().valid(null).label("Player")))
    })
}

module.exports = validate;
