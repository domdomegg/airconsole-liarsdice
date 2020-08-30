/*global AirConsole,MESSAGES,PLAYER_COLORS,playerStringWithColor*/
/*eslint-env browser*/

// Create placeholder for AirConsole instance
var air_console = null;

// Get DOM elements
var e_subtitle = document.getElementById('subtitle');
var e_gameInfoContainer = document.getElementById('gameInfoContainer');
var e_diceReveal = document.getElementById('diceReveal');
var e_current = document.getElementById('current');
var e_currentDice = document.getElementById('currentDice');
var e_players = document.getElementById('players');
var e_playersHeaders = document.getElementById('playersHeaders');
var e_options = document.getElementById('options');
var e_instructions = document.getElementById('instructions');

// Stores player data: key is device_id, player object inside stores color, numberOfDice, dice, points (where dice is an array of dice values)
var players = {};
// Stores colors given out to certain UIDs, to recognise if they come back
var UID_colors = {};
// Stores the number of colors used to ensure no colors are duplicated
var colors_used = 0;
// Template for gamestate - saved as JSON string, easiest way to load it later without linking it like a pointer
var gameInfoTemplate = JSON.stringify({
	inProgress: false,
	starting_dice: 5,
	sides_on_die: 6,
	currentBidQuantity: 0,
	currentBidDie: 6,
	currentBidderdevice_id: null,
	currentBidderColor: '#FFFFFF',
	nextPlayerDeviceId: null,
	activePlayerDeviceIds: [],
	bids: 0,
});
var gameInfo = JSON.parse(gameInfoTemplate);
// Starting options (can be changed on controls)
var options = {
	onesAreWild: false,
	playSounds: true
};
var showInstructions = false;

// Background music looping at 40% volume
var backgroundMusic = new Audio('audio/bgmusic.mp3');
backgroundMusic.volume = 0.4;
backgroundMusic.loop = true;
backgroundMusic.play();

function init() {
	// Set AirConsole instance
	air_console = new AirConsole();

	air_console.onConnect = function(device_id) {
		// Temporarily give user color
		var player_color = '#000000';

		if (UID_colors[air_console.getUID(device_id)]) {
			// If same user reconnects, give them back their old color
			player_color = UID_colors[air_console.getUID(device_id)];
		} else if (colors_used < PLAYER_COLORS.length) {
			// Check if there are any standard colors left, if so give them one
			player_color = PLAYER_COLORS[colors_used];
			UID_colors[air_console.getUID(device_id)] = player_color;
			colors_used++;
		} else {
			// If no colors left generate a random darkish one and give them that
			var digits = '012345678'.split('');
			player_color = '#';
			for (var i = 0; i < 3; i++) {
				player_color += digits[Math.floor(Math.random() * digits.length)];
			}
			UID_colors[air_console.getUID(device_id)] = player_color;
		}

		// Add that user to players object
		players[device_id] = {
			color: player_color,
			numberOfDice: 0,
			dice: [],
			points: 0
		};

		// Display player on screen
		updatePlayerList();

		updateControllers();
	};

	air_console.onDisconnect = function(device_id) {
		// If there's a game going on, end it
		if (gameInfo.inProgress) {
			gameInfo.inProgress = false;

			// Remove marker
			document.getElementById(gameInfo.nextPlayerDeviceId).children[0].innerHTML = '';

			// Find new master controller
			var newMasterController = air_console.getMasterControllerDeviceId()

			if (newMasterController) {
				// Update current
				e_current.innerHTML = '<span style="color: ' + players[device_id].color + '">■</span> A player left. Waiting for ' + playerStringWithColor(newMasterController, players[newMasterController].color) + ' to start the next round';
				e_currentDice.innerHTML = '';
	
				// Update subtitle
				e_subtitle.innerHTML = 'Waiting for ' + playerStringWithColor(newMasterController, players[newMasterController].color) + ' to start the next round';
			} else {
				// Update current
				e_current.innerHTML = '<span style="color: ' + players[device_id].color + '">■</span> A player left. Waiting for players';
				e_currentDice.innerHTML = '';
	
				// Update subtitle
				e_subtitle.innerHTML = '';
			}
		}

		// Remove that user from players object
		delete players[device_id];

		// Update table of players
		updatePlayerList();

		updateControllers();
	};

	air_console.onMessage = function(device_id, data) {
		// MESSAGES are defined in shared.js
		if (data.action === MESSAGES.bid) {
			doBid(device_id, data.bid);
		} else if (data.action === MESSAGES.challenge) {
			doChallenge(device_id);
		} else if (data.action === MESSAGES.getInfo) {
			updateController(device_id);
		} else {
			var masterController = air_console.getMasterControllerDeviceId()
			if (data.action === MESSAGES.start && device_id == masterController) {
					startGame();
			} else if (data.action === MESSAGES.changeOptions && device_id == masterController) {
				options = data.options;
				updateOptions();
			} else if (data.action === MESSAGES.toggleInstructions && device_id == masterController) {
				toggleInstructions();
			}
		}
	};

	air_console.onDeviceProfileChange = function() {
		updatePlayerList();
		updateControllers();
	};

	air_console.onAdShow = function() {
		backgroundMusic.pause();
	};

	air_console.onAdComplete = function() {
		if (options.playSounds) {
			backgroundMusic.play();
		} else {
			backgroundMusic.pause();
		}
	};
}

function startGame() {
	// Lock in players
	air_console.setActivePlayers();

	// Reset gameInfo, keeping the same nextPlayerDeviceId from last hand
	var nextPlayerDeviceId = air_console.getActivePlayerDeviceIds()[0];
	var bids = 0;
	if (gameInfo.nextPlayerDeviceId !== null && air_console.getActivePlayerDeviceIds().indexOf(gameInfo.nextPlayerDeviceId) > -1) {
		nextPlayerDeviceId = gameInfo.nextPlayerDeviceId;
		bids = air_console.getActivePlayerDeviceIds().indexOf(gameInfo.nextPlayerDeviceId);
	}
	gameInfo = JSON.parse(gameInfoTemplate);
	gameInfo.nextPlayerDeviceId = nextPlayerDeviceId;
	gameInfo.bids = bids;
	gameInfo.activePlayerDeviceIds = air_console.getActivePlayerDeviceIds();
	gameInfo.inProgress = true;

	// Update table to show extra columns - require redefining e_playersHeaders as have probably edited innerHTML of e_players
	e_playersHeaders = document.getElementById('playersHeaders');
	e_playersHeaders.children[2].innerHTML = 'Dice';
	e_playersHeaders.children[3].innerHTML = 'Last bid';

	// Ensure we have hidden the instructions
	if (showInstructions) {
		toggleInstructions();
	}

	// Move marker to first player
	document.getElementById(gameInfo.nextPlayerDeviceId).children[0].innerHTML = '➤';

	// Reset gameInfoContainer
	e_diceReveal.innerHTML = "";
	e_current.innerHTML = 'Game in progress';

	var totalNumberOfDice = 0;

	for (var i = 0; i < gameInfo.activePlayerDeviceIds.length; i++) {
		// Reset dice, display dice then assign random dice
		players[gameInfo.activePlayerDeviceIds[i]].numberOfDice = gameInfo.starting_dice;
		document.getElementById(gameInfo.activePlayerDeviceIds[i]).children[2].innerHTML = gameInfo.starting_dice;
		players[gameInfo.activePlayerDeviceIds[i]].dice = [];
		for (var j = 0; j < gameInfo.starting_dice; j++) {
			// May the odds be ever in your favour
			players[gameInfo.activePlayerDeviceIds[i]].dice.push(Math.floor(Math.random() * gameInfo.sides_on_die) + 1);
			totalNumberOfDice++;
		}

		// Reset 'last bid' column
		document.getElementById(gameInfo.activePlayerDeviceIds[i]).children[3].innerHTML = '';
	}

	// Update currentDice
	e_currentDice.innerHTML = '<span class="totalDice">' + totalNumberOfDice + '</span> dice in play';

	// Alert the first player
	alertController(gameInfo.nextPlayerDeviceId);

	// Update subtitle
	e_subtitle.innerHTML = playerStringWithColor(gameInfo.nextPlayerDeviceId, players[gameInfo.nextPlayerDeviceId].color) + '\'s turn';

	updateControllers();
	shakeControllersDice();
}

function doBid(device_id, bid) {
	// Update gameInfo
	gameInfo.bids++;
	gameInfo.currentBidQuantity = bid.quantity;
	gameInfo.currentBidDie = bid.die;
	gameInfo.currentBidderdevice_id = device_id;
	gameInfo.currentBidderColor = players[device_id].color;

	// Move marker to next player
	document.getElementById(gameInfo.nextPlayerDeviceId).children[0].innerHTML = '';
	gameInfo.nextPlayerDeviceId = gameInfo.activePlayerDeviceIds[gameInfo.bids % gameInfo.activePlayerDeviceIds.length];
	document.getElementById(gameInfo.nextPlayerDeviceId).children[0].innerHTML = '➤';

	// Create bid string e.g. "1 2" or "5 4's"
	var bidString = gameInfo.currentBidQuantity + ' ' + gameInfo.currentBidDie;
	// gameInfo.currentBidderColor
	if (gameInfo.currentBidQuantity != 1) {
		bidString += '\'s';
	}

	// Display bid
	e_current.innerHTML = playerStringWithColor(gameInfo.currentBidderdevice_id, gameInfo.currentBidderColor) + ' bid <span class="bid">' + bidString + '</span>';

	// Add bid to table
	document.getElementById(gameInfo.currentBidderdevice_id).children[3].innerHTML = bidString;

	// Alert the next player
	alertController(gameInfo.nextPlayerDeviceId);

	// Update subtitle
	e_subtitle.innerHTML = playerStringWithColor(gameInfo.nextPlayerDeviceId, players[gameInfo.nextPlayerDeviceId].color) + '\'s turn';

	updateControllers();
}

function doChallenge(device_id) {
	// End of round, show an ad before results are revealed
	air_console.showAd();

	// Store the actual number to compare against later
	var actual_number_of_die = 0;

	// Ensure it's empty
	e_diceReveal.innerHTML = "";

	// Play challenge sound
	if (options.playSounds) {
		var audio = new Audio('audio/challenge.mp3');
		audio.play();
	}

	// Loop through number of players counting number of die and create HTML string
	var s1 = "";
	var s2 = "";
	for (var i = 0; i < gameInfo.activePlayerDeviceIds.length; i++) {
		for (var j = 0; j < gameInfo.starting_dice; j++) {
			// May the odds be ever in your favour
			var die = players[gameInfo.activePlayerDeviceIds[i]].dice[j];
			if (die == gameInfo.currentBidDie || (options.onesAreWild && die == 1)) {
				actual_number_of_die++;
				s1 += '<div class="die" style="background-position: ' + (die - 1) * 20 + '% 0; background-color: ' + players[gameInfo.activePlayerDeviceIds[i]].color + '"></div>';
			} else {
				s2 += '<div class="die" style="background-position: ' + (die - 1) * 20 + '% 0; background-color: ' + players[gameInfo.activePlayerDeviceIds[i]].color + '"></div>';
			}
		}
	}
	e_diceReveal.innerHTML += s1;
	e_diceReveal.innerHTML += s2;

	// Seperate the die of type that were bid from the rest of the die by adding two spacers, saving the position of the first one
	var spacer = e_diceReveal.insertBefore(document.createElement('br'), e_diceReveal.children[actual_number_of_die]);
	spacer = e_diceReveal.insertBefore(document.createElement('br'), spacer);

	// Add count in numbers after die
	if (actual_number_of_die !== 0) {
		e_diceReveal.insertBefore(document.createElement('span'), spacer).innerHTML = '(' + actual_number_of_die + ')';
	} else {
		e_diceReveal.insertBefore(document.createElement('span'), spacer).innerHTML = 'There were no die of that type';
	}

	// Check challenge
	if (actual_number_of_die < gameInfo.currentBidQuantity) {
		// Challenger was correct
		players[device_id].points++;

		// Display challenge
		e_current.innerHTML = playerStringWithColor(device_id, players[device_id].color) + ' challenged ' + playerStringWithColor(gameInfo.currentBidderdevice_id, gameInfo.currentBidderColor) + '<span style="color: #008000; font-weight: bold"> correctly!</span>';

		// Set bidder to gameInfo.nextPlayerDeviceId
		gameInfo.nextPlayerDeviceId = gameInfo.currentBidderdevice_id;
	} else {
		// Bidder was correct
		players[gameInfo.currentBidderdevice_id].points++;

		// Display challenge
		e_current.innerHTML = playerStringWithColor(device_id, players[device_id].color) + ' challenged ' + playerStringWithColor(gameInfo.currentBidderdevice_id, gameInfo.currentBidderColor) + '<span style="color: #B22222; font-weight: bold"> incorrectly!</span>';
	}

	gameInfo.inProgress = false;

	// Remove marker
	document.getElementById(device_id).children[0].innerHTML = '';

	// Update subtitle
	e_subtitle.innerHTML = 'Waiting for ' + playerStringWithColor(air_console.getMasterControllerDeviceId(), players[air_console.getMasterControllerDeviceId()].color) + ' to start the next round';

	// UPDATE ALL THE THINGS!
	updatePoints();
	updateControllers();
}

function updateControllers() {
	// Sends all controllers information about their game state
	var device_ids = air_console.getControllerDeviceIds();
	for (var i = 0; i < device_ids.length; i++) {
		updateController(device_ids[i]);
	}
}

function updateController(device_id) {
	air_console.message(device_id, {
		action: MESSAGES.info,
		playerInfo: players[device_id],
		gameInfo: gameInfo,
		options: options
	});
}

function shakeControllersDice() {
	// Visually shakes all the dice on the controllers
	var device_ids = air_console.getControllerDeviceIds();
	for (var i = 0; i < device_ids.length; i++) {
		shakeControllerDice(device_ids[i]);
	}
}

function shakeControllerDice(device_id) {
	air_console.message(device_id, {
		action: MESSAGES.shake
	});
}

function alertController(device_id) {
	air_console.message(device_id, {
		action: MESSAGES.alert
	});
}

function updatePoints() {
	// Redefine e_playersHeaders as have probably edited innerHTML of #players
	e_playersHeaders = document.getElementById('playersHeaders');
	// Update table to show points columns
	e_playersHeaders.children[4].innerHTML = 'Points';

	// Go through players
	for (var i = 0; i < gameInfo.activePlayerDeviceIds.length; i++) {
		// Find player's points and associated element in #players
		var playerPoints = players[gameInfo.activePlayerDeviceIds[i]].points;
		var e_playerPoints = document.getElementById(gameInfo.activePlayerDeviceIds[i]).children[4];

		// Display the score
		e_playerPoints.innerHTML = playerPoints;
	}
}

function updateOptions() {
	// Go through options object, updating DOM to reflect any changes
	for (var i = 0; i < Object.keys(options).length; i++) {
		var option_e = document.getElementById('options_' + Object.keys(options)[i]);
		if (option_e.innerHTML !== null && options[Object.keys(options)[i]] === true) {
			option_e.innerHTML = '✓';
		} else {
			option_e.innerHTML = '✖';
		}
	}

	// Pause/play background music according to playSounds option
	if (options.playSounds) {
		backgroundMusic.play();
	} else {
		backgroundMusic.pause();
	}

	updateControllers();
}

function updatePlayerList() {
	// Reset to default
	e_players.innerHTML = '<thead><tr id="playersHeaders"><th></th><th>Username</th><th></th><th></th><th></th></tr></thead>';

	// Iterate over players, adding them in order
	for (var i = 0; i < Object.keys(players).length; i++) {
		e_players.innerHTML += '<tbody><tr id="' + Object.keys(players)[i] + '"><td></td><td>' + playerStringWithColor(Object.keys(players)[i], players[Object.keys(players)[i]].color) + '</td><td></td><td></td><td></td></tr></tbody>';
	}
}

// Show/hide instructions
function toggleInstructions() {
	// Toggle whether to show instructions
	showInstructions = !showInstructions;

	if (showInstructions) {
		e_players.style.display = 'none';
		e_gameInfoContainer.style.display = 'none';
		e_options.style.display = 'none';
		e_instructions.style.display = 'block';
	} else {
		e_instructions.style.display = 'none';
		e_players.style.display = 'table';
		e_gameInfoContainer.style.display = 'block';
		e_options.style.display = 'block';
	}
}

window.onload = init;
