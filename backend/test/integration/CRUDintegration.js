const Promise = require('bluebird');

require('../setup/testSetup');

const conf = require('../../config/dbconfig_test.json');
const games = require('../fixtures/games.json');

const CRUD = require('../../helpers/CRUD');

let testCRUD = null;

const testTable = 'games';
const testFixture = {
  games: games
};

const newEntry = {
  game_name: 'Mage Knight the Board Game',
  bgg_id: 96848,
  thumbnail_url: 'https://cf.geekdo-images.com/itemrep/img/aUl8H4GzldcS1kPdF8q__rU0B9M=/fit-in/246x300/pic1083380.jpg'
};

const delta = {
  condition: {game_id: 1},
  data: {thumbnail_url: 'www.example.com'}
}

describe('CRUD integration tests', function() {
  before(() => {
    testCRUD = new CRUD(conf.username, conf.password, conf.database, conf.host);
  })

  beforeEach(() => {
    testCRUD.dropTables([testTable]);
    return testCRUD.loadFixtures(testFixture);
  });

  after(() => {
    testCRUD.dropTables([testTable]).then(() => {
      testCRUD.end();
    });
  });

  it('create', function() {
    const created = testCRUD.create(testTable, newEntry);

    return created.then((c) => {
      c.should.be.a('object').that.has.a.property('insertId');
      c.affectedRows.should.equal(1);

      return testCRUD.read(testTable, {game_id: c.insertId}).then((r) => {
        r.should.be.a('array').that.has.length(1);

        // Scary looking ES6 JS O.O
        const entry = (({ game_name, bgg_id, thumbnail_url }) => ({ game_name, bgg_id, thumbnail_url }))(r[0]);
        entry.should.eql(newEntry);
      });
    });
  });

  it('read all', function() {
    const result = testCRUD.read(testTable);

    return result.then((r) => {
      r.should.eql(games);
    });
  });

  it('read single', function() {
    const result = testCRUD.read(testTable, {game_id: games[0].game_id});

    return result.then((r) => {
      r.should.be.a('array').that.has.length(1);
      r[0].should.eql(games[0]);
    });
  });

  it('update', function() {
    const update = testCRUD.update(testTable, delta.condition, delta.data);

    return update.then((u) => {
      return testCRUD.read(testTable, {game_id: delta.condition.game_id}).then((r) => {
        r.should.be.a('array').that.has.length(1);

        let updatedEntry = games[delta.condition.game_id - 1];
        updatedEntry.thumbnail_url = delta.data.thumbnail_url;

        r[0].should.eql(updatedEntry);
      });
    });
  });

  it('delete', function() {
    const del = testCRUD.delete(testTable, {game_id: games[0].game_id});

    return del.then((d) => {
      return Promise.all([
        testCRUD.read(testTable).then((rAll) => {
          rAll.should.be.a('array').that.has.length(games.length - 1);
        }),
        testCRUD.read(testTable, {game_id: games[0].game_id}).then((rSingle) => {
          rSingle.should.be.a('array').that.is.empty;
        })
      ]);
    });
  });
});
