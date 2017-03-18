// Create AirConsole instance
var air_console = null;

// Get DOM elements
var e_liveGame = document.getElementById('liveGame');
var e_rightText = document.getElementById('rightText');
var e_leftText = document.getElementById('leftText');
var e_controls = document.getElementById('controls');
var e_controls_startRound = document.getElementById('controls_startRound');
var e_controls_onesAreWild = document.getElementById('controls_onesAreWild');
var e_controls_playSounds = document.getElementById('controls_playSounds');
var e_controls_toggleInstructions = document.getElementById('controls_toggleInstructions');
var e_dice = document.getElementById('dice');
var e_bid = document.getElementById('bid');
var e_bidQuantity = document.getElementById('bidQuantity');
var e_bidDie = document.getElementById('bidDie');
var e_placeBid = document.getElementById('placeBid');
var e_invalidBid = document.getElementById('invalidBid');
var e_challengeBid = document.getElementById('challengeBid');

var player_color = '#C70D02';
var dice_hidden = false;

var playerInfo = {};
var gameInfo = {};
var options = {};

var init = function() {
    air_console = new AirConsole({
        orientation: AirConsole.ORIENTATION_PORTRAIT
    });

    air_console.onReady = function() {
        air_console.message(AirConsole.SCREEN, {
            action: MESSAGES.getInfo
        });
    };

    air_console.onMessage = function(device_id, data) {
        if (device_id === AirConsole.SCREEN && data.action === MESSAGES.info) {
            playerInfo = data.playerInfo;
            gameInfo = data.gameInfo;
            options = data.options;
            updateState();
        } else if (device_id === AirConsole.SCREEN && data.action === MESSAGES.alert) {
            alertUser();
        } else if (device_id === AirConsole.SCREEN && data.action === MESSAGES.shake) {
            shakeDice();
        }
    };
};

function updateState() {
    // Set UI to user's color
    if (player_color != playerInfo.color) {
        player_color = playerInfo.color;
        setCSSColor();
    }

    // Show options to masterController if game is not in progress
    if (air_console.getMasterControllerDeviceId() == air_console.getDeviceId() && !gameInfo.inProgress) {
        e_controls.style.display = "block";
    } else {
        e_controls.style.display = "none";
    }

    // Update options
    if(options.onesAreWild) {
        e_controls_onesAreWild.className = 'button enabled';
    } else {
        e_controls_onesAreWild.className = 'button disabled';
    }
    if(options.playSounds) {
        e_controls_playSounds.className = 'button enabled';
    } else {
        e_controls_playSounds.className = 'button disabled';
    }

    // If game is in progress and player has dice
    if (gameInfo.inProgress && playerInfo.numberOfDice !== 0) {
        e_bid.style.display = "block";
    } else {
        e_bid.style.display = "none";
    }

    // Display the user's dice or a message if they don't have any
    e_dice.innerHTML = "";
    if (playerInfo.numberOfDice !== 0 && gameInfo.inProgress) {
        if(dice_hidden) {
            e_dice.innerHTML = '<p class="button">Dice hidden, tap to show</p>';
        } else {
            for (var i = 0; i < playerInfo.numberOfDice; i++) {
                e_dice.innerHTML += '<div class="die" style="background-position: ' + (playerInfo.dice[i] - 1) * 20 + '% 0"></div>';
            }
        }
    } else {
        if(air_console.getControllerDeviceIds().length <= 1) {
            e_dice.innerHTML = '<h2>Waiting for more players</h2>';

        } else {
            e_dice.innerHTML = '<h2>Waiting for next round</h2>';
        }
    }

    if(playerInfo.numberOfDice !== 0 && gameInfo.currentBidQuantity === 0) {
        // Reset numberInputs
        e_bidQuantity.children[1].innerHTML = '1';
        e_bidDie.children[1].innerHTML = '1';
    }

    if (playerInfo.numberOfDice === 0) {
        // Show username and hide bidding area
        e_rightText.innerHTML = playerStringWithColor(air_console.getDeviceId(), playerInfo.color, '█');
        e_bid.style.display = "none";
    } else if(gameInfo.inProgress === true) {
        // Update current bid indicator
        if (gameInfo.currentBidQuantity == 1) {
            e_rightText.innerHTML = 'BID: ' + gameInfo.currentBidQuantity + ' ' + gameInfo.currentBidDie + ' <span style="color: ' + gameInfo.currentBidderColor + '">█</span>';
        } else if (gameInfo.currentBidQuantity !== 0) {
            e_rightText.innerHTML = 'BID: ' + gameInfo.currentBidQuantity + ' ' + gameInfo.currentBidDie + '\'s <span style="color: ' + gameInfo.currentBidderColor + '">█</span>';
        } else {
            e_rightText.innerHTML = playerStringWithColor(air_console.getDeviceId(), playerInfo.color, '█');
        }
    } else {
        // Update current bid indicator
        e_rightText.innerHTML = playerStringWithColor(air_console.getDeviceId(), playerInfo.color, '█');
        e_bid.style.display = "none";
    }

    // Make sure bidQuantity is at least currentBidQuantity
    if (Number(e_bidQuantity.children[1].innerHTML) < gameInfo.currentBidQuantity) {
        e_bidQuantity.children[1].innerHTML = gameInfo.currentBidQuantity;
    }

    updateBid();
}

function shakeDice() {
    // Visually shake dice by adding css classes
    var dice = document.getElementsByClassName('die');
    for(var i = 0; i < dice.length; i++) {
        dice[i].className = "die shake-crazy";
        dice[i].style.filter = "blur(2vw)";
    }

    setTimeout(stopShakeDice, 1000);

    // Play shaking dice audio
    if(options.playSounds) {
        var audio = new Audio('audio/dice.mp3');
        audio.play();
    }

    // Vibrate the controller (if possible)
    if(window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
}

function stopShakeDice() {
    var dice = document.getElementsByClassName('die');
    for(var i = 0; i < dice.length; i++) {
        dice[i].className = "die";
        dice[i].style.filter = "none";
    }
}

// To be called when it's the user's turn
function alertUser() {
    // Play alert audio
    if(options.playSounds) {
        var audio = new Audio('audio/alert.mp3');
        audio.play();
    }

    // Vibrate the controller (if possible)
    if(window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
}

function setCSSColor() {
    // Edit controller.css to set the user's color
    for (var i = 0; i < document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if (sheet.href !== null && sheet.href.endsWith("controller.css")) {
            var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
            // Set background-color of die to user's color
            for (var j = 0; j < rules.length; j++) {
                if (rules[j].selectorText == ".die") {
                    rules[j].style["background-color"] = playerInfo.color;
                }
            }
        }
    }
}

function updateBid() {
    // Update the bid message for singluar/plural
    if (Number(e_bidQuantity.children[1].innerHTML) == 1) {
        e_bid.children[0].innerHTML = 'I think there is';
        e_bid.children[3].innerHTML = '';
    } else {
        e_bid.children[0].innerHTML = 'I think there are';
        e_bid.children[3].innerHTML = '\'s';
    }

    if (gameInfo.nextPlayerDeviceId == air_console.getDeviceId()) {
        // If it's the user's turn...
        if (Number(e_bidQuantity.children[1].innerHTML) > gameInfo.currentBidQuantity || (Number(e_bidQuantity.children[1].innerHTML) == gameInfo.currentBidQuantity && Number(e_bidDie.children[1].innerHTML) > gameInfo.currentBidDie)) {
            // Show placeBid button if bid is valid
            e_placeBid.style.display = "inline-block";
            e_invalidBid.style.display = "none";
        } else {
            // Show invalidBid if bid is invalid
            e_placeBid.style.display = "none";
            e_invalidBid.style.display = "inline-block";
        }

        if(gameInfo.currentBidderdevice_id !== null) {
            // Show challengeBid button if user can challenge
            e_challengeBid.style.display = "inline-block";
        } else {
            // Hide e_challengeBid if user can't challenge
            e_challengeBid.style.display = "none";
        }
    } else {
        // Hide all the buttons
        e_placeBid.style.display = "none";
        e_invalidBid.style.display = "none";
        e_challengeBid.style.display = "none";
    }
}

// Toggle dice
e_dice.addEventListener('click', function() {
    dice_hidden = !dice_hidden;
    updateState();
});

// Start round button
e_controls_startRound.addEventListener('click', function() {
    e_controls.style.display = "none";
    air_console.message(AirConsole.SCREEN, {
        action: MESSAGES.start
    });
});

// 1's are wild button
e_controls_onesAreWild.addEventListener('click', function() {
    options.onesAreWild = !options.onesAreWild;

    air_console.message(AirConsole.SCREEN, {
        action: MESSAGES.changeOptions,
        options: options
    });

    updateState();
});

// Music button
e_controls_playSounds.addEventListener('click', function() {
    options.playSounds = !options.playSounds;

    air_console.message(AirConsole.SCREEN, {
        action: MESSAGES.changeOptions,
        options: options
    });

    updateState();
});

// Instructions button
e_controls_toggleInstructions.addEventListener('click', function() {
    air_console.message(AirConsole.SCREEN, {
        action: MESSAGES.toggleInstructions,
    });
});

// Bid button
e_placeBid.addEventListener('click', function() {
    // Hide all the buttons
    e_placeBid.style.display = "none";
    e_invalidBid.style.display = "none";
    e_challengeBid.style.display = "none";

    // Get quantity and die
    var quantity = Number(e_bidQuantity.children[1].innerHTML);
    var die = Number(e_bidDie.children[1].innerHTML);

    // Check bid is valid, then send bid to screen or inform user
    if (quantity > gameInfo.currentBidQuantity || (quantity == gameInfo.currentBidQuantity && die > gameInfo.currentBidDie)) {
        air_console.message(AirConsole.SCREEN, {
            action: MESSAGES.bid,
            bid: {
                quantity: quantity,
                die: die
            }
        });
    } else {
        // Shouldn't be possible - just in case
        console.warn("Failed bid checks");
        updateBid();
    }
});

// Challenge button
e_challengeBid.addEventListener('click', function() {
    // Hide all the buttons
    e_placeBid.style.display = "none";
    e_invalidBid.style.display = "none";
    e_challengeBid.style.display = "none";

    air_console.message(AirConsole.SCREEN, {
        action: MESSAGES.challenge
    });
});

// Quantity numberInput
e_bidQuantity.children[0].addEventListener('click', function() {
    e_bidQuantity.children[1].innerHTML++;
    updateBid();
});
e_bidQuantity.children[2].addEventListener('click', function() {
    // Check not going below previous bid and not going below 1
    if (Number(e_bidQuantity.children[1].innerHTML) > gameInfo.currentBidQuantity && Number(e_bidQuantity.children[1].innerHTML) > 1) {
        e_bidQuantity.children[1].innerHTML--;
    }
    updateBid();
});

// Die numberInput
e_bidDie.children[0].addEventListener('click', function() {
    // Check not going beyond sides_on_die
    if (Number(e_bidDie.children[1].innerHTML) < gameInfo.sides_on_die) {
        e_bidDie.children[1].innerHTML++;
        updateBid();
    }
});
e_bidDie.children[2].addEventListener('click', function() {
    // Check not going below 1
    if (Number(e_bidDie.children[1].innerHTML) > 1) {
        e_bidDie.children[1].innerHTML--;
        updateBid();
    }
});

window.onload = init;
