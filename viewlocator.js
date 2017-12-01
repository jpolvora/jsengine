var fs = require('fs');
var path = require('path');

//FileSystemViewLocator
module.exports = {
    findView: (filePath, jsengineconfig) => {
        return new Promise((resolve, reject) => {
            let fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(jsengineconfig.views, filePath);
            if ("" === path.extname(fullPath)) {
                fullPath = fullPath + ".html";
            }
            if (fs.existsSync(fullPath)) {
                fs.readFile(fullPath, (err, contents) => {
                    if (err) return reject(err);
                    else return resolve(contents.toString());
                });
            } else {
                return resolve(false);
            }
        });
    }
}