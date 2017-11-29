var express = require('express');
var router = express.Router();

router.get('/:permalink?', async (req, res, next) => {
    //verificar o nome do arquivo
    const permalink = req.params.permalink || "/index";

    return res.render('page', { dynamic: true, pretty: true, permalink: permalink, req: req, res: res });
});

module.exports = router;