const express = require('express');

class CRUDRouter {
  // TODO: Use readColumns (default to writeColumns) and add requiredFields
  constructor(CRUDHandler, table, idColumn, writeColumns, readColumns) {
    this.CRUDHandler = CRUDHandler;
    this.table = table;
    this.idColumn = idColumn;
    this.writeColumns = writeColumns;
    this.readColumns = readColumns;

    this.extractLegalFields = this.extractLegalFields.bind(this);
    this.bindRoutes = this.bindRoutes.bind(this);
    this.appendCRUDRoutes = this.appendCRUDRoutes.bind(this);
    this.create = this.create.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.query = this.query.bind(this);

    this.router = express.Router();

    // Middleware to parse ID into a number
    this.router.param('id', (req, res, next, id) => {
      req.params.id = parseInt(id);
      next();
    });

    // Middleware to strip out any illegal fields
    this.router.use((req, res, next) => {
      req.cleanedBody = this.extractLegalFields(req.body);
      next();
    });
  }

  extractLegalFields(body) {
    let cleanBody = {};

    this.writeColumns.map((key) => {
      let value = body[key];
      if(value) {
        cleanBody[key] = value;
      }
    });

    return cleanBody;
  }

  bindRoutes(app) {
    this.beforeRoutes();
    this.appendCRUDRoutes();
    this.afterRoutes();
    app.use('/' + this.table, this.router);
  }

  beforeRoutes() {

  }

  appendCRUDRoutes() {
    // Global route
    this.router.route('/')
    // Read all
    .get((req, res, next) => {
      this.read().then((records) => {
        res.json(records);
        next();
      })
      .catch(next);
    })
    // Create
    .post((req, res, next) => {
      if(!req.cleanedBody || Object.keys(req.cleanedBody).length === 0) {
        res.sendStatus(400)
      } else {
        this.create(req.cleanedBody)
        .then((created) => {
          res.status(201)
          .append('Location', '/' + this.table + '/' + created.insertId)
          .json({id: created.insertId});
          res.locals.id = created.insertId;
          next();
        })
        .catch((error) => {
          if(error.code && error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({error: 'Duplicate entry!'});
          } else {
            throw error;
          }
        })
        .catch(next);
      }
    });

    // Game specific routes
    this.router.route('/:id(\\d+)')
    // Get specific
    .get((req, res, next) => {
      this.read({[this.idColumn]: req.params.id})
      .then((record) => {
        if(record.length === 0) {
          res.sendStatus(404);
        } else {
          res.json(record);
        }
        next();
      })
      .catch(next);
    })
    // Update specific
    .patch((req, res, next) => {
      if(!req.body || Object.keys(req.body).length === 0) {
        res.sendStatus(400);
        next();
      } else {
        this.update({[this.idColumn]: req.params.id}, req.body)
        .then((updated) => {
          if(updated.changedRows === 0) {
            res.sendStatus(404);
          } else {
            res.sendStatus(204);
          }
          next();
        })
        .catch(next);
      }
    })
    // Delete specific
    .delete((req, res, next) => {
      this.delete({[this.idColumn]: req.params.id})
      .then(() => {
        res.sendStatus(204);
      })
      .catch(next);
    });

    // Error handling middleware
    this.router.use((err, req, res, next) => {
      res.sendStatus(500);
    });
  }

  afterRoutes() {

  }

  // helpers for easier expansion w/ methods using CRUDHandler
  create(data, conn = null) {
    return this.CRUDHandler.create(this.table, data, conn);
  }

  read(conditions, conn = null) {
    return this.CRUDHandler.read(this.table, conditions, conn);
  }

  update(conditions, data, conn = null) {
    return this.CRUDHandler.update(this.table, conditions, data, conn);
  }

  delete(conditions, conn = null) {
    return this.CRUDHandler.delete(this.table, conditions, conn);
  }

  query(query, parameters, conn = null) {
    return this.CRUDHandler.query(query, parameters, conn);
  }

  beginTransaction() {
    return this.CRUDHandler.beginTransaction();
  }

  commit(conn) {
    return this.CRUDHandler.commit(conn);
  }

  rollback(conn) {
    return this.CRUDHandler.rollback(conn);
  }
}

module.exports = CRUDRouter;
