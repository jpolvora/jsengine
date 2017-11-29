var fs = require('fs');
//FileSystemViewLocator
module.exports = {
    findView: (filePath) => {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(filePath)) {
                fs.readFile(filePath, (err, contents) => {
                    if (err) return reject(err);
                    else return resolve(contents.toString());
                });
            } else {
                return resolve(false);
            }
        });
    }
}