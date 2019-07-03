module.exports = function () {
  return this.master('layout.js', /*html*/
    `
    <h1 class="hero">hello world</h1>
    <p>${this.model.message}</p>
    <pre>${this.model.url}</pre>`, {
      scripts: /*html*/`
      <script>
        console.log('i am an inline script loaded from a section')
      </script>
      `
    })
}