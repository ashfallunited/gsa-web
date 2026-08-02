# Matchday Stat Sheet

A paper form for the statistician to fill in during the game, then transcribe into the
admin site (`/admin/analytics/matches/[id]`) afterward. Print Section 2 and 3 in
**landscape** — they're wide.

Every column below is named to match the admin site's Player Stats form exactly, so
transcription at the end is a 1:1 copy, not a translation exercise.

---

## Section 1 — Match Info

Fill in before kickoff. Matches the "Match Details" fields on the admin site.

| Field | Value |
|---|---|
| Team | |
| Season | |
| Competition / League | |
| Date | |
| Opponent | |
| Home / Away / Neutral | |
| Kickoff time | |
| Statistician name | |

Final score (fill in after the match):

| Goals For | Goals Against |
|---|---|
| | |

---

## Section 2 — Live Tracking Sheet

One row per player. Use **tally marks** (`|` `||` `|||` `||||` `✂` for 5) in each stat
column throughout the match — don't stop to count, just mark. Convert tallies to final
numbers in Section 4 after the game.

Track **Minutes**, **Started**, and card events precisely (they need exact minute
numbers later); tally the rest.

| # | Player | Started (Y/N) | Sub On (min) | Sub Off (min) | Shots | Shots on Target | Key Passes | Tackles Won | Interceptions | Clearances | Fouls Committed | Fouls Won |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |

*(Add/remove rows to match squad size. Duplicate this page if you're tracking more
than ~18 players.)*

---

## Section 3 — Goal, Assist, Card & Penalty Log

These need to be logged **the moment they happen**, with the minute — don't try to
reconstruct this from memory after the match. One row per event.

| Minute | Player | Event (Goal / Assist / Yellow / Red) | Goal type (Header / Left Foot / Right Foot / Outside Box / n/a) | Notes |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

**Penalties** (taken by either side, log separately):

| Minute | Player | Taken | Scored? (Y/N) | If GK: Faced | Saved? (Y/N) |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |

---

## Section 4 — Post-Match Summary (transcribe into the admin site from here)

For each player who saw the pitch, fill in the final numbers. Column groups mirror the
three sections of the admin "Player Stats" grid exactly: **Basic**, **Goal Breakdown**,
**Penalty Stats**, **Match Stats**.

### Basic

| Player | Started | Min | G | A | Y | R |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |

### Goal Breakdown

Only fill in for players who scored. Total across the four columns should not exceed
that player's Goals count above.

| Player | Header | Left Foot | Right Foot | Out of Box |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

### Penalty Stats

Only fill in for players who took or faced a penalty.

| Player | Taken | Scored | Saved | Faced |
|---|---|---|---|---|
| | | | | |
| | | | | |

### Match Stats

Transcribed from the Section 2 tallies.

| Player | Shots | Shots on Target | Key Passes | Tackles Won | Interceptions | Clearances | Fouls Committed | Fouls Won |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

**Goal Minutes** and **Assist Minutes** (comma-separated, per player who scored/assisted
— pull straight from Section 3):

| Player | Goal minutes | Assist minutes |
|---|---|---|
| | | |
| | | |

---

## Field Legend

| Abbreviation | Meaning |
|---|---|
| Min | Minutes played |
| G | Goals |
| A | Assists |
| Y | Yellow cards |
| R | Red cards |
| Header / Left Foot / Right Foot / Out of Box | How each goal was scored — breakdown of the Goals total |
| Taken / Scored / Saved / Faced (Penalties) | Penalties this player took, and — if a goalkeeper — penalties they faced and saved |
| Shots | Total shot attempts |
| Shots on Target | Of those shots, how many were on frame |
| Key Passes | Passes that directly led to a shot (didn't have to be a goal) |
| Tackles Won | Tackles that won the ball cleanly |
| Interceptions | Passes cut out before reaching the intended receiver |
| Clearances | Defensive clearances out of danger |
| Fouls Committed | Fouls this player gave away |
| Fouls Won | Fouls won by this player (drawn from an opponent) |

---

## Data Entry Steps

1. Go to `/admin/analytics/matches` and open (or create) the match.
2. Fill in **Match Details** from Section 1, save.
3. In **Player Stats**, for each player in the squad, enter the **Basic** row (Started,
   Min, G, A, Y, R) from Section 4.
4. Expand **Match & Goal Detail** on that player's row and fill in **Match Stats**,
   **Goal Breakdown**, and **Penalty Stats** from the corresponding Section 4 tables.
5. If the player scored or assisted, fill in **Goal Minutes** / **Assist Minutes** from
   Section 3.
6. Click **Save Stats**. Repeat for every player who appeared.
7. Double check the final score under Match Details matches Section 1, then set
   **Status** to **Final** once you're confident the sheet is fully transcribed —
   finalizing locks the match for non-super-admins.
