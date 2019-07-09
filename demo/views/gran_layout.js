module.exports = (html) => ({
  render: () => html`
<html lang="pt-BR">
${html.renderBody()}

</html>`

})