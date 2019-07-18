;(async () => {
  const express = require('express')
  const JSEngine = require('../index')
  const path = require('path')

  process.on('uncaughtException', function (err) {
    console.error('Uncaught', err)
    process.exit(1)
  })

  const app = express()
  const jsengine = new JSEngine({ app })
  const router = require('./routes')

  app.use(router)
  app.use((req, res, next) => {
    return res.status(404).end('page not found')
  })
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500
    res.status(statusCode)
    if (req.xhr) {
      return res.send(err)
    }
    return next(err)
  })

  const port = process.env.PORT || 3030
  const server = app.listen(port, () => {
    console.debug('listening on port ' + port)
  })
})()
