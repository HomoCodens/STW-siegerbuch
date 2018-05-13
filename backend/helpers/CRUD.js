var mysql = require('promise-mysql');
var Promise = require('bluebird');

class CRUD {
  constructor(user, password, database, host = 'localhost', port = 3306) {
    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database
    });

    this.getConnection = this.getConnection.bind(this);
    this.end = this.end.bind(this);
    this.create = this.create.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.query = this.query.bind(this);
  }

  getConnection() {
    const pool = this.pool;
    return this.pool.getConnection().disposer(function(connection) {
      pool.releaseConnection(connection);
    });
  }

  end() {
    this.pool.end();
  }

  create(table, data) {
    return Promise.using(this.getConnection(), (conn) => {

      // If passes a single object, pack it into an array
      if(!Array.isArray(data)) {
        data = [data];
      }

      // Map keys and values for bulk insert
      const keys = Object.keys(data[0]);
      const values = data.map((dataObject) => {
        return keys.map((key) => dataObject[key]);
      });

      return conn.query('INSERT INTO ?? (??) VALUES ?', [table, keys, values]);
    });
  }

  read(table, conditions, columns) {

    const cols = {
      toSqlString: function() {
        return columns ? mysql.escapeId(columns) : '*';
      }
    }

    return Promise.using(this.getConnection(), (conn) => {
      if(conditions) {
        return conn.query('SELECT ? FROM ?? WHERE ?', [cols, table, this.chainConditions(conditions)]);
      } else {
        return conn.query('SELECT ? FROM ??', [cols, table]);
      }
    });
  }

  update(table, conditions, data) {
    return Promise.using(this.getConnection(), (conn) => {
      return conn.query('UPDATE ?? SET ? WHERE ?', [table, data, this.chainConditions(conditions)]);
    });
  }

  delete(table, conditions) {
    return Promise.using(this.getConnection(), (conn) => {
      return conn.query('DELETE FROM ?? WHERE ?', [table, this.chainConditions(conditions)]);
    });
  }

  query(query, parameters) {
    return Promise.using(this.getConnection(), (conn) => {
      return conn.query(query, parameters);
    });
  }

  // TODO: Expand conditions to allow for some SQL-like syntax w/ more than just = AND = AND =
  // e.g.
  // {
  //    column1: and(smallerThan(10), greaterThan(0))
  //    column2: or(equals('root'), matches('admin.*'))
  // }
  chainConditions(condObj) {
    return {
      toSqlString: () => {
        const keys = Object.keys(condObj);
        return keys.map((key) => mysql.escapeId(key) + " = '" + condObj[key] + "'").join(" AND ");
      }
    }
  }

  loadFixtures(data) {
    return Promise.using(this.getConnection(), (conn) => {
      const tables = Object.getOwnPropertyNames(data);
      return Promise.map(tables, (table) => {
        return this.create(table, data[table]);
      });
    });
  }

  dropTables(tables) {
    return Promise.using(this.getConnection(), (conn) => {
      return Promise.map(tables, (table) => {
        return conn.query('DELETE FROM ??', [table]);
      });
    });
  }
}

module.exports = CRUD;
