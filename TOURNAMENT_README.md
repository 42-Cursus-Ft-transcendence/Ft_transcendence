# Tournament Ranked System Documentation

## Overview

The tournament system adds ranked matchmaking functionality to your Pong game. Players have ELO ratings that change based on their wins and losses against other players.

## Features

- **ELO Rating System**: Uses standard ELO calculations with K-factor of 32
- **Smart Matchmaking**: Matches players with similar ELO ratings (±200 points)
- **Fallback Matching**: After 30 seconds of waiting, matches with any available player
- **Database Persistence**: Tracks player rankings, match history, and ELO changes
- **Blockchain Integration**: Posts scores to blockchain like regular matches

## Database Tables

### PlayerRanking
- `userId`: Player ID (foreign key to User table)
- `elo`: Current ELO rating (starts at 1200)
- `wins`: Number of wins
- `losses`: Number of losses
- `gamesPlayed`: Total games played
- `lastMatchDate`: Date of last match

### RankedMatch
- `matchId`: Unique match identifier
- `player1Id`, `player2Id`: Player IDs
- `player1Score`, `player2Score`: Final scores
- `winnerId`: Winner's user ID (null for draws)
- `player1EloChange`, `player2EloChange`: ELO changes for each player
- `matchDate`: When the match was played

## WebSocket API

### Starting a Ranked Match
```javascript
socket.send(JSON.stringify({
  type: "start",
  vs: "ranked"
}));
```

### Responses
```javascript
// Waiting for opponent
{
  type: "rankedWaiting",
  currentElo: 1250,
  rank: 42
}

// Match found
{
  type: "rankedMatchFound",
  gameId: "uuid-here",
  youAre: "p1" | "p2",
  opponent: {
    userName: "OpponentName",
    elo: 1180
  }
}

// Match completed
{
  type: "rankedMatchOver",
  gameId: "uuid-here",
  score: [3, 2],
  eloChanges: {
    p1: { playerId: 123, oldElo: 1200, newElo: 1216, eloChange: 16 },
    p2: { playerId: 456, oldElo: 1180, newElo: 1164, eloChange: -16 }
  },
  duration: 45000
}
```

### Game Input
```javascript
socket.send(JSON.stringify({
  type: "input",
  vs: "ranked",
  dir: "up" | "down" | "stop"
}));
```

### Stopping Game/Leaving Lobby
```javascript
// Stop current ranked match
socket.send(JSON.stringify({
  type: "stop",
  vs: "ranked"
}));

// Leave ranked waiting lobby
socket.send(JSON.stringify({
  type: "stoplobby",
  vs: "ranked"
}));
```

## HTTP API

### Get Leaderboard
```
GET /api/leaderboard?limit=10
```

Response:
```json
[
  {
    "userName": "Player1",
    "elo": 1350,
    "wins": 15,
    "losses": 8,
    "gamesPlayed": 23
  },
  ...
]
```

## Frontend Integration Example

```javascript
// Add ranked button to your menu
const rankedBtn = document.createElement('button');
rankedBtn.textContent = 'Ranked Match';
rankedBtn.addEventListener('click', () => {
  socket.send(JSON.stringify({ type: "start", vs: "ranked" }));
});

// Handle ranked-specific messages
socket.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  
  switch (msg.type) {
    case 'rankedWaiting':
      showWaitingScreen(msg.currentElo, msg.rank);
      break;
      
    case 'rankedMatchFound':
      showMatchFound(msg.opponent);
      break;
      
    case 'rankedMatchOver':
      showResults(msg.score, msg.eloChanges);
      break;
  }
});

// Fetch and display leaderboard
async function showLeaderboard() {
  const response = await fetch('/api/leaderboard?limit=10');
  const leaderboard = await response.json();
  // Display leaderboard...
}
```

## ELO Calculation

The system uses standard ELO rating calculations:

1. **Expected Score**: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
2. **New Rating**: `R'_A = R_A + K * (S_A - E_A)`

Where:
- `R_A`, `R_B` are current ratings
- `S_A` is actual score (1 for win, 0.5 for draw, 0 for loss)
- `K` is the K-factor (32)

## Matchmaking Algorithm

1. Find players with ELO difference ≤ 200 points
2. If no suitable opponent after 30 seconds, match with anyone
3. Remove both players from queue and start match
4. Update ELO ratings based on match result

## Security Notes

- All ranked matches require JWT authentication
- ELO updates are atomic database transactions
- Match results are posted to blockchain for transparency
- Player rankings are recalculated on each update
