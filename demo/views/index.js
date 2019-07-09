module.exports = (html) => ({
  layout: 'layout.js',
  sections: {
    scripts: () => html`
    ${html.insertScript('teste.js')}
    <script>
      console.log('i am an inline script loaded though a section implemented in a view that uses a layout/master view that defines the same section.');
    </script>`,
    styles: () => html.insertStyle('main.css')
  },
  render: function() {
    return html`
  <h1 class="hero">hello world</h1>
  <p>${html.model.message}</p>
  <pre>${this.model.url}</pre>`
  }
})