const should = require('../setup/testSetup');

const CRUD = require('../../helpers/CRUD');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const playersRouter = require('../../routes/playersRoutes')

// Data
const conf = require('../../config/dbconfig_test.json');
const players = require('../fixtures/players.json');

const existingId = 1;
const nonExistingId = 20;

const testTable = 'players';
const testFixture = {
  players: players
};

const newItem = {
  user_id: null,
  player_name: 'Hermann'
}

const updatedItem = {
  player_id: players[0].player_id,
  user_id: 5,
  player_name: players[0].player_name
};

describe('players routes integration tests', function() {
  let app;
  let router;
  let testCRUD;
  let testRouter;

  before(() => {
    testCRUD = new CRUD(conf.username, conf.password, conf.database, conf.host);
    testRouter = new playersRouter(testCRUD);
  })

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());

    testRouter.bindRoutes(app);

    request = supertest(app);

    return testCRUD.dropTables(['players']).then(() => {
      return testCRUD.loadFixtures(testFixture);
    });
  });

  after(() => {
    testCRUD.dropTables(['players']).then(() => {
      testCRUD.end();
    });
  });

  it('POST', function() {
    return request.post('/players')
    .send(newItem)
    .then((response) => {
      response.statusCode.should.equal(201);
      response.body.should.have.a.property('id').that.is.a('number');

      let createdItem = newItem;
      createdItem.player_id = response.body.id;

      return request.get('/players/' + response.body.id)
      .then((getResponse) => {
        getResponse.body.should.eql(createdItem);
      });
    });
  });

  it('GET /players', function() {
    return request.get('/players')
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.be.a('array');
      response.body.should.eql(players);
    });
  });

  it('GET /players/existing', function() {
    return request.get('/players/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.be.a('object');
      response.body.should.eql(players[existingId - 1]);
    });
  });

  it('GET /players/nonExisting', function() {
    return request.get('/players/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;
    });
  });

  it('PATCH /players/existing', function() {
    return request.patch('/players/' + updatedItem.player_id)
    .send(updatedItem)
    .then((patchResponse) => {
      patchResponse.statusCode.should.equal(204);
      patchResponse.body.should.be.empty;

      return request.get('/players/' + updatedItem.player_id)
      .then((getResponse) => {
        getResponse.body.should.eql(updatedItem);
      });
    });
  });

  it('DELETE /players/existing', function() {
    return request.delete('/players/' + players[0].player_id)
    .then((response) => {
      response.statusCode.should.equal(204);
      response.body.should.be.empty;

      return request.get('/players')
      .then((allplayers) => {
        allplayers.body.length.should.equal(players.length - 1);

        return request.get('/players/' + players[0].game_id)
        .then((response) => {
          response.statusCode.should.equal(404);
        });
      });
    });
  });
});
