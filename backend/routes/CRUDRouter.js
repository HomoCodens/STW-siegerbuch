const express = require('express');

class CRUDRouter {
  constructor(CRUDHandler, table, idColumn, writeColumns, readColumns) {
    this.CRUDHandler = CRUDHandler;
    this.table = table;
    this.idColumn = idColumn;
    this.writeColumns = writeColumns;
    this.readColumns = readColumns;

    this.extractLegalFields = this.extractLegalFields.bind(this);
    this.bindRoutes = this.bindRoutes.bind(this);
    this.createRouter = this.createRouter.bind(this);
    this.create = this.create.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);

    this.router = this.createRouter();
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
    app.use('/' + this.table, this.router);
  }

  createRouter() {
    let router = express.Router();

    // Middleware to parse ID into a number
    router.param('id', (req, res, next, id) => {
      req.params.id = parseInt(id);
      next();
    });

    // Middleware to strip out any illegal fields
    router.use((req, res, next) => {
      req.body = this.extractLegalFields(req.body);
      next();
    })

    // Global route
    router.route('/')
    // Read all
    .get((req, res) => {
      this.read().then((records) => {
        res.json(records);
      });
    })
    // Create
    .post((req, res) => {
      if(!req.body || Object.keys(req.body).length === 0) {
        res.sendStatus(400)
      } else {
        this.create(req.body)
        .then((created) => {
          res.status(201)
          .append('Location', '/' + this.table + '/' + created.insertId)
          .json({id: created.insertId});
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
    router.route('/:id(\\d+)')
    // Get specific
    .get((req, res) => {
      this.read({[this.idColumn]: req.params.id})
      .then((record) => {
        if(record.length === 0) {
          res.sendStatus(404);
        } else {
          res.json(record);
        }
      });
    })
    // Update specific
    .patch((req, res) => {
      if(!req.body || Object.keys(req.body).length === 0) {
        res.sendStatus(400);
      } else {
        this.update({[this.idColumn]: req.params.id}, req.body)
        .then((updated) => {
          if(updated.changedRows === 0) {
            res.sendStatus(404);
          } else {
            res.sendStatus(204);
          }
        });
      }
    })
    // Delete specific
    .delete((req, res) => {
      this.delete({[this.idColumn]: req.params.id})
      .then(() => {
        res.sendStatus(204);
      });
    });

    // Error handling middleware
    router.use((err, req, res, next) => {
      // TODO: Would much rather have this in the post handler but the catch there
      //        does not appear to be called...
      if(err.code && err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({error: 'Duplicate entry!'});
      } else {
        res.sendStatus(500);
      }
    });

    return router;
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
}

module.exports = CRUDRouter;
