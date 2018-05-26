require('../setup/testSetup');

const supertest = require('supertest');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');

const playsRouter = require('../../routes/playsRoutes');

const plays = require('../fixtures/plays.json');
const playsServerside = plays.map((p) => {
  let cleaned = (({ game_id, played_at, comment }) => (
    { game_id, played_at, comment }
  ))(p);
  // Because the field stripper completely leaves out nulls
  if(!cleaned.comment) {
    delete cleaned.comment;
  }
  return cleaned;
});

const playsDBSide = plays.map((p) => {
  const { play_id, game_id, played_at, comment } = p;
  return {
    play_id,
    game_id,
    played_at,
    comment,
    players: p.players.join(','),
    scores: p.scores.join(',')
  }
});

const existingId = 1;
const nonExistingId = 2;
const newId = 3;
const evilId = 4;

const scoresInsertServerside = plays.map(
  (play) => play.players.map(
    (playerId, i) => [newId, playerId, play.scores[i]]
  )
);

const fakeDBConnection = 'Haaaay, I am a connection don\'tcha know!';

describe('plays routes', function() {
  var app;
  var request;
  var fakeCRUD;
  var router;

  beforeEach(() => {
    fakeCRUD = {
      create: sinon.stub().resolves({ insertId: newId }),
      read: sinon.stub().resolves(playsDBSide),
      update: sinon.stub().resolves({ changedRows: 1 }),
      delete: sinon.stub().resolves({ affectedRows: 1 }),
      query: sinon.stub().resolves({}),
      beginTransaction: sinon.stub().resolves(fakeDBConnection),
      commit: sinon.stub().resolves(),
      rollback: sinon.stub().resolves()
    };

    router = new playsRouter(fakeCRUD);

    app = express();

    app.use(bodyParser.json());

    router.bindRoutes(app);

    request = supertest(app);
  });

  /****************************************
  * CREATE tests
  ****************************************/
  describe('CREATE', function() {
    it('POST /plays', function() {
      fakeCRUD.create = sinon.stub().resolves({insertId: newId});

      return request.post('/plays')
      .send(plays[0])
      .then((response) => {
        response.statusCode.should.equal(201);

        response.body.should.eql({id: newId});

        response.headers.should.have.property('location');
        response.headers.location.should.equal('/plays/' + newId);

        fakeCRUD.beginTransaction.calledOnce.should.be.true;

        fakeCRUD.create.calledOnce.should.be.true;
        fakeCRUD.create.calledWith(
          'plays',
          playsServerside[0],
          fakeDBConnection
        ).should.be.true;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.query.calledWith(
          'INSERT INTO scores (play_id, player_id, score) VALUES ?',
          [scoresInsertServerside[0]],
          fakeDBConnection
        ).should.be.true;

        fakeCRUD.commit.calledOnce.should.be.true;
        fakeCRUD.commit.calledWith(fakeDBConnection).should.be.true;

        fakeCRUD.rollback.notCalled.should.be.true;
      });
    });

    it('POST duplicate /plays', function() {
      fakeCRUD.create = sinon.stub().rejects({code: 'ER_DUP_ENTRY'});

      return request.post('/plays')
      .send(plays[1])
      .then((response) => {
        response.statusCode.should.equal(409);

        response.headers.should.not.have.property('location');

        response.body.should.eql({error: 'Duplicate entry!'});

        fakeCRUD.create.calledOnce.should.be.true;
        fakeCRUD.create.calledWith(
          'plays',
          playsServerside[1],
          fakeDBConnection
        ).should.be.true;

        fakeCRUD.query.notCalled.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('POST empty /plays', function() {
      return request.post('/plays')
      .then((response) => {
        response.statusCode.should.equal(400);

        response.headers.should.not.have.property('location');

        response.body.should.be.empty;

        fakeCRUD.create.notCalled.should.be.true;
      });
    });

    it('POST with error on create', function() {
      fakeCRUD.create = sinon.stub().rejects();

      return request.post('/plays')
      .send(plays[evilId])
      .then((response) => {
        response.statusCode.should.equal(500);

        fakeCRUD.create.calledOnce.should.be.true;
        fakeCRUD.query.notCalled.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('POST with error on scores', function() {
      fakeCRUD.query = sinon.stub().rejects();

      return request.post('/plays')
      .send(plays[evilId])
      .then((response) => {
        response.statusCode.should.equal(500);

        fakeCRUD.create.calledOnce.should.be.true;
        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('POST with error on commit', function() {
      fakeCRUD.commit = sinon.stub().rejects();

      return request.post('/plays')
      .send(plays[evilId])
      .then((response) => {
          response.statusCode.should.equal(500);

          fakeCRUD.create.calledOnce.should.be.true;
          fakeCRUD.query.calledOnce.should.be.true;
          fakeCRUD.rollback.calledOnce.should.be.true;
          fakeCRUD.commit.calledOnce.should.be.true;
      });
    });
  });

  /****************************************
  * READ tests
  ****************************************/
  describe('READ', function() {
    it('GET /plays', function() {
      fakeCRUD.query = sinon.stub().resolves(playsDBSide);

      return request.get('/plays')
      .then((response) => {
        response.statusCode.should.equal(200);

        response.body.should.eql(plays);

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.query.calledWith('SELECT * FROM plays LEFT JOIN (SELECT GROUP_CONCAT(player_id) as players, GROUP_CONCAT(score) as scores, play_id FROM scores GROUP BY play_id)scores ON scores.play_id = plays.play_id').should.be.true;
      });
    });

    it('GET /plays/existing', function() {
      fakeCRUD.query = sinon.stub().resolves([playsDBSide[existingId]]);

      return request.get('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(200);

        response.body.should.eql(plays[existingId]);

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.query.calledWith('SELECT * FROM plays LEFT JOIN (SELECT GROUP_CONCAT(player_id) as players, GROUP_CONCAT(score) as scores, play_id FROM scores GROUP BY play_id)scores ON scores.play_id = plays.play_id WHERE plays.play_id = ?', [existingId]).should.be.true;
      });
    });

    it('GET /plays/nonexisting', function() {
      fakeCRUD.query = sinon.stub().resolves([]);

      return request.get('/plays/' + nonExistingId)
      .then((response) => {
        response.statusCode.should.equal(404);

        response.body.should.be.empty;
      });
    });

    it('GET /plays with error', function() {
      fakeCRUD.query = sinon.stub().rejects();

      return request.get('/plays')
      .then((response) => {
        response.statusCode.should.equal(500);

        response.body.should.be.empty;
      })
    });

    it('GET /plays/id with error', function() {
      fakeCRUD.query = sinon.stub().rejects();

      return request.get('/plays/0')
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;
      });
    });
  });

  /****************************************
  * UPDATE tests
  ****************************************/
  describe('UPDATE', function() {
    it('PATCH /plays/existing', function() {
      const thePlay = plays[existingId];

      return request.patch('/plays/' + existingId)
      .send(thePlay)
      .then((response) => {
        response.statusCode.should.equal(204);

        response.body.should.be.empty;

        fakeCRUD.beginTransaction.calledOnce.should.be.true;

        fakeCRUD.update.calledOnce.should.be.true;
        fakeCRUD.update.lastCall.args.should.eql([
          'plays', { play_id: existingId },
          playsServerside[existingId],
          fakeDBConnection]
        );

        fakeCRUD.query.calledTwice.should.be.true;
        for(let i = 0; i < plays[existingId].players.length; i++) {
          fakeCRUD.query.calledWith(
            'UPDATE scores SET score = ? WHERE player_id = ?',
            [thePlay.scores[i], thePlay.players[i]],
            fakeDBConnection).should.be.true;
        }

        fakeCRUD.commit.calledOnce.should.be.true;
        fakeCRUD.commit.lastCall.args[0].should.equal(fakeDBConnection);
      });
    });

    it('PATCH /plays/nonexisting', function() {
      fakeCRUD.update = sinon.stub().resolves({ affectedRows: 0 });

      return request.patch('/plays/' + nonExistingId)
      .send(plays[0])
      .then((response) => {
        response.statusCode.should.equal(404);

        response.body.should.be.empty;

        fakeCRUD.update.calledOnce.should.be.true;
        fakeCRUD.update.calledWith(
          'plays',
          { play_id: nonExistingId },
          playsServerside[0]
        ).should.be.true;

        fakeCRUD.query.notCalled.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('PATCH empty /plays', function() {
      return request.patch('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(400);

        response.body.should.be.empty;

        fakeCRUD.update.notCalled.should.be.true;
      });
    });

    it('PATCH with error on update', function() {
      fakeCRUD.update = sinon.stub().rejects();

      return request.patch('/plays/' + existingId)
      .send(plays[existingId])
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.update.calledOnce.should.be.true;
        fakeCRUD.query.notCalled.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('PATCH with error on query', function() {
      fakeCRUD.query = sinon.stub().rejects();

      return request.patch('/plays/' + existingId)
      .send(plays[existingId])
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.update.calledOnce.should.be.true;
        fakeCRUD.query.calledTwice.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('PATCH with error on commit', function() {
      fakeCRUD.commit = sinon.stub().rejects();

      return request.patch('/plays/' + existingId)
      .send(plays[existingId])
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.update.calledOnce.should.be.true;
        fakeCRUD.query.calledTwice.should.be.true;
        fakeCRUD.commit.calledOnce.should.be.true;
        fakeCRUD.commit.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
      });
    });
  });

  /****************************************
  * DELETE tests
  ****************************************/
  describe('DELETE', function() {
    it('DELETE /plays/existing', function() {
      return request.delete('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(204);

        response.body.should.be.empty;

        fakeCRUD.beginTransaction.calledOnce.should.be.true;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.query.calledWith(
          'DELETE FROM scores WHERE play_id = ?',
          [existingId],
          fakeDBConnection
        ).should.be.true;

        fakeCRUD.delete.calledOnce.should.be.true;
        fakeCRUD.delete.calledWith(
          'plays',
          {play_id: existingId}
        ).should.be.true;

        fakeCRUD.commit.calledOnce.should.be.true;
        fakeCRUD.commit.calledWith(fakeDBConnection).should.be.true;
      });
    });

    it('DELETE /plays/nonexisting', function() {
      fakeCRUD.query = sinon.stub().resolves({ affectedRows: 0 });

      return request.delete('/plays/' + nonExistingId)
      .then((response) => {
        response.statusCode.should.equal(204);

        response.body.should.be.empty;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.query.calledWith(
          'DELETE FROM scores WHERE play_id = ?',
          [nonExistingId],
          fakeDBConnection
        ).should.be.true;

        fakeCRUD.delete.notCalled.should.be.true;

        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
      });
    });

    it('DELETE with error on query', function() {
      fakeCRUD.query = sinon.stub().rejects();

      return request.delete('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.delete.notCalled.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('DELETE with error on delete', function() {
      fakeCRUD.delete = sinon.stub().rejects();

      return request.delete('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.delete.calledOnce.should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.commit.notCalled.should.be.true;
      });
    });

    it('DELETE with error on commit', function() {
      fakeCRUD.commit = sinon.stub().rejects();

      return request.delete('/plays/' + existingId)
      .then((response) => {
        response.statusCode.should.equal(500);
        response.body.should.be.empty;

        fakeCRUD.query.calledOnce.should.be.true;
        fakeCRUD.delete.calledOnce.should.be.true;
        fakeCRUD.commit.calledOnce.should.be.true;
        fakeCRUD.commit.calledWith(fakeDBConnection).should.be.true;
        fakeCRUD.rollback.calledOnce.should.be.true;
        fakeCRUD.rollback.calledWith(fakeDBConnection).should.be.true;
      });
    });
  });
});
