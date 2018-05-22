const CRUDRouter = require('./CRUDRouter');

class playsRouter extends CRUDRouter {
  constructor(CRUDHandler) {
    super(CRUDHandler, 'plays', 'play_id', ['game_id', 'played_at', 'winner_id', 'is_coop', 'comment']);
  }

  beforeRoutes() {
    // Intercept all CRUD routes
    // Yeees, I know...

    this.router.route('/').get((req, res) => {
      this.query('SELECT * FROM plays LEFT JOIN (SELECT GROUP_CONCAT(player_id) as players, GROUP_CONCAT(score) as scores, play_id FROM scores GROUP BY play_id)scores ON scores.play_id = plays.play_id')
          .then((records) => {
            records.map((r, i) => {
                records[i].players = JSON.parse('[' + r.players + ']');
                records[i].scores = JSON.parse('[' + r.scores + ']');
            });
            res.json(records);
          });
          // No next to prevent default route
    });

    this.router.route('/:id(\\d+)').get((req, res) => {
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
      });
    });
  }

  /*afterRoutes() {
    this.router.get('/list', (req, res) => {
      // TODO: Pagination
      this.query('SELECT * FROM v_playslist')
      .then((records) => {
        res.json(records);
      });
    });

    this.router.post('/', (req, res) => {
      // Play already inserted, insert scores
    });

    this.router.patch('/:id(\\d+)', (req, res) => {
      // Update scores
    });
  }*/
}

module.exports = playsRouter;
