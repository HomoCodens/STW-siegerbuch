require('../setup/testSetup');

const supertest = require('supertest');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');

const playsRouter = require('../../routes/playsRoutes');

const existingId = 1;
const nonExistingId = 2;
const newId = 3;
const evilId = 666;

var fakeCreate = sinon.stub();
fakeCreate.resolves({insertId: newId});

var fakeRead = sinon.stub();

var fakeUpdate = sinon.stub();

var fakeDelete = sinon.stub();

var fakeQuery = sinon.stub();
fakeQuery.resolves({});

const fakeCRUD = {
  create: fakeCreate,
  read: fakeRead,
  update: fakeUpdate,
  delete: fakeDelete,
  query: fakeQuery
};

const plays = new playsRouter(fakeCRUD);

describe('CRUDRoutes', function() {
  var app;
  var request;

  beforeEach(() => {
    app = express();

    app.use(bodyParser.json());

    plays.bindRoutes(app);

    request = supertest(app);

    fakeCRUD.create.resetHistory();
    fakeCRUD.read.resetHistory();
    fakeCRUD.update.resetHistory();
    fakeCRUD.delete.resetHistory();
  });

  /*it('works', function() {
    request.get('/plays/list')
    .then((response) => {
      console.log(response.text);
    });
  });*/

  /*it('adds scores in a separate step', function() {
    request.post('/plays')
    .send({game_id: 1})
    .then((response) => {
      console.log("see above");
    });
  });*/
});
