# Tournament Manager Requirements

## Overview

A standalone web-based Tournament Manager for local apartment tournaments.

Supports multiple sports (Badminton, Table Tennis, Chess) with dynamic category management.

## Supported Sports

| Sport | Icon | Singles | Doubles | Player Range |
|-------|------|---------|---------|--------------|
| Badminton | 🏸 | Yes | Yes | 2-20 |
| Table Tennis | 🏓 | Yes | Yes | 2-32 |
| Chess | ♟ | Yes | No | 2-50 |

Each sport has configurable settings via `SPORT_CONFIG`:
- Group stage points to win
- Knockout points to win
- Number of sets in final
- Group thresholds and counts

## Tournament Categories

Categories are dynamic — users can add/delete categories via the Manage panel.

Default factory categories:
- Junior (Singles)
- Junior Doubles
- Senior Boys (Singles)
- Senior Girls (Singles)
- Senior Doubles

Players may participate in multiple categories (e.g., same player in Senior Boys + Senior Doubles).

Singles: 2-20 players per tournament.
Doubles: 2-20 teams per tournament (each team = 2 players, auto-named from player names).

The application generates groups, fixtures, standings, qualification, knockout rounds, champion, and runner-up automatically.

## Goals

- Easy tournament setup
- Random player allocation
- Automatic fixture generation
- Automatic standings calculation
- Automatic qualification to knockout stages
- Visual knockout bracket
- Mobile-friendly interface
- Save and resume tournament progress (localStorage + cloud)
- Champion and runner-up photos (optional)

## Tournament Categories

All categories share the same tournament engine (groups, round-robin, standings, knockout). The only difference is the unit of entry:

| Category | Type | Unit |
|---|---|---|
| Junior | Singles | Individual player |
| Junior Doubles | Doubles | Team of 2 players |
| Senior Boys | Singles | Individual player |
| Senior Girls | Singles | Individual player |
| Senior Doubles | Doubles | Team of 2 players |

- Junior/Senior is a label only — no age validation.
- Each category stores its own state independently in localStorage.
- Player can appear in multiple categories (e.g., Senior Boys + Senior Doubles) — names are re-entered per category.

## Tournament Formats

### 2-5 Players
- Group Stage: Single group, Round Robin format
- Qualification: Top 2 players qualify
- Knockout: Direct Final (Rank 1 vs Rank 2)

### 6-10 Players
- Group Stage: 2 groups
- Players allocated randomly and evenly
- Qualification: Top 2 players from each group qualify
- Knockout: Semi Finals
  - Group A Rank 1 vs Group B Rank 2
  - Group B Rank 1 vs Group A Rank 2
- Final: Winner SF1 vs Winner SF2

### 11-20 Players
- Group Stage: 4 groups
- Players allocated randomly and evenly
- Qualification: Top 2 players from each group qualify
- Knockout:
  - Quarter Finals: A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2
  - Semi Finals: Winner QF1 vs Winner QF3, Winner QF2 vs Winner QF4
  - Final: Winner SF1 vs Winner SF2

## Player Management

### Singles (Junior, Senior Boys, Senior Girls):
- Enter individual player names
- 2-20 players
- Default: Player 1, Player 2, ... Player N

### Doubles (Junior Doubles, Senior Doubles):
- Enter teams — each team = 2 player names
- 2-20 teams (4-40 individual entries)
- Team auto-named from player names (e.g., "Amit & Rohan")
- Default: Team 1 (Player A, Player B), Team 2 (...)

## Validation

- Minimum: 2 players (singles) or 2 teams (doubles)
- Maximum: 20 players (singles) or 20 teams (doubles)

## Group Allocation

Applies to both singles (players) and doubles (teams). "Players" below means "players or teams".

### Rules
- 2-5 entries → 1 group (single round robin)
- 6-10 entries → 2 groups
- 11-20 entries → 4 groups

### Allocation Method
- Random allocation
- Balanced distribution across groups

## Fixture Generation

### Group Stage
Generate all round-robin matches within a group.

Example (Group of 3):
- P1 vs P2
- P1 vs P3
- P2 vs P3

Example (Group of 4):
- P1 vs P2
- P1 vs P3
- P1 vs P4
- P2 vs P3
- P2 vs P4
- P3 vs P4

### Match Scheduling
Phase 1:
Generate a match sequence that alternates groups.

Example:
- A Match 1
- B Match 1
- A Match 2
- B Match 2

For 4 groups:
- A Match 1, B Match 1, C Match 1, D Match 1
- A Match 2, B Match 2, C Match 2, D Match 2

Goal:
- Reduce back-to-back matches for the same player
- Distribute matches evenly

### Match Entry

Scoring rules depend on the round:

| Stage | Format | Target Score |
|---|---|---|
| Group Stage | Single Set | First to 13 points |
| Semi Finals | Single Set | First to 13 points |
| Final | Best of 3 | Each set first to 11 points |

Single Set entry:
- Player A Score
- Player B Score
- Winner calculated automatically.

Best of 3 entry:
- Set 1 Score
- Set 2 Score
- Set 3 Score (if needed)
- Winner calculated automatically (first to 2 sets).

## Standings

For each player calculate:
- Played
- Won
- Lost
- Points For
- Points Against
- Point Difference
- Rank

Formula:
- Point Difference = Points For - Points Against

### Ranking Rules (Tie Break Order)
1. Matches Won
2. Point Difference
3. Head-to-Head
4. If still tied: Points For

## Qualification

Automatically determine:

Single Group: Rank 1, Rank 2
Two Groups: A1, A2, B1, B2
Four Groups: A1, A2, B1, B2, C1, C2, D1, D2

## Knockout Bracket

Automatically populate knockout participants.
Winner of each knockout match advances automatically.

Display:
- Quarter Finals
- Semi Finals
- Final
- Champion

Display tournament winner prominently.

Example:
🏆 Champion: Braj Kishore

## Photo Support (Champion & Runner-up)

After a tournament completes, the user may optionally add photos:
- Champion photo
- Runner-up (finalist) photo

Implementation:
- `<input type="file" accept="image/*">` opens camera or gallery
- Image read via FileReader.readAsDataURL() → base64 string
- Stored in localStorage alongside tournament state
- Displayed on the champion/finalist results screen

Not blocking — user can skip photos and still complete the tournament.

## Persistence

### Save Tournament
Store data in browser localStorage.

Persist:
- Players
- Groups
- Fixtures
- Scores
- Standings
- Knockout Progress

### Cloud Storage (Optional)
- Supabase integration for cross-device sync
- Per-category state stored in `state` table
- Categories stored in `state` table with key `btm_categories`
- Real-time updates via Supabase Realtime

### Export
Future enhancement:
- Export PDF
- Export Excel
- Print Fixtures
- Print Standings

## Technical Architecture

### Four-Layer Separation
```
js/
  engine/     — Pure business logic. No DOM, no storage.
  models/     — Domain types + sport configuration.
  storage/    — Persistence. localStorage + Supabase.
  ui/         — DOM rendering + event handling. Calls only tournamentEngine API.
```

### AppState Structure
```js
AppState = {
  user,           // User info (future use)
  event,          // Current event name
  sport,          // Current sport (badminton/tableTennis/chess)
  category,       // Current category ID
  view,           // Current view (home/event/sport/setup/groups/fixtures/knockout/champion)
  tournament,     // Current tournament state
  isAdmin,        // Admin mode flag
  ui: {
    showingResults,     // Results overlay visibility
    managePanelOpen     // Manage panel visibility
  }
}
```

### Sport Configuration
Each sport configured in `SPORT_CONFIG`:
```js
badminton: {
  displayName: "Badminton",
  icon: "🏸",
  supportsDoubles: true,
  teamBased: false,
  minPlayers: 2,
  maxPlayers: 20,
  groupPointsToWin: 13,
  knockoutPointsToWin: 11,
  finalSets: 3,
  finalPointsToWin: 11,
  maxScoreInput: 30,
  maxFinalSetInput: 15,
  groupThresholds: [5, 10, 20],
  groupCounts: [1, 2, 4]
}
```

### App Configuration
```js
APP_CONFIG = {
  defaultEvent: "BREN AVALON SPORTS MEET 2026"
}
```

## Non-Functional Requirements

- Mobile friendly
- Responsive design
- Fast loading
- No external dependencies required
- Easy for non-technical users
- Support tournament completion in a single session

## Future Enhancements

- Multiple courts support
- Live scoreboard
- QR code sharing
- Online multiplayer management
- ELO rating system
- Tournament history
- Export PDF / Excel