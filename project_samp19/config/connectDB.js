const Sequelize = require('sequelize');


let dbConfig = {
    db_name: 'demo_semi',
    db_user: 'root',
    db_pass: 'root',
    con_type: 'mysql',
    port: '3306',
    host: 'localhost'
}

const sequelize = new Sequelize(dbConfig.db_name, dbConfig.db_user, dbConfig.db_pass,{
    host:dbConfig.host,
    dialect: dbConfig.con_type,
    port: dbConfig.port
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully!');
    } catch (error) {
        console.error('Unable to connect to the database:',error);
    }
};

module.exports = {sequelize, connectDB};