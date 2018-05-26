const CRUDRouter = require('./CRUDRouter');

class playersRouter extends CRUDRouter {
  constructor(CRUDHandler) {
    super(CRUDHandler, 'players', 'player_id', ['user_id', 'player_name']);
  }
}

module.exports = playersRouter;
