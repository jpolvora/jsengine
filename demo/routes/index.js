const router = require('express').Router()
const home = require('./home')

router.get(['/', '/index'], home)

module.exports = router
