const View = require('./view');

class MasterView extends View {
  constructor(filePath, views, cache, model, body, sections) {
    super(filePath, views, cache, model);
    this.body = body || "";
    this.sections = sections || {}
  }

  renderBody() {
    return this.body;
  }

  renderSection(name, def) {
    if (!this.sections) return '';
    if (this.sections.hasOwnProperty(name)) {
      const section = this.sections[name];
      return section;
    }
    return def || "";
  }
}

module.exports = MasterView;