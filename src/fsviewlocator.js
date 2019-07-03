/** @format */

const fs = require('fs'),
  path = require('path'),
  util = require('util'),
  readFile = util.promisify(fs.readFile)

class FsViewLocator {
  constructor(logger, viewsPath) {
    this.logger = logger;
  }

  async findView(fullPath) {
    try {
      const contents = await readFile(fullPath);
      return contents.toString();
    } catch (error) {
      this.logger(error);
      return false;
    }
  }
}

module.exports = FsViewLocator;
