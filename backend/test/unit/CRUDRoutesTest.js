require('../setup/testSetup');

const supertest = require('supertest');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');

const games = require('../fixtures/games.json').map((o) => {
  return {
    game_name: o.game_name,
    bgg_id: o.bgg_id,
    thumbnail_url: o.thumbnail_url
  }
});

const CRUDRouter = require('../../routes/CRUDRouter');

const existingId = 1;
const nonExistingId = 2;
const newId = 3;
const evilId = 666;

var fakeCreate = sinon.stub();
fakeCreate.withArgs('games', sinon.match({game_name: games[0].game_name})).resolves({insertId: newId});
fakeCreate.withArgs('games', games[1]).throws({code: 'ER_DUP_ENTRY'});

var fakeRead = sinon.stub();
fakeRead.withArgs('games').resolves(games);
fakeRead.withArgs('games', {game_id: existingId}).resolves(games[0]);
fakeRead.withArgs('games', {game_id: nonExistingId}).resolves([]);
fakeRead.withArgs('games', {game_id: evilId}).throws('Braaaaains');

var fakeUpdate = sinon.stub();
fakeUpdate.withArgs('games', {game_id: existingId}).resolves({changedRows: 1});
fakeUpdate.withArgs('games', {game_id: nonExistingId}).resolves({changedRows: 0});

var fakeDelete = sinon.stub();
fakeDelete.withArgs('games', {game_id: existingId}).resolves();
fakeDelete.withArgs('games', {game_id: nonExistingId}).resolves();

var fakeCRUD = {
  create: fakeCreate,
  read: fakeRead,
  update: fakeUpdate,
  delete: fakeDelete
};

const router = new CRUDRouter(fakeCRUD, 'games', 'game_id', ['game_name', 'bgg_id', 'thumbnail_url']);

router.router.get('/test', (req, res) => {
  res.send('Results');
});

router.router.get('/allthegames', (req, res) => {
  router.read().then((records) => {
    res.json(records);
  });
});

describe('/games routes', function() {
  var app;
  var request;

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());

    router.bindRoutes(app);

    request = supertest(app);

    fakeCRUD.create.resetHistory();
    fakeCRUD.read.resetHistory();
    fakeCRUD.update.resetHistory();
    fakeCRUD.delete.resetHistory();
  });

  /****************************************
  * CREATE tests
  ****************************************/
  it('POST /games', function() {
    request.post('/games')
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(201);

      response.body.should.eql({id: newId});

      response.headers.should.have.property('location');
      response.headers.location.should.equal('/games/' + newId);

      fakeCRUD.create.calledOnce.should.be.true;
      fakeCRUD.create.calledWith('games', games[0]).should.be.true;
    });
  });

  it('POST duplicate /games', function() {
    request.post('/games')
    .send(games[1])
    .then((response) => {
      response.statusCode.should.equal(409);

      response.headers.should.not.have.property('location');

      response.body.should.eql({error: 'Duplicate entry!'});

      fakeCRUD.create.calledOnce.should.be.true;
      fakeCRUD.create.calledWith('games', games[1]).should.be.true;
    });
  });

  it('POST empty /games', function() {
    request.post('/games')
    .then((response) => {
      response.statusCode.should.equal(400);

      response.headers.should.not.have.property('location');

      response.body.should.be.empty;

      fakeCRUD.create.notCalled.should.be.true;
    });
  });

  /****************************************
  * READ tests
  ****************************************/
  it('GET /games', function() {
    request.get('/games')
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.eql(games);

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games').should.be.true;
    });
  });

  it('GET /games/existing', function() {
    request.get('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.eql(games[0]);

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games', {game_id: existingId}).should.be.true;
    });
  });

  it('GET /games/nonexisting', function() {
    request.get('/games/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games', {game_id: nonExistingId}).should.be.true;
    });
  });

  it('GET /games/NaN', function() {
    request.get('/games/baNaNas')
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;

      fakeCRUD.read.notCalled.should.be.true;
    });
  });

  /****************************************
  * UPDATE tests
  ****************************************/
  it('PATCH /games/existing', function() {
    request.patch('/games/' + existingId)
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(204);

      response.body.should.be.empty;

      fakeCRUD.update.calledOnce.should.be.true;
      fakeCRUD.update.calledWith('games', {game_id: existingId}, games[0]).should.be.true;
    });
  });

  it('PATCH /games/nonexisting', function() {
    request.patch('/games/' + nonExistingId)
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;

      fakeCRUD.update.calledOnce.should.be.true;
      fakeCRUD.update.calledWith('games', {game_id: nonExistingId}, games[0]).should.be.true;
    });
  });

  it('PATCH empty /games', function() {
    request.patch('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(400);

      response.body.should.be.empty;

      fakeCRUD.create.notCalled.should.be.true;
    });
  });

  /****************************************
  * DELETE tests
  ****************************************/
  it('DELETE /games/existing', function() {
    request.delete('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(204);

      response.body.should.be.empty;

      fakeCRUD.delete.calledOnce.should.be.true;
      fakeCRUD.delete.calledWith('games', {game_id: existingId}).should.be.true;
    });
  });

  it('DELETE /games/nonexisting', function() {
    request.delete('/games/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(204);

      response.body.should.be.empty;

      fakeCRUD.delete.calledOnce.should.be.true;
      fakeCRUD.delete.calledWith('games', {game_id: nonExistingId}).should.be.true;
    });
  });

  /****************************************
  * misc tests
  ****************************************/
  it('error middleware', function() {
    request.get('/games/' + evilId)
    .then((response) => {
      response.statusCode.should.equal(500);

      response.body.should.be.empty;

      fakeCRUD.read.calledOnce.should.be.true;
    });
  });

  it('strips out illegal fields', function() {
    var data = games[0];
    data.illegalField = 'Evil stuff & hackling';

    request.post('/games')
    .send(data)
    .then((response) => {
      response.body.should.have.property('id').that.is.a('number');

      fakeCRUD.create.calledWith('games', sinon.match((x) => !x.illegalField)).should.be.true;
    });
  });

  it('is expandable', function() {
    request.get('/games/test')
    .then((response) => {
      response.statusCode.should.equal(200);
      response.text.should.equal('Results');
    });
  });

  it('is expandable with CRUDHandler methods', function() {
    request.get('/games/allthegames')
    .then((response) => {
      response.statusCode.should.equal(200);
      response.body.should.eql(games);
    });
  });
});
