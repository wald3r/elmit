const fs = require('fs')
const Path = require('path')
const parameters = require('../parameters')
const exec = require('child_process').exec
const logger = require('./logger')

const deleteFolderRecursively = (path) => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      const curPath = Path.join(path, file)
      if (fs.lstatSync(curPath).isDirectory()) { 
        deleteFolderRecursively(curPath)
      } else { 
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}


const createDirectory = async (path, file) => {

  const parts = file.name.split('___')[1]
  let dirParts = parts.split('__').splice(1, parts.length)
  let list = file.name.split('___')
  let totalPath = path

  await new Promise((resolve) => {
    dirParts.map(folder => {
      let length = dirParts.length
      if(folder === dirParts[length-1]){
        logger.defaultLogger(`DirectoryCreaterHelper: ${folder} is not a folder`)
      }else{
        totalPath = `${totalPath}/${folder}`
        if (!fs.existsSync(totalPath)){
          fs.mkdirSync(totalPath, { recursive: true })
          logger.defaultLogger(`DirectoryCreaterHelper: ${folder} folder created`)
        } else{
          logger.defaultLogger(`DirectoryCreaterHelper: ${folder} folder already exists`)
        }
      }
      if(dirParts[dirParts.length -1] === folder){
        resolve()
      }
    })
  })
  
  let answer = true
  await new Promise((resolve) => {
    file.mv(`${totalPath}/${list[list.length-1]}`, err => {
      if (err){
        logger.defaultLogger(`DirectoryCreaterHelper: ${file.name} could not save file`)
        answer = false
        resolve()
      }else{
        logger.defaultLogger(`DirectoryCreaterHelper: ${file.name} file saved`)
      }
      resolve()
    })
  })

  return answer

}

const deleteFile = async (path) => {

  if(parameters.sshEngineSSHFile.includes(path)){
    return
  }
  return await new Promise((resolve) => {
    fs.unlink(path, (err) => {
      if (err) logger.defaultLogger(`FileDeleteHelper: ${err.message}`)
      resolve()
    })
  })
 
}

const renameFile = (oldFile, newFile) => {
  fs.rename(oldFile, newFile, (err) => {
    if (err) logger.defaultLogger(`FileRenameHelper: ${err.message}`)
  })
}

const createPath = (path) => {
  if (!fs.existsSync(path)){
    fs.mkdirSync(path, { recursive: true })
  } 
}

const copyFile = (filepath1, filepath2, filename) => {
  fs.copyFile(filepath1, filepath2+filename, (err) => {
    if(err) logger.defaultLogger(`CopyFileHelper: Could not copy file to ${filepath2+filename}`)
    else logger.defaultLogger(`CopyFileHelper: Copied file to ${filepath2+filename}`)
  })
}




const executeFile = async (path, arg) => {



  logger.defaultLogger(path, arg)
  const shellScript = exec(`sh ${path} ${arg}`)
  

  await new Promise((resolve) => {
    shellScript.on('close', async () => {
      logger.defaultLogger('Workaround file executed')
      resolve()
    })
  })
 
}

const createKeyFile = async (key, path) => {
  
  let finalPath = path
  await new Promise((resolve) => {
    if (fs.existsSync(finalPath)) {
      finalPath = finalPath.replace('.pem', '_1.pem')
    }
    fs.writeFile(finalPath, key.KeyMaterial, (err) => {
      if (err) logger.defaultLogger(`KeyCreatorHelper: ${err.message}`)
      resolve()  
    })
  })
  
  fs.chmod(finalPath, 0o400, (err) => {
    if (err) logger.defaultLogger(`KeyCreatorHelper: ${err.message}`)
  })
  
}

module.exports = { createPath, copyFile, deleteFile, createKeyFile, createDirectory, deleteFolderRecursively, renameFile, executeFile }
