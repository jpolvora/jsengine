module.exports = {
  layout: 'gran_layout.js',
  sections: {},
  body: ({html, renderSection, renderFile, renderBody}) => html`
  <head>
    ${renderSection('styles')}
  </head>
  
  <body>
    ${renderFile('menu.js')}
    ${renderBody()}
    ${renderSection('scripts')}
  </body>`
}