const path = require('path'),
  util = require('util'),
  helpers = require('./helpers')

const emptyfn = () => '';
const createError = (...args) => new Error(util.inspect(args))

class View {
  constructor(filePath, views, cache, model) {
    this.views = views;
    this.cache = cache;
    this.model = model;
    this.loaded = false;
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(views, filePath);
    this.fullPath = fullPath;
    this.helpers = helpers;
  }

  loadTemplate(fullFilePath) {
    try {
      if (!this.cache) delete require.cache[require.resolve(fullFilePath)];
      const fn = require(fullFilePath);
      return fn;
    } catch (error) {
      throw createError('Error requiring file', fullFilePath, error.stack);
    }
  }

  html(strings, ...values) {
    let str = '';
    strings.forEach((string, i) => {
      str += string + (values[i] || '');
    });
    return str;
  }

  execute(throws) {
    try {
      const fn = this.loadTemplate(this.fullPath);
      this.loaded = true;
      if (typeof fn === "function") {
        const result = fn.call(this, this.html);
        return result;
      }
      return fn;
    } catch (error) {
      if (throws) throw createError('error executing view', error);
      return "";
    }
  }

  master(layout, body, sections) {
    const MasterView = require('./masterview');
    const master = new MasterView(layout, this.views, this.cache, this.model, body, sections);
    const result = master.execute(true);
    return result;
  }

  renderPartial(fileName) {
    const view = new View(fileName, this.views, this.cache, this.model)
    const result = view.execute(false);
    return result;
  }

  repeat(count, callback) {
    let str = '';
    for (let i = 0; i < count; i++) {
      str += callback(i) || "0";
    }

    return str;
  }

  forEach(iterable, callback) {
    let str = '';
    for (let i = 0; i < iterable.length; i++) {
      const element = iterable[i];
      str += callback(element, i || 0) || "";
    }
    return str;
  }
}

module.exports = View;