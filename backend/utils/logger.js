const SimpleNodeLogger = require('simple-node-logger')


const defaultLogger = (string) => {

    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/default.log' : 'logfiles/development/default.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}

const mlTrainLogger = (string) => {

    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/mlTraining.log' : 'logfiles/development/mlTraining.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}

const spotLogger = (string) => {

    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/spotLogger.log' : 'logfiles/development/spotLogger.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}

const databaseLogger = (string) => {

    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/databaseLogger.log' : 'logfiles/development/databaseLogger.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}

const mlPredictionLogger = (string) => {
    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/mlPrediction.log' : 'logfiles/development/mlPrediction.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}

const mlDeleteLogger = (string) => {
    const opts = {
        logFilePath: process.env.NODE_ENV === 'pro' ? 'logfiles/production/mlDelete.log' : 'logfiles/development/mlDetele.log',
        timestampFormat:'DD-MM-YYYY HH:mm:ss.SSS'
    }
    const log = SimpleNodeLogger.createSimpleLogger(opts)
    log.setLevel('info')
    log.info(string)
}



module.exports = { mlTrainLogger, mlPredictionLogger, mlDeleteLogger, defaultLogger, spotLogger, databaseLogger }