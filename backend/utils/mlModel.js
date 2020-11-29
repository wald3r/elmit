const {spawn} = require('child_process')
const parameters = require('../parameters')
const databaseHelper = require('../utils/databaseHelper')
const fs = require('fs')
const csv = require('csv-parse')
const computeEngine = require('./computeEngine')
const billingHelper = require('./billingHelper')
const logger = require('./logger')

const replace_name = (name) => {

    if(name === 'Linux/UNIX')
        return 'Linux-Unix'

    else if(name === 'Red Hat Enterprise Linux')
        return 'RedHat'

    else if(name === 'SUSE Linux')
        return 'Linux-Suse'

    else
      return name

}


const trainModel = async (instance, product, region) => {

  const python = spawn('python3', [parameters.mlTrainFile, instance, product, region, 2])
  logger.mlTrainLogger(`Start training ml model ${instance} ${product}`)
  
  python.stdout.on('data', (data) => {
    logger.mlTrainLogger(data.toString())
  })

  python.on('close', async () => {
    logger.mlTrainLogger(`Finished training model ${instance} ${product}`)
    let outcome = await databaseHelper.selectRowsByValues(parameters.modelTableValues, parameters.modelTableName, 'type = ? AND product = ? AND region = ?', [instance, product, region])  
    await databaseHelper.updateById(parameters.modelTableName, 'status = ?, updatedAt = ?', ['trained', Date.now(), outcome[0].rowid])
  })
}

const deletePredictions = (image) => {

  if (fs.existsSync(image.predictionFile)) {
    fs.unlinkSync(image.predictionFile)
  }
  
}

const deleteModel = (instance, product, region) => {

  const python = spawn('python3', [parameters.mlDeleteFile, instance, product, region])
  
  logger.mlDeleteLogger(`Delete training ml model ${instance} ${product}`)

  python.stdout.on('data', (data) => {
    logger.mlDeleteLogger(data.toString())
    const fileToDelete = `${parameters.mlPredictions}${instance}_${replace_name(product)}.csv`
    if (fs.existsSync(fileToDelete)) {
      fs.unlinkSync(fileToDelete)
    }
  })
}

function sortFunction(a, b) {

      return (Number(a[0]) >= Number(b[0])) ? 1 : -1
}




const predictModel = async (instance, product, image, user, region, engineCost) => {
  const python = spawn('python3', [parameters.mlPredictFile, instance, product, image.rowid, region, 2])
  logger.mlPredictionLogger(`Started prediction of ml model ${instance} ${product}`)

  
  python.stdout.on('data', async(data) => {
    logger.mlPredictionLogger(data.toString())
  })

  return await new Promise((resolve) => {
    python.stdout.on('close', async () => {

      const path = `${parameters.workDir}/predictions/${instance}_${replace_name(product)}_${image.rowid}.csv`
      let list = []

      await fs.createReadStream(path)
        .pipe(csv())
        .on('data', (data) => list.push(data))
        .on('end', async () => {
          const last_column = list[1].length -1
          const second_last_column = list[1].length -2
          let results = []
          for(let o = 1; o < list.length; o++){
            if(Number(list[o][second_last_column]) > 0 && Number(list[o][second_last_column]) != null && Number(list[o][second_last_column]) != "" && Number(list[o][second_last_column]) != undefined) 
              results.push([list[o][second_last_column], list[o][last_column]])
          }
          logger.defaultLogger(results)
          results = results.sort(sortFunction)
          let zone = results[0][1]
          const cost = results[0][0]

          let returnValue = null
          let billingId = null
          if(Number(cost) <= engineCost.cost || engineCost.cost === 0 || engineCost.cost === null){
            let key = `${image.path}/${parameters.keyName}_${image.rowid}.pem`
            billingId = await databaseHelper.insertRow(parameters.billingTableName, '(null, ?, ?, ?, ?, ?, ?, ?)', [null, results[0][0], null, image.rowid, user.rowid, Date.now(), Date.now()])
            await databaseHelper.updateById(parameters.imageTableName, 'predictionFile = ?, zone = ?, updatedAt = ?, key = ?', [path, zone, Date.now(), key, image.rowid])
            returnValue = {zone, provider: 'AWS'}
          }else{
            const region = String(engineCost.region[0])
            zone = await computeEngine.getZone(region)
            billingId = await databaseHelper.insertRow(parameters.billingTableName, '(null, ?, ?, ?, ?, ?, ?, ?)', [null, engineCost.cost, engineCost.cost, image.rowid, user.rowid, Date.now(), Date.now()])
            await databaseHelper.updateById(parameters.imageTableName, 'key = ?, predictionFile = ?, zone = ?, updatedAt = ?', [parameters.sshEngineSSHFile, path, zone, Date.now(), image.rowid])
            returnValue = { zone, provider: 'Google'}
          }

          let startProvider = null
          const migrationRows = await databaseHelper.selectByValue(parameters.migrationTableValues, parameters.migrationTableName, 'imageId', [image.rowid])
      
          if(migrationRows.length !== 0){
            startProvider = migrationRows[0].startProvider
          }
        
          if(startProvider === 'Google'){
            await billingHelper.calcStartZoneEnginePrice(migrationRows[0].engineStartMachine, migrationRows[0].engineStartCores, migrationRows[0].engineStartMemory, migrationRows[0].startZone, billingId)
          }else if (returnValue.provider === 'Google' && migrationRows.length === 0){
            await databaseHelper.updateById(parameters.billingTableName, 'costNoMigration = ?', [engineCost.cost, billingId])
          }
          resolve(returnValue)
        })
      })
  })
}


module.exports = { deletePredictions, trainModel, deleteModel, predictModel }