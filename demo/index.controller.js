module.exports = {
  get: function (req, res) {
    return res.render('index', {
      message: 'hello from app',
      route: req.originalUrl
    });
  }
}