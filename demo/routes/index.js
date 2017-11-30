var express = require('express');
var router = express.Router();

//this route must be last inserted because is a catch all.
router.all('/:pathinfo?', async (req, res, next) => {
  const permalink = req.params.pathinfo || "/";
  if (permalink == "/") {
    return res.render('index', { title: "Express" });
  }

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