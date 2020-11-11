const NodeSSH = require("node-ssh");
const parameters = require('../parameters')
const logger = require('./logger')

ssh = new NodeSSH()


const setUpServer = async (ip, pathToDocker) => {

  const failed = []
  const successful = []   
  
  return await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.engineUsername,
      //passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile

    })
    .then(() => {
      ssh.putDirectory(pathToDocker, `/home/${parameters.engineUsername}/image`, {
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

const copyKey = async (ip, key) => {

  let strings = key.split('/')
  let keyName = strings[strings.length -1]
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.engineUsername,
      passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile
    }).then(() => {
      ssh.putFile(key, `/home/${parameters.engineUsername}/image/${keyName}`)
      .then(() => {
        logger.defaultLogger(`CopyKeyHelper: The key ${key} was copied successfully to ${ip}`)
        resolve(1)
      }, (error) => {
        logger.defaultLogger(`CopyKeyHelper: The copying of the key ${key} to ${ip} failed`)
        logger.defaultLogger(error)
        resolve(-1)
      })
    })
  })
  if(promise === -1){
    //throw new Error('Can not copy key file')
  }

}

const executeMigration = async (fromIp, toIp, key, oldProvider, newProvider) => {
 
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: fromIp,
      username: parameters.engineUsername,
      passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile
    })
    .then(() => {
      ssh.execCommand(`cd /home/${parameters.engineUsername}/image && sudo chmod +xr *.sh && chmod 400 ${key} && ./migration.sh ${toIp} ${key} ${oldProvider} ${newProvider}`).then((result) => {
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


const installSoftware = async (ip) => {

  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.engineUsername,
      passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile
    
    }).then(() => {
      ssh.execCommand(`chmod +xr /home/${parameters.engineUsername}/image/engine_install.sh && cd /home/${parameters.engineUsername}/image/ && ./engine_install.sh && exit`).then((result) => {
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


const startDocker = async (ip) => {
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.engineUsername,
      //passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile
    })
    .then(() => {
      ssh.execCommand(`sudo service docker restart && cd /home/${parameters.engineUsername}/image/ && sudo docker-compose up -d && exit`).then((result) => {
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

const endDocker = async (ip) => {
  let promise = await new Promise((resolve) => {
    ssh.connect({
      host: ip,
      username: parameters.engineUsername,
      passphrase: parameters.sshEnginePassphrase,
      privateKey: parameters.sshEngineSSHFile

    })
    .then(() => {
      ssh.execCommand(`cd /home/${parameters.engineUsername}/image && sudo docker-compose down && exit`).then((result) => {
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



module.exports = { setUpServer, installSoftware, startDocker, endDocker, copyKey, executeMigration }
