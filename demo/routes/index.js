var express = require('express');
var router = express.Router();
var pubsub = require('../pubsub');
var jsengine = require('../../index')({});
var path = require('path');

const template = `
<html>
  <body><%$model.test%></body>
</html>
`;

router.get('/render', function (req, res) {
  let compiledTemplate = jsengine.compile(template);
  let html = jsengine.render(compiledTemplate, { test: 'hello' });
  res.send(html);
});

//this route must be last inserted because is a catch all.
router.all('/:pathinfo?', async (req, res, next) => {
  const permalink = req.params.pathinfo || "/";
  var p = path.parse(permalink);
  if (p.ext) return next();

  if (permalink == "/") {
    return res.render('index', { title: "Express" });
  }
  //pubsub.emit('filechanged', permalink);

  //use a fake physical file to satisfy engine express.
  //the template engine will search for the view path "permalink"
  return res.render('page', {
    title: 'a dynamic page: ' + permalink,
    permalink: permalink,
    req: req,
    res: res
  });
});

module.exports = router;