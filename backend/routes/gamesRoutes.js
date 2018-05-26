const CRUDRouter = require('./CRUDRouter');

class gamesRouter extends CRUDRouter {
  constructor(CRUDHandler) {
    super(CRUDHandler, 'games', 'game_id', ['game_name', 'bgg_id', 'thumbnail_url', 'is_coop']);
  }
}

module.exports = gamesRouter;
