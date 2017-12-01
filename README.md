# jsengine
Super lightweight javascript template engine based on .NET Razor View/Template Engine.

### Installation
```
npm install --save jpolvora/jsengine
```
See the /demo folder for an express app running. Specially the configuration in `app.js` and the views folder for layout structure. The application was generated by the express generator, configured to run `jsengine`.

### Docs: coming soon

# Example
```js
const jsengine = require('jsengine')({ /*options*/});

const template = `
<html>
  <body><%$model.message%></body>
</html>
`;

let compiledTemplate = jsengine.compile(template);
let html = compiledTemplate({ message: 'hello world!' });
console.log(html);
```

# The basics
JsEngine is based on layout structure of .NET Razor View Engine. If you ever has worked with Razor Pages, you are already familiar with `@Layout="_Layout.cshtml"`, `@RenderSection("sectionanme")`, `@RenderPartial("partial-page")` and so on.

The difference is that in this engine you must use HTML comments to insert layout directives. The directive syntax is:
```html
<!--directive:parameter1:parameter2-->
```

# Directives
`<!--renderbody-->` is a special directive used in layout pages (master pages) as a placeholder for the current page content.

`layout.html`
```html
<html>
    <body>
    <h1>Hello, I'm the masterpage.</h1>
    <!--renderbody-->
    </body>
</html>
```
From content pages you will use the `<!--layout:/path/to/layout-->` directive  at first line. The parameter after `:` is the filename that the page will use as the master page. The syntax is:
```html 
<!--layout:/path/to/filename-->
```
`index.html`
```html
<!--layout:layout.html-->
<div>
    <p>Hello, I'm the content page.</p>
</div>
```

The **rendersection** directive
This will be used when you have a section in layout page with a default content but the content page can override this content.
Syntax:
```html
<!--rendersection:section-name:default-file.html-->
```

Then you can use optionally in content pages the **section** directive in order to override

The **section** directive
This directive can be used to override an existing *rendersection* directive in the layout definition.
```html
<!--section:section-name:override-file.html-->
```

The **renderpartial** directive
This directive will work just like an include: Will insert the content of an external html file into current position.
```html
<!--renderpartial:partial-filename.html-->
```
The template engine after all will concatenate all pieces of files at once and then it will be ready for the parser gues why, parse the Javascript syntax.

## Javascript syntax for the template engine
This template engine use `<%` to start blocks of javascript code and `%>` to end. At the end, it's like PHP blocks (opening and closing brackets )
```html
<%if (someProperty) { %>
    <div class="some-class">Some content <% someProperty %></div>
<% } %>
```