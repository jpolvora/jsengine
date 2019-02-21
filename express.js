/** @format */

'use strict';
const engine = require('./engine');
const defaultViewLocator = require('./viewlocator');
const minify = require('html-minifier').minify;
const beautify_html = require('js-beautify').html;
const JsEngineError = require('./JsEngineError');
const debug = require('debug')('jsengine');

async function locateView (filePath, viewsPath) {
  var self = this;
  if (!filePath) return false;
  for (let i = 0; i < self.viewLocators.length; i++) {
    let currentViewLocator = self.viewLocators[i];
    if (typeof currentViewLocator.findView === 'function') {
      try {
        let view = await currentViewLocator.findView(filePath.trim(), viewsPath);
        if (typeof view === 'string' && view.length) return view; // view found, return it.
      } catch (error) {
        console.error(error);
        debug(error);
        continue;
      }
    }
  }
}

/* returns the html */
async function generateTemplate (mainFilePath, root, filesRendered = []) {
  const fnLocateView = locateView.bind(this);
  let html = await fnLocateView(mainFilePath, root);
  if (!html) {
    throw new JsEngineError(`File '${mainFilePath}' not found`);
  }
  filesRendered.push(mainFilePath);

  var lines = html.split('\n');
  while (true) {
    if (!html.startsWith('<!--layout:')) break;
    var layoutDirective = lines[0].trim();
    var layoutFileName = layoutDirective.split(':')[1].replace('-->', '');
    if (filesRendered.includes(layoutFileName)) break; // already rendered
    var layoutContent = await fnLocateView(layoutFileName, root);
    if (!layoutContent) break;
    let childContent = html.replace(layoutDirective, '');
    html = layoutContent.replace('<!--renderbody-->', childContent);
    filesRendered.push(layoutFileName);
  }
  // update lines
  lines = html.split('\n');

  var definedSections = [],
    implementedSections = [];

    // layout structure ready to do replacements
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('<!--renderpartial:')) {
      var partialViewFileName = line
        .split(':')[1]
        .replace('-->', '')
        .trim();
      var partialViewContent = await fnLocateView(partialViewFileName, root);
      if (!partialViewContent) continue;
      filesRendered.push(partialViewFileName);
      html = html.replace(line, partialViewContent);
    } else if (line.startsWith('<!--section:')) {
      var section = line
        .replace('<!--', '')
        .replace('-->', '')
        .trim()
        .split(':');
      if (section.length === 3) {
        implementedSections.push({
          sectionName: section[1],
          fileName: section[2]
        });
      }
    } else if (line.startsWith('<!--rendersection:')) {
      // get the section name, and the default file to render.
      var section = line
        .replace('<!--', '')
        .replace('-->', '')
        .trim()
        .split(':');
      if (section.length === 3) {
        definedSections.push({
          sectionName: section[1],
          fileName: section[2],
          line: line
        });
      }
    }
  }

  for (let i = 0; i < definedSections.length; i++) {
    var definedSection = definedSections[i];
    for (let j = 0; j < implementedSections.length; j++) {
      var implementedSection = implementedSections[j];
      if (implementedSection.sectionName === definedSection.sectionName) {
        definedSection.fileName = implementedSection.fileName;
      }
    }
  }

  for (let i = 0; i < definedSections.length; i++) {
    let currentSection = definedSections[i];
    // find the file and replace
    const fileName = currentSection.fileName.trim();
    if (!fileName || fileName.length == 0 || fileName === 'none') {
      html = html.replace(currentSection.line, '');
      continue;
    }
    const content = await fnLocateView(fileName, root);
    if (content) {
      filesRendered.push(fileName);
      html = html.replace(currentSection.line, content);
    }
  }

  return html;
}

function stripHtmlComments (html) {
  if (typeof html !== 'string') {
    throw new TypeError('strip-html-comments expected a string');
  }

  return html.replace(/<!--[\s\S]*?(?:-->)/g, '');
}

async function getOrCreateCompiledTemplateFn (options, mainFilePath) {
  var self = this;
  var root = options.settings.views;

  const filesRendered = [];

  const html = await generateTemplate.call(self, mainFilePath, root, filesRendered);

  // const cleanHtml = stripHtmlComments(html);
  let compiledTemplate = null;

  if (self.options.write) {
    compiledTemplate = await engine.compileAndSave(self.options.beautify, html, mainFilePath, self.options.extension);
  } else {
    const minifyOptions = {
      collapseBooleanAttributes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true
    };
    if (self.options.minify) {
      compiledTemplate = await engine.compile(minify(html, minifyOptions));
    } else {
      compiledTemplate = await engine.compile(html);
    }
  }

  return compiledTemplate;
}

function render (filePath, options, callback) {
  var self = this;
  return getOrCreateCompiledTemplateFn
    .call(self, options, filePath)
    .then((fn) => {
      try {
        if (typeof fn === 'function') {
          const renderedHtml = fn.apply(options);
          if (self.options.beautify) {
            return callback(null, beautify_html(renderedHtml));
          }
          return callback(null, renderedHtml);
        } else {
          return callback(null, fn);
        }
      } catch (error) {
        return callback(error);
      }
    })
    .catch((error) => {
      return callback(error);
    });
}

class JsEngine {
  constructor (options = {}) {
    const isProduction = (process.env.NODE_ENV || 'development') !== 'development';
    this.viewLocators = [defaultViewLocator];
    this.options = Object.assign({
      isProduction: isProduction,
      beautify: !isProduction,
      write: !isProduction,
      minify: isProduction,
      extension: 'html'
    }, options);
  }

  install () {
    var self = this;
    if (self instanceof JsEngine) return render.bind(this);
    throw new Error('context must be of type JsEngine');
  }

  addViewLocator (viewLocator, index) {
    this.viewLocators.splice(index, 0, viewLocator);
    return this;
  }
}

module.exports = JsEngine;
