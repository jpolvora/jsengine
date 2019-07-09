const express = require('express');
const JSEngine = require('../index');
const path = require('path');

process.on('uncaughtException', function(err) {
  console.error('Uncaught', err);
});

async function main() {
  const app = express();

  const viewsPath = path.join(__dirname, 'views');

  const jsengine = new JSEngine({
    beautify: true,
    // minify: true,
    viewsPath
  });

  app.engine('js', jsengine.render.bind(jsengine));
  app.set('views', viewsPath);
  app.set('view engine', 'js');

  app.use((req, res, next) => {
    console.log(`request: ${req.method} - ${req.url}`);
    return next();
  });

  const routes = require('./routes');
  routes(app);

  app.use((req, res, next) => {
    return res.status(404).end('page not found');
  });

  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode);

    if (req.xhr) {
      return res.json({success: false, message: 'error'});
    }

    return next(err);
  });
  const server = await listen(app);
  console.debug('listening on port ' + server._port);
}

async function listen(app) {
  return new Promise((resolve, reject) => {
    try {
      const port = process.env.PORT || 3030;
      const server = app.listen(port, () => {
        server._port = port;
        return resolve(server);
      });
    } catch (err) {
      return reject(err);
    }
  });
}

main();
