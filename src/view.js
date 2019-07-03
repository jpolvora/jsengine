const path = require('path');

class View {
  constructor(filePath, views, cache, model) {
    this.views = views;
    this.cache = cache;
    this.model = model;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(views, filePath);
    this.fullPath = fullPath;
  }

  loadTemplate(fullFilePath, cache) {
    try {
      if (!cache) delete require.cache[require.resolve(fullFilePath)];
      const fn = require(fullFilePath);
      return fn;
    } catch (error) {
      throw new Error("Error loading file: " + fullFilePath + "\n" + error);
    }
  }

  execute() {
    const entryPoint = this.loadTemplate(this.fullPath, this.cache);
    const result = entryPoint.call(this);
    return result;
  }

  master(layout, body, sections) {
    const MasterView = require('./masterview');
    return new MasterView(layout, this.views, this.cache, this.model, body, sections).execute();
  }

  renderPartial(fileName) {
    return new View(fileName, this.views, this.cache, this.model).execute();
  }
}

module.exports = View;