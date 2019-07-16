const path = require('path'),
  fs = require('fs'),
  minify = require('html-minifier').minify,
  logger = require('debug')('JSENGINE:main'),
  util = require('util'),
  write = util.promisify(fs.writeFile),
  View = require('./view'),
  helpers = require('./helpers');

logger.log = console.log.bind(console);
logger.error = console.error.bind(console);


const getMinifyOptions = (dev) => ({
  collapseBooleanAttributes: true,
  collapseInlineTagWhitespace: true,
  collapseWhitespace: !dev,
  includeAutoGeneratedTags: !dev,
  removeComments: !dev,
  removeOptionalTags: !dev,
  removeEmptyAttributes: !dev,
  removeRedundantAttributes: !dev
});

class JsEngine {
  constructor(opts) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.options = Object.assign({
      assets: '/assets',
      isDevelopment: isDevelopment,
      cache: !isDevelopment,
      beautify: isDevelopment,
      minify: false,
      printComments: isDevelopment,
      helpers: helpers,
      formatLang: { lang: 'pt-BR', currency: 'BRL' },
      views: path.join(path.dirname(process.mainModule.filename), 'views')
    }, opts);

    this.__express = this.render.bind(this);
    logger('JsEngine instance created with options: ' + util.inspect(this.options))
  }

  render(fullPath, model, callback) {
    logger('Start rendering: ' + fullPath);
    let html = '', error = undefined;

    try {
      console.time(fullPath);
      const view = new View(fullPath, model, 'view', this.options);
      html = view.execute();

      if (this.options.minify) {
        html = minify(html, getMinifyOptions(this.options.isDevelopment));
      }
    } catch (e) {
      logger(e);
      error = e;
    }
    finally {
      console.timeEnd(fullPath);
      logger('End rendering: ' + fullPath);
      return callback(error, html);
    }
  }
}

module.exports = JsEngine;
