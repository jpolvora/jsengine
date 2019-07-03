module.exports = function () {
  return this.master('gran_layout', /*html*/`
  
  <head>
    ${this.renderSection('styles')}
  </head>
  <body>
    ${this.renderPartial('menu.js')}
    ${this.renderBody()}
    ${this.renderSection('scripts')}
  </body > 
`)
}