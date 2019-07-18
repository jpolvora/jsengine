# jsengine

The fastest template engine for `Node` / `Express`

This engine provides a foundation for rendering es6 template literal strings.

Inspired in Razor View Engine from @Microsoft for ASP. NET/MVC

Included features are:

* Master Pages / Layout Pages / Parent Pages
* Partial Sections
* Insert Files
* Multiple

There are no compilation steps, the templates are pure commonJs modules that are required by Node Require.

In order to turn development easy, you can install a syntax highliter based on lit-html.

I'm using VS Code, so I can recommend https://github.com/mjbvz/vscode-lit-html

### Installation

 `npm i jpolvora/jsengine`

Please check the demo project  in `./demo` folder

# How it works

By defining a cjs module, the JsEngine will require, load and parse it.

Then will inject some helpers and orchestrate the rendering process.

There are some rules to follow. The rules are nearly the same of Razor.

* A template may reference a master page (parent). In this case, will load the referenced master.js module and render it.

* A master page cannot be rendered directly without a child template. The chld template must refers to the parent template.

* A master page may define sections (optionally) that the child templates can override content.

# Example
## Defining a content page (template)

In order to define a template, the module must exports a function that returns something to be rendered.

The module exported function will receive a parameter `html` which you can access the `model`, helpers, etc.

In order to reference a master page, the module must exports a function that returns an object containing properties and methods:

`layout:String`
`render:Function`

```js
/*
** index.js
*/
module.exports = (html) => ({
  layout: 'master.js', //referencing the master page
  render: () => html`
  <div class="container">
    <h2>I'm the content page.</h2>
    <p>${html.model.message}</p>
  </div>
`})

```
### Defining the master page
The master page doesn't need to export an object, but it's required call the function `renderBody` which will render the child template.

```js
/*
** master.js
*/
module.exports = (html) => html`
<html>
  <head>
  <title>Title: ${html.model.title}</title>
  </head>
  <body>
    <!-- the child template will be rendered below -->
    <h1>I'm the master page.</h1>
    ${html.renderBody()}
    <footer>
      <p>I'm the footer.</p>
    </footer>
  </body>
</html>
`
```

### Defining sections
The master page can define sections in the template, so the child template can override it or not.

```js
<div class="header">
  ${html.renderSection('section-name')}
</div>
```

The child template can override that section if wants by providing a property named `sections` which must be an object with properties named according to the section name it wants to override:

```js
module.exports = (html) => ({
  layout: 'master.js',
  sections: {
    'section-name': () => html`<p>this is the section content that will be rendered by the master page</p>`,
    'another-section': () => html`<span>This section has no definition in the master page, so it will be ignored</span>`
  }
  render: () => html`
  ...
  `
})
```