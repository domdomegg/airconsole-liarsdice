# Liar's Dice

Liar's dice with points rather than losing dice, created for AirConsole.

## How to play

Each player gets five dice, which are rolled at the beginning of each round. You are only allowed to see your dice.

Players take it in turns to bid, guessing how many of a certain type of dice there are among all the players. The current player is indicated with ➤. If a player thinks that the last person's bid was wrong, they can challenge it.

By default, ones (⚀) are wild. This means that they can count towards the total of any number. The player who starts the game can change the options to change this.

### Bidding

The bid always has to be raised, either the value of the dice (1 is lowest, 6 is highest) or the quantity of dice, or both.

For example, if the first player bid 4 2's - they think that there are four dice showing ⚁ (and ⚀ if ones are wild),

The next player could bid:
* 4 3's (raising the value of the dice)
* 5 2's (raising the quantity)
* 5 4's (both)

The next player couldn't bid:
* 4 1's (lowering the value of the dice)
* 3 2's (lowering the quantity)
* 3 4's (lowering the quantity, although raising the value)

The game will automatically make sure your bid is valid before you can place it.


### Challenging

When someone challenges the last bid, all the dice in play are shown on the screen with a total, to see who was right. The person who was correct gets a point.

The player who was wrong will be the starting player in the next round.
