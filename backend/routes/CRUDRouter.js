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

    // Middleware to parse ID into a number
    this.router.param('id', (req, res, next, id) => {
      req.params.id = parseInt(id);
      next();
    });

    // Middleware to strip out any illegal fields
    this.router.use((req, res, next) => {
      req.cleanedBody = this.extractLegalFields(req.body);
      next();
    })

    // Global route
    this.router.route('/')
    // Read all
    .get((req, res, next) => {
      this.read().then((records) => {
        res.json(records);
        next();
      });
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
        // TODO: Why is this skipped?
        .catch((error) => {
          if(error.code && error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({error: 'Duplicate entry!'});
          }
        });
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
      });
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
        });
      }
    })
    // Delete specific
    .delete((req, res, next) => {
      console.log("DELETE /id")
      this.delete({[this.idColumn]: req.params.id})
      .then(() => {
        res.sendStatus(204);
      });
    });

    // Error handling middleware
    this.router.use((err, req, res, next) => {
      // TODO: Would much rather have this in the post handler but the catch there
      //        does not appear to be called...
      if(err.code && err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({error: 'Duplicate entry!'});
      } else {
        res.sendStatus(500);
      }
    });
  }

  afterRoutes() {

  }

  // helpers for easier expansion w/ methods using CRUDHandler
  create(data) {
    return this.CRUDHandler.create(this.table, data);
  }

  read(conditions) {
    return this.CRUDHandler.read(this.table, conditions);
  }

  update(conditions, data) {
    return this.CRUDHandler.update(this.table, conditions, data);
  }

  delete(conditions) {
    return this.CRUDHandler.delete(this.table, conditions);
  }

  query(query, parameters) {
    return this.CRUDHandler.query(query, parameters);
  }
}

module.exports = CRUDRouter;
