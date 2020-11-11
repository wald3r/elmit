const jwt = require('jsonwebtoken')
const databaseHelper = require('../utils/databaseHelper')
const parameters = require('../parameters')
const logger = require('./logger')
/**
 * Verify if user is logged in  
 * @param {*} token 
 */
const isLoggedIn = async (token) => {
  
  var userRow = undefined
  try{
    // eslint-disable-next-line no-undef
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken.rowid) {
      return null
    }
    userRow = await databaseHelper.selectById(parameters.userTableValues, parameters.userTableName, decodedToken.rowid)
  }catch(exception){
    logger.defaultLogger(`Authentication Helper: ${exception.message}`)
  }
  if(userRow === null || userRow === undefined){
    return null
  }

  return userRow
}

module.exports = { isLoggedIn }