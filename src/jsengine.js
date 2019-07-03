const path = require('path'),
  fs = require('fs'),
  util = require('util'),
  beautify_html = require('js-beautify').html,
  minify = require('html-minifier').minify,
  logger = require('debug')('JSENGINE'),
  FsViewLocator = require('./fsviewlocator'),
  View = require('./view'),
  write = util.promisify(fs.writeFile)


const minifyOptions = {
  collapseBooleanAttributes: true,
  removeComments: true,
  removeEmptyAttributes: true,
  removeRedundantAttributes: true
}

class JsEngine {
  constructor(opts) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.options = Object.assign({
      cache: !isDevelopment,
      beautify: false,
      minify: false,
      viewLocators: [],
      views: path.join(path.dirname(process.mainModule.filename), 'views')
    }, opts);

    this.options.viewLocators.push(new FsViewLocator(logger, this.options.views));
  }

  async render(filePath, model, callback) {
    logger("Start rendering: " + filePath);


    try {
      const view = new View(filePath, this.options.views, this.options.cache, model);
      let html = view.execute();

      if (this.options.beautify) {
        html = beautify_html(html);
      }
      if (this.options.minify) {
        html = minify(html, minifyOptions);
      }
      return callback(null, html);
    } catch (error) {
      logger(error);
      return callback(error);
    }
  }
}

module.exports = JsEngine;
