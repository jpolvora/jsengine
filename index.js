"use strict";
var beautify_js = require('js-beautify'); // also available under "js" export
//var beautify_css = require('js-beautify').css;
var beautify_html = require('js-beautify').html;

var fsViewLocator = require('./viewlocator');
var fs = require('fs');


function generateCode(templateStr = "", pretty = false) {
    if (typeof templateStr !== "string") {
        throw new Error("expected string as argument")
    }
    var self = this;
    var re = /<%(.+?)%>/g,
        reExp = /(^( )?(const|let|var|if|for|else|switch|case|break|{|}|;))(.*)?/g,
        code = 'return (function($model) { var r=[];\n',
        cursor = 0,
        match;
    var add = function (line, js) {
        js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
            (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
        return add;
    }
    while (match = re.exec(templateStr)) {
        add(templateStr.slice(cursor, match.index))(match[1], true);
        cursor = match.index + match[0].length;
    }
    add(templateStr.substr(cursor, templateStr.length - cursor));
    code = (code + 'return r.join(""); })(obj)').replace(/[\r\t\n]/g, ' ');
    if (self.jsengineconfig.prettyjs || pretty) code = beautify_js(code);
    return code;
}

function createFunction(code) {
    try {
        var fn = new Function('obj', code);
        return fn;
    }
    catch (err) {
        throw new Error("Error compiling template: '" + err.message + "'\n in \n\nCode:\n" + code);
    }
}

function compileTemplate(templateString = "") {
    var self = this;
    const code = generateCode.call(self, templateString);
    const fn = createFunction.call(self, code);
    return fn;
}


async function locateView(filePath = "") {
    var self = this;
    if (!filePath) return false;
    for (let i = 0; i < self.viewLocators.length; i++) {
        let currentViewLocator = self.viewLocators[i];
        if (typeof currentViewLocator.findView === "function") {
            try {
                let view = await currentViewLocator.findView(filePath.trim(), self.jsengineconfig);
                if (typeof view === "string" && view.length) return view; //view found, return it.
            } catch (error) {
                console.error(error)
                continue;
            }
        }
    }
}

/* returns the html */
async function generateTemplate(mainFilePath, filesRendered = []) {
    var self = this;
    const fnLocateView = locateView.bind(self);
    let html = await fnLocateView(mainFilePath);
    if (!html) {
        throw new Error(`Template '${mainFilePath}' not found at path '${self.jsengineconfig.views}'`)
    };

    var lines = html.split('\n');
    while (true) {
        if (!html.startsWith('<!--layout:')) break;
        var layoutDirective = lines[0].trim();
        var layoutFileName = layoutDirective.split(':')[1].replace('-->', '');
        if (filesRendered.includes(layoutFileName)) break; //already rendered
        var layoutContent = await fnLocateView(layoutFileName);
        if (!layoutContent) break;
        let childContent = html.replace(layoutDirective, '');
        html = layoutContent.replace('<!--renderbody-->', childContent)
        filesRendered.push(layoutFileName);
    }
    //update lines
    lines = html.split('\n');

    var definedSections = [],
        implementedSections = [];

    //layout structure ready to do replacements
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith('<!--renderpartial:')) {
            var partialViewFileName = line.split(':')[1].replace('-->', '').trim();
            var partialViewContent = await fnLocateView(partialViewFileName);
            if (!partialViewContent) continue;
            filesRendered.push(partialViewFileName);
            html = html.replace(line, partialViewContent);
        } else if (line.startsWith('<!--section:')) {
            var section = line.replace('<!--', '').replace('-->', '').trim().split(':');
            if (section.length === 3) {
                implementedSections.push({
                    sectionName: section[1],
                    fileName: section[2]
                })
            }
        } else if (line.startsWith('<!--rendersection:')) {
            //get the section name, and the default file to render.
            var section = line.replace('<!--', '').replace('-->', '').trim().split(':');
            if (section.length === 3) {
                definedSections.push({
                    sectionName: section[1],
                    fileName: section[2],
                    line: line
                })
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
        //find the file and replace
        const fileName = currentSection.fileName.trim();
        if (!fileName || fileName.length == 0 || fileName === "none") {
            html = html.replace(currentSection.line, '');
            continue;
        };
        const content = await fnLocateView(fileName);
        if (content) {
            filesRendered.push(fileName);
            html = html.replace(currentSection.line, content);
        }
    }

    return html;
}

async function getCompiledTemplate(mainFilePath) {
    var self = this;
    if (self.jsengineconfig.cache && self.cache.hasOwnProperty(mainFilePath)) {
        var entry = self.cache[mainFilePath];
        if (typeof entry.fn === "function")
            return entry.fn;
    }

    const filesRendered = [mainFilePath];

    let html = await generateTemplate.call(self, mainFilePath, filesRendered)

    let compiledTemplate;
    try {
        compiledTemplate = compileTemplate.call(self, html);
    } catch (error) {
        compiledTemplate = () => error.toString();
    }

    if (self.jsengineconfig.cache) {
        self.cache[mainFilePath] = {
            fn: compiledTemplate,
            files: filesRendered
        };
    }

    return compiledTemplate;
}

function jsengine(cfg = {}) {
    var self = this;
    self.viewLocators = [fsViewLocator];
    self.cache = {};
    self.jsengineconfig = {
        cache: true,
        pretty: true,
        prettyjs: false,
        views: ''
    }

    Object.assign(self.jsengineconfig, cfg);

    let facade;
    return facade = {
        generateTemplate: function (mainFilePath) {
            return generateTemplate.call(self, mainFilePath, []);
        },
        generateCode: function (templateString) {
            return generateCode.call(self, templateString, true);
        },
        compile: function (htmlString) {
            return compileTemplate.call(self, htmlString);
        },
        render: function (rawOrCompiled, options, throwError = false) {
            let compiledTemplate = typeof rawOrCompiled === "function"
                ? rawOrCompiled
                : facade.compile(rawOrCompiled);

            let result = "";
            try {
                result = compiledTemplate.apply(options, [options]);
            } catch (error) {
                if (throwError) throw error;
                result = error.toString();
            }
            return result;
        },
        express: function (filePath, options, callback) {
            return getCompiledTemplate.call(self, filePath).then((compiledTemplate) => {
                let result = facade.render.call(self, compiledTemplate, options);
                if (self.jsengineconfig.pretty)
                    result = beautify_html(result);

                return callback(null, result);
            }).catch((err) => {
                console.error(err);
                return callback(err);
            });
        },
        expressAsync: async function (filePath, options) {
            try {
                let compiledTemplate = await getCompiledTemplate.call(self, filePath, options);
                let result = facade.render.call(self, compiledTemplate, options);
                if (self.jsengineconfig.pretty)
                    result = beautify_html(result);

                return result;
            } catch (error) {
                console.error(error);
                throw error;
            }
        },
        addViewLocator: function (viewLocator, index) {
            self.viewLocators.splice(index, 0, viewLocator);
            return self;
        },

        uncache: function (changedFile) {
            if (!self.jsengineconfig.cache) return;
            let keysToRemove = [];
            for (let key in self.cache) {
                let entry = self.cache[key];
                for (let k = 0; k < entry.files.length; k++) {
                    let fileName = entry.files[k];
                    if (changedFile === fileName) {
                        keysToRemove.push(key);
                    }
                }
            }

            for (let k = 0; k < keysToRemove.length; k++) {
                let keyToRemove = keysToRemove[k];
                delete self.cache[keyToRemove];
            }
        }
    }
}

module.exports = jsengine;