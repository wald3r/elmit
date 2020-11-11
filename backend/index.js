
const http = require('http')
//const https = require('https')
//const config = require('./utils/config')
const app = require('./app')
//require('dotenv').config()
const logger = require('./utils/logger')
const server = http.createServer(app)

server.listen(3001, () => {
  logger.defaultLogger(`Server running on port 3001`)
})