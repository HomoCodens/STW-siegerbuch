const should = require('../setup/testSetup');

const CRUD = require('../../helpers/CRUD');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const gamesRouter = require('../../routes/gamesRoutes')

// Data
const conf = require('../../config/dbconfig_test.json');
const games = require('../fixtures/games.json');

const existingId = 1;
const nonExistingId = 20;

const testTable = 'games';
const testFixture = {
  games: games
};

const newItem = {
    game_name: 'The Rise of Queensdale',
    bgg_id: 238546,
    thumbnail_url: null,
    is_coop: 0
};

const updatedItem = {
  game_id: 2,
  game_name: 'Banananza',
  bgg_id: games[1].bgg_id,
  thumbnail_url: games[1].thumbnail_url,
  is_coop: games[1].is_coop
};

describe('games routes integration tests', function() {
  let app;
  let router;
  let testCRUD;
  let testRouter;

  before(() => {
    testCRUD = new CRUD(conf.username, conf.password, conf.database, conf.host);
    testRouter = new gamesRouter(testCRUD);
  })

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());

    testRouter.bindRoutes(app);

    request = supertest(app);

    return testCRUD.dropTables(['games']).then(() => {
      return testCRUD.loadFixtures(testFixture);
    });
  });

  after(() => {
    testCRUD.dropTables(['games']).then(() => {
      testCRUD.end();
    });
  });

  it('POST', function() {
    return request.post('/games/')
    .send(newItem)
    .then((response) => {
      response.statusCode.should.equal(201);
      response.body.should.have.a.property('id').that.is.a('number');

      let createdItem = newItem;
      createdItem.game_id = response.body.id;

      return request.get('/games/' + response.body.id)
      .then((getResponse) => {
        getResponse.body.should.eql(createdItem);
      });
    });
  });

  it('GET /games', function() {
    return request.get('/games')
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.be.a('array');
      response.body.should.eql(games);
    });
  });

  it('GET /games/existing', function() {
    return request.get('/games/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(200);

      response.body.should.be.a('object');
      response.body.should.eql(games[existingId - 1]);
    });
  });

  it('GET /games/nonExisting', function() {
    return request.get('/games/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;
    });
  });

  it('PATCH /games/existing', function() {
    return request.patch('/games/' + updatedItem.game_id)
    .send(updatedItem)
    .then((patchResponse) => {
      patchResponse.statusCode.should.equal(204);
      patchResponse.body.should.be.empty;

      return request.get('/games/' + updatedItem.game_id)
      .then((getResponse) => {
        getResponse.body.should.eql(updatedItem);
      });
    });
  });

  it('DELETE /games/existing', function() {
    return request.delete('/games/' + games[0].game_id)
    .then((response) => {
      response.statusCode.should.equal(204);
      response.body.should.be.empty;

      return request.get('/games')
      .then((allgames) => {
        allgames.body.length.should.equal(games.length - 1);

        return request.get('/games/' + games[0].game_id)
        .then((response) => {
          response.statusCode.should.equal(404);
        });
      });
    });
  });
});
