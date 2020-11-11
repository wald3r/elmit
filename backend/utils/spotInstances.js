const AWS = require('aws-sdk')
const parameters = require('../parameters')
const databaseHelper = require('./databaseHelper')
const fileHelper = require('./fileHelper')
const fs = require('fs')
const csv = require('csv-parse')
const logger = require('./logger')

let AWSRegion = 'us-east-1'

const setRegion = (zone) => {
  AWSRegion = zone.slice(0, -1)
}



const isSimulation = (number) => {
  if(number === 0)
    return false

  return true
}

const getEC2Object = async () => {

  await new Promise((resolve) => {
    AWS.config.getCredentials((err) => {
      if (err) {
        logger.spotLogger(`SpotInstanceHelper: ${err.message}`)
        resolve()
      }else {
        resolve()
      }
    })
  })

  AWS.config.update({region: AWSRegion})
  const ec2 = new AWS.EC2({apiVersion: '2016-11-15'})

  return ec2
}

const getInstanceInformation = async (instance) => {
  const path = `${parameters.workDir}/instances_metadata.csv`
  
  let results = []

  let result = await new Promise((resolve) => {
    fs.createReadStream(path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      resolve(results.filter(i => i[0] === instance)) 
    })
  })
 
  return result[0]
}

const describeImages = async (product, zone) => {

  let id = null
  let results = []

  await new Promise((resolve) => {
    fs.createReadStream(parameters.imageFile)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const imageRows = results.filter(row => {
        if(row[1] === product && row[0] === zone.slice(0, -1)){
          return row
        }
      })
      id = imageRows[0][2]
      resolve()
    })
  })
  
  return id

}

const stopInstance = async (id, zone) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  let promise = await new Promise((resolve) => {
    ec2.stopInstances({InstanceIds: [id]}, (err, data) => {
      if (err) {
        logger.spotLogger(`StopInstanceHelper: ${err.message}`)
        resolve(-1)
      }else {
        logger.spotLogger(`StopInstanceHelper: ${id} is stopping`)
        resolve(1)
      }
    })
  })
  if(promise === -1){
    throw new Error('Can not stop instance')
  }
}
const startInstance = async (id, zone) => {

  setRegion(zone)
  const ec2 = await getEC2Object()
  
  let promise = await new Promise((resolve) => {
    ec2.startInstances({InstanceIds: [id]}, (err, data) => {
      if (err) {
        logger.spotLogger(`StartInstanceHelper: ${err.message}`)
        resolve(-1)
      }else {
        logger.spotLogger(`StartInstanceHelper: ${id} is starting`)
        resolve(1)
      }
    })
  })

  if(promise === -1){
    throw new Error('Can not start instance')
  }
    
}


const describeSecurityGroups = async (id) => {
 
  const params = {
    Filters: [
      {
        Name: 'description',
        Values: [`${parameters.securityGroupDescription}_${id}`]
      }
    ],
    GroupNames: [
      `${parameters.securityGroupName}_${id}`
    ]
  }

  const ec2 = await getEC2Object()

 return await new Promise((resolve) => {
  ec2.describeSecurityGroups(params, (err, data) => {
    if (err) {
      logger.spotLogger(`DescribeSecurityGroupHelper: ${err.message}`)
      resolve(undefined)
    }else resolve(data)
  })
 })
}

const authorizeSecurityGroupIngress = async (securityGroupId, port) => {

  const ec2 = await getEC2Object()

  const paramsIngress = {
    GroupId: securityGroupId,
    IpPermissions:[
      {
        IpProtocol: "tcp",
        FromPort: port,
        ToPort: port,
        IpRanges: [{"CidrIp":"0.0.0.0/0"}]
      },
      {
        IpProtocol: "tcp",
        FromPort: 22,
        ToPort: 22,
        IpRanges: [{"CidrIp":"0.0.0.0/0"}]
      }
    ]
  }

  ec2.authorizeSecurityGroupIngress(paramsIngress, (err, data) => {
    if (err) {
      logger.spotLogger(`AuthorizeSecurityGroupIngressHelper: ${err.message}`)
    }
  })
}

const createSecurityGroup = async (zone, port, id) => {
  
  const ec2 = await getEC2Object()
  let vpc = null
  
  const securityGroup = await describeSecurityGroups(id)
  if(securityGroup === undefined){
    logger.spotLogger(`SecurityGroupHelper: Create security group for ${zone}`)
    return await new Promise((resolve) => {
      ec2.describeVpcs((err, data) => {
        if (err) {
          logger.spotLogger(`SecurityGroupHelper: ${err.message}`)
        }else {
          vpc = data.Vpcs[0].VpcId
          const paramsSecurityGroup = {
            Description: `${parameters.securityGroupDescription}_${id}`,
            GroupName: `${parameters.securityGroupName}_${id}`,
            VpcId: vpc
          }
          ec2.createSecurityGroup(paramsSecurityGroup, async (err, data) => {
            if (err) {
              logger.spotLogger(`SecurityGroupHelper: ${err.message}`)
            } else {
                const SecurityGroupId = data.GroupId
                await authorizeSecurityGroupIngress(SecurityGroupId, port)
                resolve(SecurityGroupId)
            }
          })
        }
      })
    })
  }
  else{
    logger.spotLogger(`SecurityGroupHelper: Security group for ${zone} already exists`)
    return securityGroup.SecurityGroups[0].GroupId
  }
}


const deleteSecurityGroup = async (zone, id) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  const params = {
    DryRun: false,
    GroupName: `${parameters.securityGroupName}_${id}`
  }

  ec2.deleteSecurityGroup(params, (err, data) => {
    if (err) logger.spotLogger(`DeleteSecurityGroupHelper: ${err.message}`)
    else     logger.spotLogger(`DeleteSecurityGroupHelper: Security group in ${zone} deleted`)
  })
}

const createKeyPair = async (path, rowid) => {
  
  const ec2 = await getEC2Object()


  const params = {
    KeyName: `${parameters.keyName}_${rowid}`
  }

  ec2.createKeyPair(params, (err, data) => {
    if (err) logger.spotLogger(`CreateKeyPairHelper: ${err.message}`)
    else {
      fileHelper.createKeyFile(data, path)         
    }
  })

}

const deleteKeyPair = async (zone, path, rowid) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  const params = {
    KeyName: `${parameters.keyName}_${rowid}`
  }
  return await new Promise(async (resolve) => {
    await ec2.deleteKeyPair(params, async (err) => {
      if (err) logger.spotLogger(`DeleteKeyPairHelper: ${err.message}`)
      else { 
        await fileHelper.deleteFile(path)
        resolve()
      }           
    })
  })
}


const getInstanceIds = async (id, rowid) => {
  
  const ec2 = await getEC2Object()

  var params = {
    SpotInstanceRequestIds: [id]
  }
  let instanceIds = []

  let counter = parameters.waitForInstanceId

  while(true){
    instanceIds = []

    await new Promise((resolve) => {
      ec2.describeSpotInstanceRequests(params, async (err, data) =>  {
      if (err) {
        logger.spotLogger(`SpotInstanceHelper: ${err.message}`)
        resolve(undefined)
      }else{
          data.SpotInstanceRequests.map(instance => {
            instanceIds = instanceIds.concat(instance.InstanceId)
          })
        resolve(instanceIds)
      }
      })
    })
    await new Promise((resolve) => {
      setTimeout(() => { 
        logger.spotLogger('SpotInstanceHelper: Waiting for instance id')
        resolve()
      }, 3000)
    })
    counter = counter - 1 
    if(instanceIds[0] !== undefined) break
    if(counter === 0) break
  }
  if(instanceIds[0] !== undefined){
    await databaseHelper.updateById(parameters.imageTableName, 'spotInstanceId = ?, updatedAt = ?', [instanceIds[0], Date.now(), rowid])
  }
  return instanceIds

}

const waitForInstanceToBoot = async (ids) => {

  const ec2 = await getEC2Object()

  let status = undefined

  while(status !== 'ok'){
    await new Promise((resolve) => {
      ec2.describeInstanceStatus({ InstanceIds: ids, IncludeAllInstances: true }, async (err, data) => {
        if (err) {
          logger.spotLogger(`SpotInstanceBootHelper: ${err.message}`)
          resolve(status) 
        }
        else {
          status = data.InstanceStatuses[0].InstanceStatus.Status
          resolve(status)
        }       
      })
    })
  }
}

const rebootInstance = async (zone, id) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  const params = {
    InstanceIds: [
       id
    ]
   }
   ec2.rebootInstances(params, (err, data) => {
     if (err) logger.spotLogger(`RebootInstanceHelper: ${err.message}`)
     else     logger.spotLogger(`RebootInstanceHelper: ${id} is rebooting`)
   })
}

const getInstanceStatus = async (zone, ids) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  return await new Promise((resolve) => {
    ec2.describeInstanceStatus({ InstanceIds: ids, IncludeAllInstances: true }, async (err, data) => {
      if (err) logger.spotLogger(`SpotInstanceHelper: ${err.message}`) 
      else {
        status = data.InstanceStatuses[0].InstanceStatus.Status
        resolve(status)
      }       
    })
  })
  
}

const getInstanceState = async (zone, ids) => {

  setRegion(zone)
  const ec2 = await getEC2Object()

  return await new Promise((resolve) => {
    ec2.describeInstanceStatus({ InstanceIds: ids, IncludeAllInstances: true }, async (err, data) => {
      if (err) logger.spotLogger(`SpotInstanceHelper: ${err.message}`) 
      else {
        status = data.InstanceStatuses[0].InstanceState.Name
        resolve(status)
      }       
    })
  })
  
}

const requestSpotInstance = async (instance, zone, product, bidprice, simulation, id, keyPath, port) => {

  setRegion(zone)
  const ec2 = await getEC2Object()
  let securityGroupId = null
  const imageId = await describeImages(product, zone)
  if(!isSimulation(simulation)){
    securityGroupId = await createSecurityGroup(zone, port, id)
    await createKeyPair(keyPath, id)
    logger.spotLogger(`ImageDescribeHelper: For ${zone} the following image was chosen: ${imageId}`) 
  } 
  
  let params = {
    InstanceCount: 1, 
    DryRun: isSimulation(simulation),
    InstanceInterruptionBehavior: 'stop',
    LaunchSpecification: {
     ImageId: imageId,//.Images[0].ImageId, 
     InstanceType: instance,
     KeyName: `elmit_${id}`, 
     Placement: {
      AvailabilityZone: zone
     }, 
     SecurityGroupIds: [
      securityGroupId
     ]
    }, 
    SpotPrice: `${bidprice}`,
    Type: 'persistent'
  }

  return await new Promise((resolve) => {
    ec2.requestSpotInstances(params, async (err, data) => {
      if (err) {
        logger.spotLogger(`SpotInstanceHelper: ${err.message}`)
        resolve(null)
      }
      else{
        let requestId = data.SpotInstanceRequests[0].SpotInstanceRequestId
        await databaseHelper.updateById(parameters.imageTableName, 'requestId = ?, updatedAt = ?', [requestId, Date.now(), id])
        resolve(requestId)
      }
    })
  })
}


const getPublicIpFromRequest = async (instanceIds, rowid) => {
  
  const ec2 = await getEC2Object()

  return await new Promise((resolve) => {
    ec2.describeInstances({ InstanceIds: instanceIds }, async (err, data) => {
      if (err) logger.spotLogger(`SpotInstanceHelper: ${err.message}`) 
      else {
        const ip = data.Reservations[0].Instances[0].PublicIpAddress
        await databaseHelper.updateById(parameters.imageTableName, 'ip = ?, updatedAt = ?', [ip, Date.now(), rowid])
        resolve(ip)
      }       
    })
  })
}


const cancelSpotInstance = async (image) => {

  const ec2 = await getEC2Object()
  
  ec2.terminateInstances({ InstanceIds: [image.spotInstanceId] }, (err, data) => {
    if (err) logger.spotLogger(`SpotInstanceHelper: ${err.message}`)
    else     logger.spotLogger(data)
  })

  ec2.cancelSpotInstanceRequests({ SpotInstanceRequestIds: [image.requestId] }, (err, data) => {
    if (err) logger.spotLogger(`SpotInstanceHelper: ${err.message}`)
    else     logger.spotLogger(data)         
        
  })
  
}



module.exports = { 
  describeImages,
  startInstance,
  stopInstance,
  rebootInstance, 
  deleteSecurityGroup, 
  deleteKeyPair, 
  getEC2Object, 
  getInstanceIds, 
  getInstanceStatus, 
  getInstanceState,
  requestSpotInstance, 
  cancelSpotInstance, 
  getPublicIpFromRequest, 
  waitForInstanceToBoot,
  getInstanceInformation
}