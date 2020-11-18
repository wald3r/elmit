const SimpleNodeLogger = require('simple-node-logger')


const defaultLogger = (string) => {

    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        fileNamePattern: 'default-<DATE>.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}

const mlTrainLogger = (string) => {

    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'mlTraining-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}


const billingLogger = (string) => {

    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'billing-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}

const spotLogger = (string) => {

    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'spotLogger-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}

const databaseLogger = (string) => {

    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'databaseLogger-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}

const mlPredictionLogger = (string) => {
    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'mlPrediction-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}

const mlDeleteLogger = (string) => {
    const opts = {
        logDirectory: process.env.NODE_ENV === 'prod' ? 'logfiles/production' : 'logfiles/development',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS',
        fileNamePattern: 'mlDelete-<DATE>.log',
    }
    const log = SimpleNodeLogger.createRollingFileLogger( opts )
    log.setLevel('info')
    log.info(string)
}



module.exports = { billingLogger, mlTrainLogger, mlPredictionLogger, mlDeleteLogger, defaultLogger, spotLogger, databaseLogger }