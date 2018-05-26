const should = require('../setup/testSetup');

const CRUD = require('../../helpers/CRUD');
const supertest = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const playsRouter = require('../../routes/playsRoutes')

// Data
const conf = require('../../config/dbconfig_test.json');
const games = require('../fixtures/games.json');
const players = require('../fixtures/players.json');
const plays_appside = require('../fixtures/plays.json');

const existingId = 1;
const nonExistingId = 20;

// Split plays into two tables: plays and scores
var plays_dbside = {};
plays_dbside.plays = plays_appside.map((p) => {
    return (({play_id, game_id, played_at, comment}) => ({play_id, game_id, played_at, comment}))(p);
});

plays_dbside.scores = plays_appside.map((play) => {
  return play.players.map((player, i) => {
    return {
      play_id: play.play_id,
      player_id: player,
      score: play.scores[i]
    }
  });
}).reduce((acc, val) => [...acc, ...val]);

const testTable = 'plays';
const testFixture = {
  games: games,
  players: players,
  plays: plays_dbside.plays,
  scores: plays_dbside.scores
};

const newItem =   {
    game_id: 2,
    played_at: '2018-07-26T21:12:12.000Z',
    players: [1, 2, 3],
    scores: [23, 23, 34],
    comment: 'Unglaublich, genau die gleichen Punkte!!!1'
};

const updatedItem = {
  play_id: plays_appside[0].play_id,
  game_id: plays_appside[0].game_id,
  played_at: plays_appside[0].played_at,
  players: plays_appside[0].players,
  scores: [1, 2, 3],
  comment: 'Stellt sich heraus, dass Jakub beschissen hat...'
};

const comparePlays = (actual, expected) => {
  actual.play_id.should.equal(expected.play_id);
  actual.game_id.should.equal(expected.game_id);
  actual.played_at.should.equal(expected.played_at);
  if(actual.comment) {
    actual.comment.should.equal(expected.comment);
  } else {
    should.equal(expected.comment, null);
  }
  actual.players.should.have.members(expected.players);
  actual.scores.should.have.members(expected.scores);
}

describe('plays routes integration tests', function() {
  let app;
  let router;
  let testCRUD;
  let testRouter;

  before(() => {
    testCRUD = new CRUD(conf.username, conf.password, conf.database, conf.host);
    testRouter = new playsRouter(testCRUD);
  })

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());

    testRouter.bindRoutes(app);

    request = supertest(app);

    return testCRUD.dropTables(['scores', 'plays', 'players', 'games']).then(() => {
      return testCRUD.loadFixtures(testFixture);
    });
  });

  after(() => {
    testCRUD.dropTables(['scores', 'plays', 'players', 'games']).then(() => {
      testCRUD.end();
    });
  });

  it('POST', function() {
    return request.post('/plays/')
    .send(newItem)
    .then((response) => {
      response.statusCode.should.equal(201);
      response.body.should.have.a.property('id').that.is.a('number');

      let createdItem = newItem;
      createdItem.play_id = response.body.id;

      return request.get('/plays/' + response.body.id)
      .then((getResponse) => {
        getResponse.body.should.eql(createdItem);
      });
    });
  });

  it('GET /plays', function() {
    return request.get('/plays')
    .then((response) => {
      response.statusCode.should.equal(200);

      // Spin own deep equal since array order may not match
      response.body.map((r, i) => {
        comparePlays(r, plays_appside[i]);
      });
    });
  });

  it('GET /plays/existing', function() {
    return request.get('/plays/' + existingId)
    .then((response) => {
      response.statusCode.should.equal(200);

      comparePlays(response.body, plays_appside[existingId - 1]);
    });
  });

  it('GET /plays/nonExisting', function() {
    return request.get('/plays/' + nonExistingId)
    .then((response) => {
      response.statusCode.should.equal(404);

      response.body.should.be.empty;
    });
  });

  it('PATCH /plays/existing', function() {
    return request.patch('/plays/' + updatedItem.play_id)
    .send(updatedItem)
    .then((patchResponse) => {
      patchResponse.statusCode.should.equal(204);
      patchResponse.body.should.be.empty;

      return request.get('/plays/' + updatedItem.play_id)
      .then((getResponse) => {
        getResponse.body.should.eql(updatedItem);
      });
    });
  });

  it('DELETE /plays/existing', function() {
    return request.delete('/plays/' + plays_appside[0].play_id)
    .then((response) => {
      response.statusCode.should.equal(204);
      response.body.should.be.empty;

      return request.get('/plays/')
      .then((allPlays) => {
        allPlays.body.length.should.equal(plays_appside.length - 1);
      });
    });
  });
});
