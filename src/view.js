const path = require('path'),
  util = require('util'),
  logger = require('debug')('JSENGINE:view');

logger.log = console.log.bind(console);

/* static no-instance shared functions */



const tags = {
  html: (strings, ...values) => {
    let str = '';
    for (let i = 0; i < strings.length; i++) {
      const val = (values[i] || '');
      str += strings[i] + val;
    }
    return str;
  }
}

const emptyfn = () => 'emptyFn';
const emptyObj = {};

const createError = (...args) => {
  const msg = util.inspect(args);
  return new Error(msg);
};

function nodeRequire(fullPath, reload = false) {
  try {
    if (reload) delete require.cache[require.resolve(fullPath)];
    const fn = require(fullPath);
    return fn;
  } catch (error) {
    throw createError('Error requiring file', fullPath, error.stack);
  }
}

//viewKind: view, partial, layout
class View {
  constructor(filePath, model, viewKind = 'view', options, body, sections, depth = 1) {
    this.model = model
    this.viewKind = viewKind
    this.options = options
    this.depth = depth;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(options.views, filePath);
    this.fullPath = fullPath
    this.name = path.basename(fullPath)
    this.renderBodyExecuted = false;

    const methods = {
      renderFile: this.createRenderFile().bind(this),
      renderSection: this.createRenderSection(sections).bind(this),
      renderBody: this.createRenderBody(body).bind(this)
    }

    this.viewParameters = {...tags, ...this.options.helpers, ...methods};
  }

  execute() {
    try {
      logger('executing: ' + this.fullPath);
      const {layout = '', body: bodyFn = emptyfn, sections = emptyObj} = nodeRequire(this.fullPath, !this.options.cache);
      const viewContents = bodyFn.call(this.model, this.viewParameters);
      let result = '';
      if (layout) {
        result = this.master(layout, viewContents, sections)
      } else {
        result = viewContents;
      }
      logger('executed:', this.depth);
      return result;
    } catch (error) {
      if (this.viewKind === 'view') throw createError('error executing view', error);
      logger(error);
      return error.toString();
    }
  }

  master(layout, body, sections) {
    const masterView = new View(layout, this.model, 'layout', {...this.options}, body, sections, this.depth + 1);
    const result = masterView.execute();
    if (!masterView.renderBodyExecuted) throw new Error('renderBody not executed on layout view.')
    return result;
  }

  createRenderFile() {
    return function(filename) {
      const partialView = new View(filename, this.model, 'partial', {...this.options});
      const result = partialView.execute();
      return result;
    }
  }

  //this method must be curriered before use
  createRenderBody(body) {
    return function() {
      const self = this;
      if (self.renderBodyExecuted == true) throw new Error('renderBody already rendered');
      if (self.viewKind !== 'layout') return `<span><b>[renderBody:view:${self.name}:error][is not allowed in a non master-page]</b></span>`;
      const result = typeof body === "function" ? body.call(self.model, self.viewParameters) : body;
      self.renderBodyExecuted = true;
      return result;
    }
  }

  createRenderSection(sections = {}) {
    return function(sectionName, defaultValue = '') {
      const self = this;
      if (!self.viewKind === 'layout') return `<span><b>[renderSection:view:${self.name}:section:${sectionName}:error][is not allowed in a non master - page]</b ></span > `;
      const section = sections[sectionName] || defaultValue;
      const result = typeof section === 'function' ? section.call(self.model, self.viewParameters) : '';
      return result;
    }
  }
}

module.exports = View;