const path = require('path');

class View {
  constructor(filePath, views, cache, model) {
    this.views = views;
    this.cache = cache;
    this.model = model;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(views, filePath);
    this.fullPath = fullPath;
  }

  loadTemplate(fullFilePath) {
    try {
      if (!this.cache) delete require.cache[require.resolve(fullFilePath)];
      const fn = require(fullFilePath);
      return fn;
    } catch (error) {
      throw new Error("Error loading file: " + fullFilePath + "\n" + error);
    }
  }

  html(strings, ...values) {
    let str = '';
    strings.forEach((string, i) => {
      str += string + (values[i] || '');
    });
    return str;
  }

  execute() {
    const entryPoint = this.loadTemplate(this.fullPath);
    const result = entryPoint.call(this, this.html);
    return result;
  }

  master(layout, body, sections) {
    const MasterView = require('./masterview');
    return new MasterView(layout, this.views, this.cache, this.model, body, sections).execute();
  }

  renderPartial(fileName) {
    return new View(fileName, this.views, this.cache, this.model).execute();
  }

  repeat(count, callback) {
    let str = '';
    for (let i = 0; i < count; i++) {
      str += callback(i) || "0";
    }

    return str;
  }

  forEach(iterable, callback) {
    let str = '';
    for (let i = 0; i < iterable.length; i++) {
      const element = iterable[i];
      str += callback(element, i || 0) || "";
    }

    return str;
  }
}

module.exports = View;