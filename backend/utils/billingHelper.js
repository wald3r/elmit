const parameters = require('../parameters')
const {spawn} = require('child_process')
const { google } = require('googleapis')
const fs = require('fs')
const csv = require('csv-parse')
const databaseHelper = require('./databaseHelper')

const getCosts = async (instance, product, zone, start, rowid, startZone, startProvider) => {
  
  const python = spawn('python3', [parameters.billingFile, instance, product, zone, start, rowid, startZone, startProvider])
  console.log(`BillingHelper: Start calculating costs of ${instance} ${product} ${zone} ${start} ${startZone} ${startProvider}`)

  
  python.on('close', async () => {
    console.log(`BillingHelper: Finished calculating costs of ${instance} ${product} ${zone} ${start} ${startProvider}`)
  })


}

const authorize = async () => {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  return await auth.getClient()
}


const loadFile = async () => {
  const path = `${parameters.workDir}/${parameters.engine_regions}`

  let results = []

  await new Promise((resolve) => {

    fs.createReadStream(path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
         
      resolve(results)
    }) 
  })
  
  return results
}

const getEngineData = async (machineName) => {

  const cloudbilling = google.cloudbilling('v1')

  const authClient = await authorize()

  const request = {
    parent:'services/6F81-5844-456A',
    auth: authClient,
  }

  let cpus = []
  let rams = []
  const name = parameters.engineMachineTypes.filter(engine => engine === machineName)[0]
    
  let response
  do {
    if (response && response.nextPageToken) {
      request.pageToken = response.nextPageToken
    }
    response = (await cloudbilling.services.skus.list(request)).data
    const skusPage = response.skus
    if (skusPage) {
      skusPage.map(item => {
          const description = item.description.split(' ')
        const filteredValue = description.filter(v => v === name)
        if(filteredValue.length > 0){
          if(item.category.usageType === 'Preemptible' && item.category.resourceGroup === 'RAM'){
            rams = rams.concat(item)
          }
          if(item.category.usageType === 'Preemptible' && item.category.resourceGroup === 'CPU'){
            cpus = cpus.concat(item)
          }
        }
        
      })
    }
  } while (response.nextPageToken)
  

  return {cpus, rams}
  
}

const calcStartZoneEnginePrice = async (machineName, cores, memory, startZone, rowid) => {
  const data = await getEngineData(machineName)

  const cpus = data.cpus
  const rams = data.rams

  regions = await loadFile()
  let totalPrice = 0
  const region = regions.filter(region => region[0] === startZone.slice(0, -2))[0]
  const cpu = cpus.filter(c => c.serviceRegions[0] === region[0])
  const ram = rams.filter(r => r.serviceRegions[0] === region[0])
  if(cpu.length !== 0 && ram.length !== 0){
    const cpuPrice = cpu[0].pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos
    const ramPrice = ram[0].pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos
    totalPrice = (((cpuPrice * cores) + (ramPrice * memory)) / 1000000000) * 24
  }

  
  await databaseHelper.updateById(parameters.billingTableName, 'costNoMigration = ?, updatedAt = ?', [Number((totalPrice).toFixed(4)), Date.now(), rowid])

}



const getEnginePrice = async (machineName, cores, memory) => {

  
  const data = await getEngineData(machineName)

  const cpus = data.cpus
  const rams = data.rams

  regions = await loadFile()

  let min = 1000000000
  let chosenRegion = null
  let totalPrice = 0
  regions.map(region => {
    const cpu = cpus.filter(c => c.serviceRegions[0] === region[0])
    const ram = rams.filter(r => r.serviceRegions[0] === region[0])
    if(cpu.length !== 0 && ram.length !== 0){
      const cpuPrice = cpu[0].pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos
      const ramPrice = ram[0].pricingInfo[0].pricingExpression.tieredRates[0].unitPrice.nanos
      totalPrice = (((cpuPrice * cores) + (ramPrice * memory)) / 1000000000) * 24

      if(totalPrice !== 0){
        if(totalPrice < min){
          min = totalPrice
          chosenRegion = region
        }
      }
    }
    
  })
  return {cost: Number((min).toFixed(4)), region: chosenRegion}
}


module.exports = { getCosts, getEnginePrice, calcStartZoneEnginePrice }






