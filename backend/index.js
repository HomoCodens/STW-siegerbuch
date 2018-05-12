const express = require('express');
var app = express();

const bindGames = require('./routes/games');

app.get('/', function (req, res) {
  res.send('hello world')
});

bindGames(app);

app.listen(3000, () => console.log('Example app listening on port 3000!'))
