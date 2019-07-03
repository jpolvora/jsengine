module.exports = function (html) {

  return this.master('layout.js', html`
  ${Array(100).fill().map((_, i) => html`
  <h1 class="hero">hello world</h1>
  <p>${this.model.message}</p>
  <pre>${this.model.url}</pre>
  <span>${i}</span>
  `).join('')}
  <ul>
    ${this.repeat(100, (i) => html`<li>${i}</li>`)}
  </ul>
  <ul>
    ${this.forEach(this.model.message, (el, i) => html`<li>${i}=${el}</li>`)}
  </ul>
    `, {
      scripts: html`
    <script>
      console.log('i am an inline script loaded from a section');
    </script>
    `
    });
}