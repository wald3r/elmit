const {spawn} = require('child_process')
const parameters = require('../parameters')
const logger = require('./logger')

const collectSpotPrices = async () => {

  const python = spawn('python3', [parameters.collectSpotPricesFile])
  logger.defaultLogger(`Start collecting spot prices`)

  python.stdout.on('data', (data) => {
    logger.defaultLogger(data.toString())
    
  })
   
  python.stdout.on('close', async () => {
    logger.defaultLogger(`Finished collecting spot prices`)
  })
}

const collectSpecificSpotPrices = async (instance) => {

  const python = spawn('python3', [parameters.collectSpotPricesFile, instance])
  logger.defaultLogger(`Start collecting spot prices`)

  python.stdout.on('data', (data) => {
    logger.defaultLogger(data.toString())
    
  })
  await new Promise((resolve) => {
    python.stdout.on('close', async () => {
      logger.defaultLogger(`Finished collecting spot prices`)
      resolve()
    })
  })
  
}





module.exports = { collectSpotPrices, collectSpecificSpotPrices }
