var fs = require('fs');
var path = require('path');

//FileSystemViewLocator
module.exports = {
    findView: (filePath, options) => {
        return new Promise((resolve, reject) => {
            var fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(options.settings.views, filePath);
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