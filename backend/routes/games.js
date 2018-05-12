const express = require('express');
const router = express.Router();

const crud = require('../db/CRUDHandler');

// Helper to extract legal (DB-safe) fields from request body
const extractLegalFields = ({ game_name, bgg_id, thumbnail_url }) => {
  if(!game_name && !bgg_id && !thumbnail_url) {
    return {};
  } else {
    return { game_name, bgg_id, thumbnail_url };
  }
}

// Function that binds routes to the app
function bindUserRoutes(app) {

  // Middleware to parse game ID into a number
  router.param('gameId', (req, res, next, id) => {
    req.params.gameId = parseInt(id);
    next();
  });

  // Middleware to strip out any illegal fields
  router.use((req, res, next) => {
    req.body = extractLegalFields(req.body);
    next();
  })

  // Global route
  router.route('/')
  // Read all games
  .get((req, res) => {
    crud.read('games').then((games) => {
      res.json(games);
    });
  })
  // Create a new game
  .post((req, res) => {
    if(!req.body || Object.keys(req.body).length === 0) {
      res.sendStatus(400)
    } else {
      crud.create('games', req.body)
      .then((created) => {
        res.status(201)
        .append('Location', '/games/' + created.insertId)
        .json({game_id: created.insertId});
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
  router.route('/:gameId(\\d+)')
  // Get specific game
  .get((req, res) => {
    crud.read('games', {game_id: req.params.gameId})
    .then((game) => {
      if(game.length === 0) {
        res.sendStatus(404);
      } else {
        res.json(game);
      }
    });
  })
  // Update specific game
  .patch((req, res) => {
    if(!req.body || Object.keys(req.body).length === 0) {
      res.sendStatus(400);
    } else {
      crud.update('games', {game_id: req.params.gameId}, req.body)
      .then((updated) => {
        if(updated.changedRows === 0) {
          res.sendStatus(404);
        } else {
          res.sendStatus(204);
        }
      });
    }
  })
  // Delete specific came
  .delete((req, res) => {
    crud.delete('games', {game_id: req.params.gameId})
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

  // Register the routes with the app
  app.use('/games', router);
}

module.exports = bindUserRoutes;
