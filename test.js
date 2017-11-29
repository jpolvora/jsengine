var jsengine = require('./index');

jsengine.configure({
    basePath: __dirname
});

//simulate a request
jsengine.execute('test.html', { title: 'test', content: 'hello' }, (err, html) => {
    if (err) return console.error(err);
    return console.log(html);
});