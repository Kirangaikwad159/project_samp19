const { allow } = require('joi');
const {sequelize} = require('../config/connectDB');
const {DataTypes} = require('sequelize');


const userModel = sequelize.define(
    "user",
    {
        id:{
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        firstName:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastName:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        email:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        mobileNumber:{
            type: DataTypes.STRING,
            allowNull: false,
        },        
        password:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        profileImage:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        document:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        status:{
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
        role:{
            type: DataTypes.ENUM('admin', 'user'),
            allowNull: false,
            defaultValue: 'user'
        },
    },
    {
        timestamps: true,
    }
);

module.exports = userModel;