const mysql = require('mysql2');
const Transport = require('winston-transport');
const { sequelize } = require('./config/connectDB');

class MYSQLTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.connection = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'root',
            database: process.env.DB_NAME || 'demo_semi',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    log(info, callback) {
        setImmediate(() => this.emit('logged', info));

        const { level, message } = info;
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const sql = 'INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)';
        this.connection.query(sql, [level, message, timestamp], (err) => {
            if (err) console.error('MySQL Log Insert Error:', err);
            if (callback) callback();
        });
    }
}

module.exports = MYSQLTransport;
