const path = require('path'),
  fs = require('fs'),
  beautify_html = require('js-beautify').html,
  minify = require('html-minifier').minify,
  logger = require('debug')('JSENGINE'),
  util = require('util'),
  write = util.promisify(fs.writeFile),
  View = require('./view'),
  helpers = require('./helpers');


const minifyOptions = {
  collapseBooleanAttributes: true,
  removeComments: true,
  removeEmptyAttributes: true,
  removeRedundantAttributes: true
};

class JsEngine {
  constructor(opts) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.options = Object.assign({
      isDevelopment: isDevelopment,
      cache: !isDevelopment,
      beautify: false,
      minify: false,
      helpers: helpers,
      formatLang: {lang: 'pt-BR', currency: 'BRL'},
      views: path.join(path.dirname(process.mainModule.filename), 'views')
    }, opts);

    this.render = this.render.bind(this);
  }

  render(fullPath, model, callback) {
    logger('Start rendering: ' + fullPath);
    console.time('render');
    try {
      const view = new View(fullPath, model, 'view', this.options);
      let html = view.execute();

      if (html.length > 0) {
        if (this.options.beautify) {
          html = beautify_html(html);
        }
        if (this.options.minify) {
          html = minify(html, minifyOptions);
        }
      }
      return callback(null, html);
    } catch (error) {
      logger(error);
      return callback(error);
    }
    finally {
      console.timeEnd('render');
    }
  }
}

module.exports = JsEngine;
