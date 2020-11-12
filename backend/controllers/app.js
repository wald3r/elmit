const path = require('path')
const appRouter = require('express').Router()


/**
 * Return pages for single page application
 */
appRouter.get('/*', function(req, res) {
  // eslint-disable-next-line no-undef
  res.sendFile(path.join(__dirname, '../build', 'index.html'))
})


module.exports = appRouter