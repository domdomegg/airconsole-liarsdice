var PLAYER_COLORS = ['#C70D02', '#00AAE4', '#F3900F', '#B81381', '#4B0082',
                     '#00CCAA', '#F0349C', '#001662', '#B1C123', '#5574A6',
                     '#0BA84D', '#B37221', '#640000', '#353535', '#000000'];

// Messages to be sent between controller and screen via AirConsole API
var MESSAGES = {
    start: "start",
    info: "info",
    getInfo: "getInfo",
    bid: "bid",
    challenge: "challenge",
    shake: "shake",
    changeOptions: "changeOptions",
    toggleInstructions: "toggleInstructions",
    alert: "alert"
};

// Strings to show the user
var STRINGS = {

};

// Function to create player string with colored block - e.g. '<span style="color: #C70D02">■</span> Guest 1'. Block is programmable - for mobile full block(█) is more widley supported
function playerStringWithColor(device_id, color, block) {
    if(block === undefined) {
        block = '■';
    }
    return '<span style="color: ' + color + '">' + block + '</span> ' + air_console.getNickname(device_id);
}
