"use strict";
var pretty = require('pretty');
var fsViewLocator = require('./viewlocator');

const viewLocators = [fsViewLocator];

const cache = {};

const jsengineconfig = {
    filePathOption: "permalink",
    cache: true,
    pretty: true
}

async function locateView(options, filePath) {
    if (!filePath || filePath.length == 0) return false;
    for (let i = 0; i < viewLocators.length; i++) {
        let currentViewLocator = viewLocators[i];
        if (typeof currentViewLocator.findView === "function") {
            try {
                let view = await currentViewLocator.findView(filePath.trim(), options, jsengineconfig);
                if (typeof view === "string" && view.length) return view; //view found, return it.
            } catch (error) {
                console.error(error)
                continue;
            }
        }
    }
}

function compileTemplate(html) {
    if (!html) return "";
    var re = /<%(.+?)%>/g,
        reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g,
        code = 'with(obj) { var r=[];\n',
        cursor = 0,
        match;
    var add = function (line, js) {
        js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
            (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
        return add;
    }
    while (match = re.exec(html)) {
        add(html.slice(cursor, match.index))(match[1], true);
        cursor = match.index + match[0].length;
    }
    add(html.substr(cursor, html.length - cursor));
    code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, ' ');
    try {
        return new Function('obj', code);
    }
    catch (err) {
        console.error(err)
        throw new Error("Error compiling template: '" + err.message + "'\n in \n\nCode:\n" + code);
    }
}

async function runPage(filePath, options) {
    var mainFilePath = options[jsengineconfig.filePathOption]
        ? options[jsengineconfig.filePathOption]
        : filePath;

    let compiledTemplate;

    if (jsengineconfig.cache && cache.hasOwnProperty(mainFilePath) && typeof cache[mainFilePath] === "function") {
        compiledTemplate = cache[mainFilePath];
    } else {
        const findView = locateView.bind(this, options);

        var html = await findView(mainFilePath);

        if (!html) throw new Error("Page not found by any configured viewlocators.");

        var filesRendered = [];

        var lines = html.split('\n');
        while (true) {
            if (!html || !html.startsWith('<!--layout:')) break;
            var layoutDirective = lines[0].trim();
            var layoutFileName = layoutDirective.split(':')[1].replace('-->', '');
            if (filesRendered.includes(layoutFileName)) break; //already rendered
            var layoutContent = await findView(layoutFileName);
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
                var partialViewContent = await findView(partialViewFileName);
                if (!partialViewContent) continue;
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
            const content = await findView(fileName);
            if (content) {
                html = html.replace(currentSection.line, content);
            }
        }

        try {
            compiledTemplate = compileTemplate(html);
        } catch (error) {
            compiledTemplate = () => error.toString();
        }
    }
    if (jsengineconfig.cache) {
        cache[mainFilePath] = compiledTemplate;
    }
    let result = "";
    try {
        result = compiledTemplate.apply(options, [options]);
    } catch (error) {
        result = error.toString();
    }
    return jsengineconfig.pretty
        ? pretty(result)
        : result;
}

module.exports = function (cfg = {}) {
    Object.assign(jsengineconfig, cfg);
    let singleton;
    return singleton = {
        execute: function (filePath, options, callback) {
            return runPage(filePath, options).then((result) => {
                return callback(null, result);
            }).catch((err) => {
                console.log(err);
                return callback(null, err.toString());
            });
        },

        addViewLocator: function (viewLocator, index) {
            viewLocators.splice(index, 0, viewLocator);
            return singleton;
        }
    }
}