var jsengine = require('./index');

//simulate a request
jsengine.execute(__dirname, 'test.html', { title: 'test', content: 'hello' }, (err, html) => {
    if (err) return console.error(err);
    return console.log(html);
});