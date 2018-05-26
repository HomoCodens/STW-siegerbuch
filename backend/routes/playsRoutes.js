const CRUDRouter = require('./CRUDRouter');

const Promise = require('bluebird');

class playsRouter extends CRUDRouter {
  constructor(CRUDHandler) {
    super(CRUDHandler, 'plays', 'play_id', ['game_id', 'played_at', 'comment']);
  }

  beforeRoutes() {
    // Intercept all CRUD routes
    // Yeees, I know...

    this.router.route('/')
    .get((req, res, next) => {
      this.query('SELECT * FROM plays LEFT JOIN (SELECT GROUP_CONCAT(player_id) as players, GROUP_CONCAT(score) as scores, play_id FROM scores GROUP BY play_id)scores ON scores.play_id = plays.play_id')
          .then((records) => {
              records.map((r, i) => {
              records[i].players = JSON.parse('[' + r.players + ']');
              records[i].scores = JSON.parse('[' + r.scores + ']');
            });
            res.json(records);
          })
          .catch(next);
          // No next to prevent default route
    })
    .post((req, res, next) => {
      if(!req.cleanedBody || Object.keys(req.cleanedBody).length === 0) {
        res.sendStatus(400);
      } else {
        this.beginTransaction()
        .then((conn) => {
          return this.create(req.cleanedBody, conn)
          .then((created) => {
            const  { insertId } = created;

            const scoresValues = req.body.players.map((playerId, i) => [
                created.insertId,
                playerId,
                req.body.scores[i]
              ]);
            return this.query('INSERT INTO scores (play_id, player_id, score) VALUES ?', [scoresValues], conn)
            .then((scoresInserted) => {
              return this.commit(conn).then(() => {
                res.status(201)
                .append('Location', '/' + this.table + '/' + insertId)
                .json({id: insertId});
              });
            });
          })
          .catch((error) => {
            this.rollback(conn);
            if(error.code && error.code === 'ER_DUP_ENTRY') {
              res.status(409).json({error: 'Duplicate entry!'});
            } else {
              throw error;
            }
          });
        })
        .catch(next);
      }
    });

    this.router.route('/:id(\\d+)')
    .get((req, res, next) => {
      this.query('SELECT * FROM plays LEFT JOIN (SELECT GROUP_CONCAT(player_id) as players, GROUP_CONCAT(score) as scores, play_id FROM scores GROUP BY play_id)scores ON scores.play_id = plays.play_id WHERE plays.play_id = ?', [req.params.id])
      .then((records) => {
        if(records.length === 0) {
          res.sendStatus(404);
        } else {
          const record = records[0];
          record.players = JSON.parse('[' + record.players + ']');
          record.scores = JSON.parse('[' + record.scores + ']');
          res.json(record);
        }
      })
      .catch(next);
    })
    .patch((req, res, next) => {
      if(!req.cleanedBody || Object.keys(req.cleanedBody).length === 0) {
        res.sendStatus(400);
      } else {
        const playId = req.params.id;
        this.beginTransaction()
        .then((conn) => {
          return this.update({ play_id: playId }, req.cleanedBody, conn)
          .then((playUpdated) => {
            if(playUpdated.affectedRows === 0) {
              this.rollback(conn);
              res.sendStatus(404);
            } else {
              return Promise.map(req.body.players, (playerId, i) => {
                return this.query('UPDATE scores SET score = ? WHERE player_id = ?', [req.body.scores[i], playerId], conn);
              })
              .then((scoreUpdates) => {
                return this.commit(conn)
                .then(() => {
                  res.sendStatus(204);
                });
              });
            }
          })
          .catch((e) => {
            this.rollback(conn);
            throw e;
          });
        })
        .catch(next);
      }
    })
    .delete((req, res, next) => {
      this.beginTransaction()
      .then((conn) => {
        return this.query('DELETE FROM scores WHERE play_id = ?', [req.params.id], conn)
        .then((scoresDeleted) => {
          if(scoresDeleted.affectedRows === 0) {
            return this.rollback(conn)
            .then(() => {
              res.sendStatus(204);
            });
          } else {
            return this.delete({ play_id: req.params.id }, conn)
            .then((playDeleted) => {
              return this.commit(conn)
              .then(() => {
                res.sendStatus(204);
              });
            });
          }
        })
        .catch((e) => {
          this.rollback(conn);
          throw e;
        });
      })
      .catch(next);
    });
  }
}

module.exports = playsRouter;
