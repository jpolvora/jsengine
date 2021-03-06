const path = require('path'),
  util = require('util'),
  logger = require('debug')('JSENGINE:view'),
  escape = require("escape-html"),
  fs = require('fs'),
  vm = require('vm')

logger.log = console.log.bind(console);
logger.error = console.error.bind(console);


/* static no-instance shared functions */

function htmlTag(strings, ...values) {
  if (values.length === 0) return strings.join('').replace(/^\s*$(?:\r\n?|\n)/gm, "");
  const html = [];
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i]
    const val = (values[i] || '');
    const dolar = str[str.length - 1];
    if (dolar === '$') {
      html.push(str.slice(0, str.length - 1) + escape(val));
    } else {
      html.push(str + val);
    }
  }
  return html.join('').replace(/^\s*$(?:\r\n?|\n)/gm, "");
}

const emptyfn = () => ''

function createError(...args) {
  const error = new Error(util.inspect(args))
  Error.captureStackTrace(error, createError)
  return error
}

function wrapHtml(fullPath, rewrite) {
  const newFullPath = fullPath + '.jse';
  try {
    const stats = fs.statSync(newFullPath);
    if (stats.isFile() && !rewrite) return newFullPath;
  } catch (e) {
    logger(e);
  }
  try {
    const text = fs.readFileSync(fullPath);
    const code = `module.exports = (html) => html\`\n${text}\``;
    fs.writeFileSync(newFullPath, code, {
      flag: 'w+'
    });
  } catch (e) {
    logger(e);
  }
  finally {
    return newFullPath;
  }

}

function nodeRequire(fullPath, reload = false) {
  try {
    if (path.extname(fullPath) === ".html") {
      fullPath = wrapHtml(fullPath, reload);
    }
    const ext = path.extname(fullPath) ? '' : '.jse'
    if (reload) delete require.cache[require.resolve(fullPath + ext)];
    const fn = require(fullPath + ext);
    return fn;
  } catch (error) {
    throw createError('Error requiring file', fullPath, error.stack);
  }
}

//viewKind: view, partial, layout
class View {
  constructor(moduleOrPath, model, viewKind, options, render, sections, depth = 1) {
    this.model = model;
    this.viewKind = (viewKind === "view" || viewKind === "layout" || viewKind === "partial") ? String(viewKind) : false;
    if (!this.viewKind) throw createError('invalid view kind: ' + viewKind);
    this.options = options;
    this.render = render || emptyfn.bind(this);
    this.sections = sections;
    this.depth = depth;
    this.fn = null;
    this.filename = moduleOrPath;
    if (moduleOrPath instanceof module.constructor) {
      if (typeof moduleOrPath.filename === "string") this.filename = moduleOrPath.filename;
      if (typeof moduleOrPath.exports.view === "function") this.fn = moduleOrPath.exports.view;
    }
    if (typeof this.filename !== "string") throw createError("argument moduleOrPath invalid: must be a function or a module");
    const fullPath = path.isAbsolute(this.filename) ? this.filename : options.views.trimRight('/') + '/' + this.filename;
    this.fullPath = fullPath
    this.dirname = path.dirname(fullPath);
    this.ext = path.extname(fullPath);
    this.assets = options.assets || this.dirname.trimRight('/') + '/assets';
    this.name = path.basename(fullPath)
    this.renderBodyExecuted = false;

    this.master = this.createMaster().bind(this);
    const methods = {
      renderFile: Object.freeze(this.createRenderFile().bind(this)),
      renderSection: Object.freeze(this.createRenderSection().bind(this)),
      renderBody: Object.freeze(this.createRenderBody().bind(this)) //currying
    }

    const html = htmlTag.bind(this);
    const helpers = options.helpers.call(null, this, html);
    this.viewParameters = Object.freeze(Object.assign(html, {
      ...helpers,
      ...methods
    }, {
        model: this.model,
        $: this.model,
        html: html
      }));

    logger(`created view ${moduleOrPath} as ${this.viewKind}`)
  }

  renderWrapper(render) {
    if (typeof render !== "function") throw createError("render must be a function.", this.fullPath, render)

    const result = render.call(this.model, this.viewParameters) || '';
    logger('render executed', this.fullPath);
    if (this.options.printComments) {
      return `<!-- startOf:${this.viewKind}:${this.name} --> \n${result}\n<!-- endOf:${this.viewKind}:${this.name} -->`;
    }
    return result;
  }

  execute() {
    let result = ' ';
    try {
      logger('executing: ' + this.fullPath);
      const viewModule = this.fn ? this.fn : nodeRequire(this.fullPath, !this.options.cache);
      if (typeof viewModule !== "function") throw createError('module must exports a default function: ' + this.fullPath)
      const template = viewModule.call(null, this.viewParameters);
      switch (typeof template) {
        case "boolean":
          break;
        case "string":
          result = this.renderWrapper(() => template);
          break;
        case "function":
          result = this.renderWrapper(template);
          break;
        case "object":
          switch (typeof template.layout) {
            case "string":
              result = this.master(template);
              break;
            case "function":
              result = this.master(template.layout.call(this));
              break;
            default:
              break;
          }

        // if (typeof template.render === "function") {
        //   result = this.renderWrapper(template.render);
        //   break;
        // } else if (typeof template.render === "string") {
        //   result = this.renderWrapper(() => template.render);
        //   break;
        // }

        default:
          break;
      }
      if (result === '') throw createError("Unable to render template (shape of module not supported):" + this.fullPath);
    } catch (error) {
      logger(error);
      if (this.viewKind === "view") throw error;
      result += htmlTag`<div class="error"><p>$${error.message}</p><p>$${error.stack}</p ></div>`;
    } finally {
      return result.trim();
    }
  }

  createMaster() {
    const self = this;
    return ({ layout, render, sections = {} }) => {
      const mergedSections = Object.assign({}, self.sections || {}, sections);
      const masterView = new View(layout, self.model, 'layout', { ...self.options }, self.renderWrapper.bind(self, render), mergedSections, self.depth + 1);
      const result = masterView.execute();
      if (!masterView.renderBodyExecuted) throw createError('renderBody not executed on layout view: ' + layout)
      return result;
    }
  }

  createRenderFile() {
    const self = this;
    return filename => {
      if (self !== this) throw createError("self!=this")
      const partialView = new View(filename, self.model, 'partial', { ...self.options });
      const result = partialView.execute();
      return result;
    }
  }

  createRenderBody() {
    const self = this;
    return () => {
      if (!self.renderBodyExecuted && self.viewKind === 'layout' && typeof self.render === "function") {
        self.renderBodyExecuted = true;
        const result = self.render();
        return result;
      }
      return "";
    }
  }

  createRenderSection() {
    const self = this;
    return (sectionName, defaultValue = false) => {
      if (self !== this) throw createError("self!=this")
      if (self.viewKind !== 'layout') throw createError("rendersection allowed only in master/layout pages.")
      const sections = self.sections || {};
      const section = sections.hasOwnProperty(sectionName) ? sections[sectionName] : defaultValue;

      const fn = typeof section === "function" ? section : () => section;
      const result = fn() || '';
      return (self.options.printComments) ? `<!-- section_start: ${sectionName} -->\n${result} \n <!-- section_end: ${sectionName} --> ` : result;
    }
  }
}

module.exports = View;