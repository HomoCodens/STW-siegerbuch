require('../setup/testSetup');

const proxyquire = require('proxyquire').noCallThru();
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

var crud = require('../../db/CRUDHandler');

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

var router = proxyquire('../../routes/games', {
  '../db/CRUDHandler': fakeCRUD
});

describe('/games routes', function() {
  var app;
  var request;

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());
    router(app);

    request = supertest(app);

    fakeCRUD.create.resetHistory();
    fakeCRUD.read.resetHistory();
    fakeCRUD.update.resetHistory();
    fakeCRUD.delete.resetHistory();
  });

  after(() => {
    crud.end();
  });

  /****************************************
  * CREATE tests
  ****************************************/
  it('POST /games', function() {
    return request.post('/games')
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(201);

      response.body.should.eql({game_id: newId});

      response.headers.should.have.property('location');
      response.headers.location.should.equal('/games/' + newId);

      fakeCRUD.create.calledOnce.should.be.true;
      fakeCRUD.create.calledWith('games', games[0]).should.be.true;
    });
  });

  it('POST duplicate /games', function() {
    return request.post('/games')
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
    return request.post('/games')
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
    return request.get('/games')
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.eql(games);

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games').should.be.true;
    });
  });

  it('GET /games/existing', function() {
    return request.get('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.eql(games[0]);

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games', {game_id: existingId}).should.be.true;
    });
  });

  it('GET /games/nonexisting', function() {
    return request.get('/games/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;

      fakeCRUD.read.calledOnce.should.be.true;
      fakeCRUD.read.calledWith('games', {game_id: nonExistingId}).should.be.true;
    });
  });

  it('GET /games/NaN', function() {
    return request.get('/games/baNaNas')
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
    return request.patch('/games/' + existingId)
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(204);

      response.body.should.be.empty;

      fakeCRUD.update.calledOnce.should.be.true;
      fakeCRUD.update.calledWith('games', {game_id: existingId}, games[0]).should.be.true;
    });
  });

  it('PATCH /games/nonexisting', function() {
    return request.patch('/games/' + nonExistingId)
    .send(games[0])
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;

      fakeCRUD.update.calledOnce.should.be.true;
      fakeCRUD.update.calledWith('games', {game_id: nonExistingId}, games[0]).should.be.true;
    });
  });

  it('PATCH empty /games', function() {
    return request.patch('/games/' + existingId)
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
    return request.delete('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(204);

      response.body.should.be.empty;

      fakeCRUD.delete.calledOnce.should.be.true;
      fakeCRUD.delete.calledWith('games', {game_id: existingId}).should.be.true;
    });
  });

  it('DELETE /games/nonexisting', function() {
    return request.delete('/games/' + nonExistingId)
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
    return request.get('/games/' + evilId)
    .then((response) => {
      response.statusCode.should.equal(500);

      response.body.should.be.empty;

      fakeCRUD.read.calledOnce.should.be.true;
    });
  });

  it('strips out illegal fields', function() {
    var data = games[0];
    data.illegalField = 'Evil stuff & hackling';

    return request.post('/games')
    .send(data)
    .then((response) => {
      response.body.should.have.property('game_id').that.is.a('number');

      fakeCRUD.create.calledWith('games', sinon.match((x) => !x.illegalField)).should.be.true;
    });
  });
});
