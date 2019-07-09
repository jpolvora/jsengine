module.exports = {
  layout: 'layout.js',
  sections: {
    scripts: ({html}) => html`
    <script>
      console.log('i am an inline script loaded though a section implemented in a view that uses a layout/master view that defines the same section.');
    </script>`
  },
  body: ({html}) => {
    return html`
  <h1 class="hero">hello world</h1>
  <p>${this.message}</p>
  <pre>${this.url}</pre>`
  }
}