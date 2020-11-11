const NodeSSH = require("node-ssh");
const parameters = require('../parameters')
const logger = require('./logger')

ssh = new NodeSSH()


const setUpServer = async (ip, pathToKey, pathToDocker) => {

  const failed = []
  const successful = []   
  
  return await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    })
    .then(() => {
      ssh.putDirectory(pathToDocker, `/home/${parameters.ec2Username}/image`, {
        recursive: true,
        concurrency: 10,
        tick: (localPath, remotePath, error) => {
          if (error) {
            failed.push(localPath)
          } else {
            successful.push(localPath)
          }
        }
      }).then((status) => {
        logger.defaultLogger(`SSHConnectionHelper: The directory transfer to ${ip} was ${status ? 'successful' : 'unsuccessful'}`)
        logger.defaultLogger(`SSHConnectionHelper: failed transfers to ${ip}: ${failed.join(', ')}`)
        logger.defaultLogger(`SSHConnectionHelper: successful transfers to ${ip}: ${successful.join(', ')}`)
        resolve()
      })
      
      
    })
  })
  
}

const startDocker = async (ip, pathToKey) => {
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    })
    .then(() => {
      ssh.execCommand(`sudo service docker restart && cd /home/${parameters.ec2Username}/image/ && sudo docker-compose up -d && exit`).then((result) => {
        logger.defaultLogger(`STDOUT of ${ip}: ${result.stdout}`)
        logger.defaultLogger(`STDERR of ${ip}: ${result.stderr}`)
        resolve(1)
      })
    }).catch((exception) => {
      logger.defaultLogger(exception)
      resolve(-1)
    })
  })
  if(promise === -1){
    throw new Error('Can not start docker')
  }
}

const installSoftware = async (ip, pathToKey) => {

  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    }).then(() => {
      ssh.execCommand(`chmod +xr /home/${parameters.ec2Username}/image/install.sh && cd /home/${parameters.ec2Username}/image/ && ./install.sh && exit`).then((result) => {
        logger.defaultLogger(`STDOUT of ${ip}: ${result.stdout}`)
        logger.defaultLogger(`STDERR of ${ip}: ${result.stderr}`)
        resolve(1)
      }).catch((error) => {
        logger.defaultLogger(error)
        resolve(-1)
      })
    })
  })
  if(promise === -1){
    throw new Error('Can not install software')
  }
}

const endDocker = async (ip, pathToKey) => {
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    })
    .then(() => {
      ssh.execCommand(`cd /home/${parameters.ec2Username}/image && sudo docker-compose down && exit`).then((result) => {
        logger.defaultLogger(`STDOUT of ${ip}: ${result.stdout}`)
        logger.defaultLogger(`STDERR of ${ip}: ${result.stderr}`)
        resolve(1)
      })
    })
    .catch((exception) => {
      resolve(-1)
    })
  })
  if(promise === -1){
    throw new Error('Can not stop docker')
  }
 
}

const executeMigration = async (fromIp, toIp, pathToKey, key, oldProvider, newProvider) => {
 
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: fromIp,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    })
    .then(() => {
      ssh.execCommand(`cd /home/${parameters.ec2Username}/image && sudo chmod +xr *.sh && chmod 400 ${key} && ./migration.sh ${toIp} ${key} ${oldProvider} ${newProvider}`).then((result) => {
        logger.defaultLogger(`STDOUT of ${fromIp}: ${result.stdout}`)
        logger.defaultLogger(`STDERR of ${fromIp}: ${result.stderr}`)
        resolve(1)
      })
    })
    .catch((exception) => {
      logger.defaultLogger(exception)
      resolve(-1)
    })
  })
  if(promise === -1){
    throw new Error('Can not execute migration')
  }
}

const copyKey = async (ip, pathToKey1, pathToKey2, provider) => {
  let keyName = null
  if(provider === 'Google'){
    keyName = 'google'
  }else{
    let strings = pathToKey1.split('/')
    keyName = strings[strings.length -1]
  }
  
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey1,
    }).then(() => {
      ssh.putFile(pathToKey2, `/home/${parameters.ec2Username}/image/${keyName}`)
      .then(() => {
        logger.defaultLogger(`CopyKeyHelper: The key ${pathToKey2} was copied successfully to ${ip}`)
        resolve(1)
      }, (error) => {
        logger.defaultLogger(`CopyKeyHelper: The copying of the key ${pathToKey2} to ${ip} failed`)
        logger.defaultLogger(error)
        resolve(-1)
      })
    })
  })
  if(promise === -1){
    //throw new Error('Can not copy key file')
  }

}

const deleteKey = async (ip, pathToKey) => {

  let strings = pathToKey.split('/')
  let keyName = strings[strings.length -1]
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.ec2Username,
      privateKey: pathToKey,
    }).then(() => {
      ssh.execCommand(`cd /home/${parameters.ec2Username}/image && rm ${keyName}`).then((result) => {
        logger.defaultLogger(`STDOUT of ${ip}: ${result.stdout}`)
        logger.defaultLogger(`STDERR of ${ip}: ${result.stderr}`)
        resolve(1)
        
      })
    })
  })
  if(promise === -1){
    //throw new Error('Can not copy key file')
  }

}


module.exports = { deleteKey, installSoftware, setUpServer, startDocker, endDocker, copyKey, executeMigration }