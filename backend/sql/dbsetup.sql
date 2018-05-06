CREATE DATABASE IF NOT EXISTS siegerbuch_prod;

CREATE TABLE IF NOT EXISTS siegerbuch_prod.games	(
	game_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	game_name VARCHAR(60) NOT NULL UNIQUE,
	bgg_id INT UNSIGNED,
	thumbnail_url TEXT
)ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS siegerbuch_prod.players (
	player_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	user_id int UNSIGNED UNIQUE,
	player_name VARCHAR(20) UNIQUE NOT NULL
)ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS siegerbuch_prod.plays	(
	play_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	game_id INT UNSIGNED,
	played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	winner_id INT UNSIGNED,
	is_coop BOOLEAN DEFAULT 0,
	players TEXT,
	scores TEXT,
	comment TEXT DEFAULT NULL,
	FOREIGN KEY (game_id) REFERENCES siegerbuch_prod.games(game_id),
	FOREIGN KEY (winner_id) REFERENCES siegerbuch_prod.players(player_id)
)ENGINE=InnoDB;


CREATE DATABASE IF NOT EXISTS siegerbuch_test;

CREATE TABLE IF NOT EXISTS siegerbuch_test.games	(
	game_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	game_name VARCHAR(60) NOT NULL UNIQUE,
	bgg_id INT UNSIGNED,
	thumbnail_url TEXT
)ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS siegerbuch_test.players (
	player_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	user_id int UNSIGNED UNIQUE,
	player_name VARCHAR(20) UNIQUE NOT NULL
)ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS siegerbuch_test.plays	(
	play_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	game_id INT UNSIGNED,
	played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	winner_id INT UNSIGNED,
	is_coop BOOLEAN DEFAULT 0,
	players TEXT,
	scores TEXT,
	comment TEXT DEFAULT NULL,
	FOREIGN KEY (game_id) REFERENCES siegerbuch_test.games(game_id),
	FOREIGN KEY (winner_id) REFERENCES siegerbuch_test.players(player_id)
)ENGINE=InnoDB;

CREATE USER siegerb_scribe IDENTIFIED BY 'siegerbuch_Scribe_password';

GRANT ALL PRIVILEGES ON siegerbuch_prod.* to siegerb_scribe;
GRANT ALL PRIVILEGES ON siegerbuch_test.* to siegerb_scribe;
