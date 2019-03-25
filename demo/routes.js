const router = require('express').Router();
const IndexController = require('./index.controller');

router.get(['/', '/index'], IndexController.get);

module.exports = app => {
  app.use(router);
};