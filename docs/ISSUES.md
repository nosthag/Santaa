(This file for anyone try to pull request on it)
# ISSUE
---
## FIXED ISSUE OR CURRENTLY REVIEWED

### [ISSUES-001]: Fishing cooldown
 - **Status**: Fixed
 - **Detail**: Cooldown logic adjusted so exceeding 5 catches sets a 1-hour cooldown; users receive a message when limit reached or if cooldown active.
- **Steps to reproduce**:
    1. Start fishing
    2. Click the fishing button more than 5 times (exceed the limit)
    3. Notice that the cooldown is not triggered

### [ISSUES-002]: sell item
 - **Status**: Reviewed
 - **Detail**: Selling currently not added but some item have type "sellable" have sell button that Im accidentally add

### [ISSUES-003]: fish.js in wrong locate
 - **Status**: Fixed
 - **Detail**: Before moving, `fish.js` currently runs fine in `src/commands/EconomicCMD/`. `src/index.js` loads both `commands` and `minigames`, so leaving it in `EconomicCMD` avoids breaking behavior.

### [ISSUES-004]: Cannot equip than one item
 - **Status**: Fixed
 - **Detail**: Added `unequipItem()` to `database/rpgmanager.js` and adjusted `inventory` equip/sell handlers so equipping replaces previous item and selling an equipped item unequips it.

### [ISSUES-005]: "ephemeral" for interaction response options is deprecated
- **Status**: Not necessary to fix
- **Detail**: the library shifted to managing message visibility via bitfield flags

### [ISSUES-006]: Jobs embed when using `Zjob work` its not optimized
- **Status**: Fixed
- **Detail**: The work flow currently sends the minigame result and the job result as two separate embeds. The output feels noisy and makes the reward summary harder to read.

### [ISSUES-007]: Jobs penalty minigame currently only have left and right
- **Status**: Fixed
- **Detail**: The penalty kick minigame only accepts `left` and `right`, so the interaction feels too limited and repetitive.

### [ISSUES-008]: Networth only calculate the user's earnings and bank balance not total money they earn
- **Status**: Fixed
- **Detail**: The current balance view only sums the available balance and bank balance. It does not reflect total lifetime earnings or other tracked assets, so the displayed net worth can be misleading.

### [ISSUE-009]: All command use cooldown have time too short
- **Status**: Fixed
- **Detail**: Because of testing bot, Im have to set cooldown for a short time to easy testing

### [ISSUE-010]: Cooldown sometime not work
- **Status**: Fixed
- **Detail**: Before fixed I make cooldownconfig.js but its literally useless lol, v1.0.1 STABLE had fixed it

### [ISSUE-011]: The job embed too complicated and many useless info and job names repeat twice
- **Status**: Fixed
- **Detail**: The embed too long than average command I make, also the job name repeat twice

### [ISSUE-012]: Currency emoji on Balance canvas cannot render emoji
- **Status**: Fixed
- **Detail**: the canvas not supporting emoji lol

---
## STILL NOT FIX OR OTHER ISSUE
### [ISSUE-013]: Not found
---
# BUG

### [BUG-000]: Non-bug currently found
