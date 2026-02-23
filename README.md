# Colonist.io Resource Tracker

A browser extension that tracks your opponent's resources in real time during a 1v1 game on [colonist.io](https://colonist.io).

## How it works
The extension reads the game event feed and tracks resources gained and lost by your opponent, including dice rolls, trades, building, and stealing.

## Installation
1. Clone or download this repo
2. Go to `chrome://extensions` and enable **Developer Mode**
3. Click **Load unpacked** and select the extension folder
4. Navigate to colonist.io and start a 1v1 game
5. Click the extension icon to see your opponent's current resources

## Tracked Events
- Dice roll income
- Trades with bank and players
- Building roads, settlements, and cities
- Buying development cards
- Stealing and being stolen from
- Year of Plenty

## Limitations
- Only works for 1v1 games
- If a robber steals an unknown card, the tracker may become inaccurate
- Resources are not reset between games automatically
