var express = require('express');
var router = express.Router();
var pubsub = require('../pubsub');
var jsengine = require('../../index');
var path = require('path');
var beautify = require('js-beautify').html;

const htmlString = `
<html>
  <body><%$model.message%></body>
</html>
`;

const opts = {
  cache: false,
  views: path.join(__dirname, "../views")
};

const engine = new jsengine(opts);

router.get('/render', function (req, res) {
  let compiledTemplate = new jsengine(opts).compile(htmlString);
  let html = compiledTemplate({ message: 'hello' });
  res.send(beautify(html));
});

//this route must be last inserted because is a catch all.
router.all('/:pathinfo?', async (req, res, next) => {
  const permalink = req.params.pathinfo || "index";
  var p = path.parse(permalink);
  if (p.ext) return next();

  try {
    let html = await engine.expressAsync(permalink, { message: "hello" });
    return res.send(beautify(html));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;