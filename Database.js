const {Sequelize} = require('sequelize');

const sequelize = new Sequelize('postgres://oneword:oneword@localhost:54321/oneword');

const Tables = {
    Words:sequelize.define('Words', {
        id:{
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        text:{
            type: Sequelize.STRING(100),
            allowNull: false,
        },
        storyId:{
            type: Sequelize.STRING(50),
            allowNull:false
        },
        authorId:{
            type: Sequelize.STRING(50),
            allowNull:false
        },
        playerColorIndex:{
            type: Sequelize.INTEGER,
            allowNull:false
        }
    }, {
        freezeTableName:true
    })
}
Tables.Words.sync({force:true}).then(function(){
    console.log("thank god.");
});
console.log(sequelize.models);

module.exports = {
    Tables: Tables
}