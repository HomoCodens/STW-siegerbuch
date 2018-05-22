require('../setup/testSetup');

const sinon = require('sinon');
const mysql = require('promise-mysql');
const Promise = require('bluebird');

const CRUD = require('../../helpers/CRUD');

// a CRUD object to be tested on
let testCRUD = null;

const testRecords = [
  {key1: 'value', key2: 123},
  {key1: 'value2', key2: 12},
  {key1: 'value3', key2: 1}
];

const testFixture = {
  table1: [testRecords[0], testRecords[1]],
  table2: [testRecords[2]]
};

const testKeys = ['key1', 'key2'];
const testValues = [
  ['value', 123],
  ['value2', 12],
  ['value3', 1]
];

// Spies and fakes the lot of them
const fakeDBPromise = 'I solemnly swear to return some DB results within the second!';

const fakeConnection = {
  query: sinon.fake.resolves(fakeDBPromise),
  beginTransaction: sinon.fake.resolves(fakeDBPromise),
  commit: sinon.fake.resolves(fakeDBPromise),
  rollback: sinon.fake.resolves(fakeDBPromise)
}

const fakeConnectionPromise = Promise.resolve(fakeConnection);

const fakePool = {
  getConnection: sinon.fake.returns(fakeConnectionPromise),
  releaseConnection: sinon.fake(),
  end: sinon.fake()
};

const createPoolFake = sinon.fake.returns(fakePool);


// Tests
describe('CRUD tests', function() {
  before(() => {
    sinon.replace(mysql, 'createPool', createPoolFake);
  });

  after(() => {
    sinon.restore();
  });

  describe('CRUD init', function() {
    it('creates a pool when instantiated', function() {
      const testCRUD = new CRUD('user', 'password', 'database', 'host', 1234);
      createPoolFake.lastArg.should.eql({
        host: 'host',
        user: 'user',
        password: 'password',
        database: 'database',
        port: 1234
      });

      testCRUD.pool.should.eql(fakePool);
    });
  });

  describe('internals', function() {
    before(() => {
      testCRUD = new CRUD('user', 'password', 'database', 'host', 1234);
    });

    beforeEach(() => {
      fakePool.getConnection.resetHistory();
      fakePool.releaseConnection.resetHistory();
      fakePool.end.resetHistory();

      fakeConnection.query.resetHistory();
    });

    it('getConnection oneshot', function() {
      const dispatcher = testCRUD.getConnection();

      fakePool.getConnection.calledOnce.should.be.true;

      dispatcher.should.have.a.property('_promise');
      dispatcher._promise.should.eventually.equal(fakeConnection);
    });

    it('getConnection transaciton', function() {
      const conn = testCRUD.getConnection(true);

      fakePool.getConnection.calledOnce.should.be.true;

      conn.should.eventually.equal(fakeConnection);
    });

    it('disposes of the connection', function() {
      const result = testCRUD.create('table', {});

      return result.then((r) => {
        // TODO: Is this still "unit" testing?
        fakePool.releaseConnection.calledOnce.should.be.true;
        fakePool.releaseConnection.lastCall.calledWith(fakeConnection).should.be.true;
      });
    });

    it('end', function() {
      testCRUD.end();

      fakePool.end.calledOnce.should.be.true;
    });

    it('chainConditions', function() {
      const chained = testCRUD.chainConditions(testRecords[0]);

      chained.should.be.a('object').that.has.a.property('toSqlString').that.is.a('function');
      chained.toSqlString().should.equal('`' + testKeys[0] + '` = \'' + testValues[0][0] + '\' AND `' + testKeys[1] + '` = \'' + testValues[0][1] + '\'');
    });

    it('loads fixtures', function() {
      testCRUD.create = sinon.fake();

      const result = testCRUD.loadFixtures(testFixture);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.be.a('array').that.has.length(2);

        testCRUD.create.calledTwice.should.be.true;

        testCRUD.create.args.map((arg, i) => {
          const key = 'table' + (i+1);
          arg[0].should.equal(key);
          arg[1].should.eql(testFixture[key]);
        });
      });
    });

    it('drops tables', function() {
      const result = testCRUD.dropTables(['table1', 'table2', 'table3']);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
          r.should.be.a('array').that.has.length(3);
          r.map((entry) => entry.should.equal(fakeDBPromise));

          fakeConnection.query.calledThrice.should.be.true;
          fakeConnection.query.args.map((arg, i) => {
            arg[0].should.equal('DELETE FROM ??');
            arg[1].should.eql(['table' + (i+1)]);
          });
      });
    });
  });

  describe('CRUD methods', function() {
    before(() => {
      testCRUD = new CRUD('user', 'password', 'database', 'host', 1234);
    });

    beforeEach(() => {
      fakePool.getConnection.resetHistory();
      fakePool.releaseConnection.resetHistory();
      fakePool.end.resetHistory();

      fakeConnection.query.resetHistory();
    });

    it('create with single object', function() {
      const result = testCRUD.create('table', testRecords[0]);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;
        fakeConnection.query.lastCall.calledWith('INSERT INTO ?? (??) VALUES ?', ['table', testKeys, [testValues[0]]]).should.be.true;
      });
    });

    it('create with array of objects', function() {
      const result = testCRUD.create('table', testRecords);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
          r.should.equal(fakeDBPromise);

          fakeConnection.query.calledOnce.should.be.true;
          fakeConnection.query.lastCall.calledWith('INSERT INTO ?? (??) VALUES ?', ['table', testKeys, testValues]).should.be.true;
      });
    });

    it('read all', function() {
      const result = testCRUD.read('table');

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(2);

        args[0].should.equal('SELECT ? FROM ??');
        args[1][0].toSqlString().should.equal('*');
        args[1][1].should.equal('table');
      });
    });

    it('read with conditions', function() {
      const result = testCRUD.read('table', testRecords[0]);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(3);

        args[0].should.equal('SELECT ? FROM ?? WHERE ?');
        args[1][0].toSqlString().should.equal('*');
        args[1][1].should.equal('table');
        args[1][2].toSqlString().should.equal(testCRUD.chainConditions(testRecords[0]).toSqlString());
      });
    });

    it('read cols w/o conditions', function() {
      const result = testCRUD.read('table', null, testKeys);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(2);

        args[0].should.equal('SELECT ? FROM ??');
        args[1][0].toSqlString().should.equal('`' + testKeys[0] + '`, `' + testKeys[1] + '`');
        args[1][1].should.equal('table');
      });
    });

    it('read with cols and conditions', function() {
      const result = testCRUD.read('table', testRecords[0], testKeys);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(3);

        args[0].should.equal('SELECT ? FROM ?? WHERE ?');
        args[1][0].toSqlString().should.equal('`' + testKeys[0] + '`, `' + testKeys[1] + '`');
        args[1][1].should.equal('table');
        args[1][2].toSqlString().should.equal(testCRUD.chainConditions(testRecords[0]).toSqlString());
      });
    });

    it('update', function() {
      const result = testCRUD.update('table', testRecords[0], testRecords[0]);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(3);

        args[0].should.equal('UPDATE ?? SET ? WHERE ?');
        args[1][0].should.equal('table');
        args[1][1].should.equal(testRecords[0]);
        args[1][2].toSqlString().should.equal(testCRUD.chainConditions(testRecords[0]).toSqlString());
      });
    });

    it('delete', function() {
      const result = testCRUD.delete('table', testRecords[0]);

      fakePool.getConnection.calledOnce.should.be.true;

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledOnce.should.be.true;

        const args = fakeConnection.query.lastCall.args;

        args.should.have.length(2);
        args[1].should.have.length(2);

        args[0].should.equal('DELETE FROM ?? WHERE ?');
        args[1][0].should.equal('table');
        args[1][1].toSqlString().should.equal(testCRUD.chainConditions(testRecords[0]).toSqlString());
      });
    });

    it('query', function() {
      const result = testCRUD.query('SELECT * FROM ?? WHERE ?', ['the_future', {person: 'moi'}]);

      return result.then((r) => {
        r.should.equal(fakeDBPromise);

        fakeConnection.query.calledWith('SELECT * FROM ?? WHERE ?', ['the_future', {person: 'moi'}]).should.be.true;
      });
    });

    it('beginTransaction', function() {
      const transactionConnPromise = testCRUD.beginTransaction();

      return transactionConnPromise.then((conn) => {
        fakeConnection.beginTransaction.calledOnce.should.be.true;

        conn.should.eql(fakeConnection);
      });
    });

    it('commit', function() {
      const transactionConnPromise = testCRUD.beginTransaction();

      return transactionConnPromise.then((conn) => {
        return testCRUD.commit(conn).then(() => {
            fakeConnection.commit.calledOnce.should.be.true;

            fakePool.releaseConnection.calledOnce.should.be.true;
            fakePool.releaseConnection.calledWith(conn).should.be.true;
        });
      });
    });

    it('rollback', function() {
      const transactionConnPromise = testCRUD.beginTransaction();

      return transactionConnPromise.then((conn) => {
        return testCRUD.rollback(conn).then(() => {
            fakeConnection.rollback.calledOnce.should.be.true;

            fakePool.releaseConnection.calledOnce.should.be.true;
            fakePool.releaseConnection.calledWith(conn).should.be.true;
        });
      });
    });
  });
});
