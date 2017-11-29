"use strict";
var path = require('path');
var pretty = require('pretty');
var fsViewLocator = require('./fsviewlocator');

const viewLocators = [fsViewLocator];

async function locateView(filePath, options) {
    for (let i = 0; i < viewLocators.length; i++) {
        let currentViewLocator = viewLocators[i];
        if (typeof currentViewLocator.findView === "function") {
            try {
                let view = await currentViewLocator.findView(filePath, options);
                if (typeof view === "string" && view.length) return view; //view found, return it.
            } catch (error) {
                console.error(error)
                continue;
            }
        }
    }
}

function processTemplate(html, options) {
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
    let result = '';
    try {
        result = new Function('obj', code).apply(options, [options]);
    }
    catch (err) {
        console.error(err)
        result = "Error from processTemplate(): '" + err.message + "'", " in \n\nCode:\n", code, "\n";
    }
    return result;
}

async function runPage(filePath, options) {
    var debug = process.env.NODE_ENV == "development";

    var html = await locateView(filePath, options);

    if (!html) throw new Error("Page not found by any viewlocators configured.");

    var filesRendered = [];

    while (true) {
        if (!html || !html.startsWith('<!--master:')) break; //dont' forget to trim() string in start of file
        var lines = html.split('\n');
        var master = lines[0];
        var masterFileName = master.split(':')[1].replace('-->', '').trim();
        if (filesRendered.includes(masterFileName)) break; //already rendered
        var masterPage = await locateView(masterFileName);
        if (!masterPage) break;
        let newContent = html;
        if (!debug) {
            lines.splice(0, 1); //remove first line
            newContent = lines.join('\n');
        }

        html = masterPage.replace('<!--body-->', newContent)
        //html = processTemplate(html, options);
        filesRendered.push(masterFileName);
    }

    var definedSections = [],
        implementedSections = [];

    //base layout html mounted, now search for <!--include:html--> and replace (headers, footers)
    var allLines = html.split('\n');
    for (let i = 0; i < allLines.length; i++) {
        let line = allLines[i].trim();
        if (line.startsWith('<!--include:')) {
            var includeFileName = line.split(':')[1].replace('-->', '').trim();
            var partialPage = await locateView(includeFileName);
            if (!partialPage) continue;
            if (!debug) {
                html = html.replace(line, partialPage);
            } else {
                var pos = html.indexOf(line) + line.length;
                html = html.substr(0, pos) + partialPage + html.substr(pos);
            }
        } else if (line.startsWith('<!--section:')) {
            var section = line.replace('<!--', '').replace('-->', '').split(':');
            if (section.length === 3) {
                implementedSections.push({
                    sectionName: section[1],
                    defaultContent: section[2]
                })
            }
        } else if (line.startsWith('<!--rendersection:')) {
            //get the section name, and the default file to render.
            var section = line.replace('<!--', '').replace('-->', '').split(':');
            if (section.length === 3) {
                definedSections.push({
                    sectionName: section[1],
                    defaultContent: section[2],
                    line: line,
                    lineNumber: i,
                    rendered: false
                })
            }
        }
    }

    for (let i = 0; i < definedSections.length; i++) {
        var definedSection = definedSections[i];
        for (let j = 0; j < implementedSections.length; j++) {
            var implementedSection = implementedSections[j];
            if (implementedSection.sectionName === definedSection.sectionName) {
                definedSection.defaultContent = implementedSection.defaultContent;
            }
        }
    }

    for (let i = 0; i < definedSections.length; i++) {
        let matchedSection = definedSections[i];
        //find the file and replace
        const fileName = matchedSection.defaultContent.trim();
        const file = await locateView(fileName);
        if (file) {
            html = html.replace(matchedSection.line, file);
            matchedSection.rendered = true;
        }
    }

    var result = processTemplate(html, options);
    if (options.pretty || debug) {
        return pretty(result);
    }

    return result;
}

module.exports = {
    execute: function (basePath, filePath, options, callback) {
        var fullPath = path.join(basePath, filePath);
        return runPage(fullPath, options).then((result) => {
            return callback(null, result);
        }).catch((err) => {
            console.log(err);
            return callback(null, err.toString());
        });
    },

    addViewLocator: function (viewLocator, index) {
        viewLocators.splice(index, 0, viewLocator);
    }
}