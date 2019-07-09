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
  constructor(filePath, model, viewKind = 'view', options, body, sections) {
    this.model = model
    this.viewKind = viewKind
    this.options = options

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(options.views, filePath);
    this.fullPath = fullPath
    this.name = path.basename(fullPath)
    this.renderBodyExecuted = false;

    const self = this;
    const methods = {
      renderFile: self.renderFile.bind(self),
      renderSection: self.createRenderSection.call(self, sections).bind(self),
      renderBody: self.createRenderBody.call(self, body).bind(self)
    }


    methods.renderSection = this.createRenderSection.call(null, sections).bind(this)
    methods.renderBody = this.createRenderBody.call(null, body).bind(this)

    this.viewParameters = {...tags, ...this.options.helpers, ...methods};
  }

  execute() {
    try {
      logger('executing: ' + this.fullPath);
      const {layout = '', body = emptyfn, sections = emptyObj} = nodeRequire(this.fullPath, !this.options.cache);
      const result = layout
        ? this.master(layout, body, sections)
        : body.call(this.model, this.viewParameters);
      logger('executed:', result);
      return result;
    } catch (error) {
      if (this.viewKind === 'view') throw createError('error executing view', error);
      logger(error);
      return error.toString();
    }
  }

  master(layout, body, sections) {
    const masterView = new View(layout, this.model, 'layout', {...this.options}, body, sections);
    const result = masterView.execute();
    if (!masterView.renderBodyExecuted) throw new Error('renderBody not executed on layout view.')
    return result;
  }

  renderFile(filename) {
    const partialView = new View(filename, this.model, 'partial', {...this.options});
    const result = partialView.execute();
    return result;
  }

  //this method must be curriered before use
  createRenderBody(body = emptyfn) {
    return function renderBody() {
      const self = this;
      if (self.renderBodyExecuted == true) throw new Error('renderBody already rendered');
      if (self.viewKind !== 'layout') return `<span><b>[renderBody:view:${self.name}:error][is not allowed in a non master-page]</b></span>`;
      const result = typeof body === "function" ? body.call(self.model, self.viewParameters) : body;
      self.renderBodyExecuted = true;
      return result;
    }
  }

  createRenderSection(sections = {}) {
    return function renderSection(sectionName, defaultValue = '') {
      const self = this;
      if (!self.viewKind === 'layout') return `<span><b>[renderSection:view:${self.name}:section:${sectionName}:error][is not allowed in a non master - page]</b ></span > `;
      const section = sections[sectionName] || '';
      const result = typeof section === 'function' ? section.call(self.model, self.viewParameters) : '';
      return result;
    }
  }
}

module.exports = View;