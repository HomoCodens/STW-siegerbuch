const CRUD = require('../helpers/CRUD');

const dbConf = require('../config/dbconfig.json');

const crud = new CRUD(dbConf.username, dbConf.password, dbConf.database, dbConf.host);

module.exports = crud;
