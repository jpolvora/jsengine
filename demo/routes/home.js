module.exports = function (req, res) {
  return res.render('index', {
    message: 'hello from app',
    url: req.originalUrl,
    repeat: 50
  })
}
