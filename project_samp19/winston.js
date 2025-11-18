const { createLogger, format, transports } = require('winston'); 
const MYSQLTransport = require('./mysqlTransport');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/app.log' }),
        new MYSQLTransport()
    ]
});

module.exports = logger;