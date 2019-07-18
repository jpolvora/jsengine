module.exports = html => ({
  layout: 'gran_layout.js',
  sections: {},
  render: () => html`
    <head>
      ${html.renderSection('styles')}
    </head>

    <body>
      ${html.renderFile('menu.js')} ${html.renderBody()} ${html.renderSection('scripts')}
    </body>
  `
})
