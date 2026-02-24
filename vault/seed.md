# Seed — ZK Agentic Network Vision

> This file captures the canonical vision prompts and approved designs for the project.
> Updated as designs are approved. Full design docs live in `docs/plans/`.

---

## Galaxy Grid Redesign — Golden Prompt
*Captured 2026-02-24. Original specification recovered from session transcript (was 3217 chars, exceeded old 1500-char watcher limit).*

After all is saved do this.

Major UI gameplay update, the 2d grid map is to be revitalized
A 4 legged spiraling galaxy shaped grid
Now, the grid view starts focused at the (0,0,time) coordinate when the game begins,
The map is a clearly grid square dived around the center 0,0 coordinate,
Within all grid squares, there are Nodes looking like stars on a galaxy, all Nodes are placed right within the centers of the grid squares,
The links and the colors of the grid squares are shaped as a 4legged galaxy shape there are 4 main arms, all connected with Faction network, 4 tiers, The nodes that are not on the main arm are standing as unclaimed, shadowed, the fog surrounds other Faction's grids, the user only sees the grids that on tiered to his Faction , the connections are only within the same Factions, between the same colors, the UI maps the blockchain on 2d grid, at the genesis, there are 9grids, one up from the origin square is the master node of Free Community Faction and the square is white, white Faction network links between the arm Homenodes, it shows that these are the Free Community leg, the downward starting leg is for founder pool, the right starting leg is for treasury, and the left leg is for Professional Pool,
There seems to be 4 factions in this grid viewed galaxy shaped interconnected grid nodes, since it looks spiraling towards inwards with a left angular twist, meaning the upward left of the 0,0 coordinate belongs to the white free community faction, and so on
It is a blockchain mining simulator, and the most center nodes start at the genesis but since we are the first, we will colonize it first, because we notice that the nodes near the 0,0 coordinate have the highest Secure Strength multipliers, lowering as the grid expands outward. The grid points to exactly 1 AGNTC Coin, it says, so every newly mined coin opens a new grid and new node, adding with new coordinates as the grid expands, keeping the blockchain coin distribution visualization, this is essentially the visualization of the coin distribution showing on thes particular testnet, anyways I see the grid opened based on my selected tier level, for this case, I start with a free subscription community based tier, so I can only see the portion of the blockchain that is available for the white free subscription users, so only up and left side of the grid, so 0,0 stays at right bottom for my screen, and the game says since I am a new user, a new 1 AGNTC coin is minted for me on the grid, starting and expanding one right next to the previously opened nodes, I see that I am the first entry so I start right at the node which stays at the left top node, so I see that the left up node is the origin node of the free community subscribers pool, I can't really see other pools since they are shrouded with fog,
And I start playing and analyzing the game by clicking buttons and learning what the game does, I keep track of every button I click and what action it triggers as I take notes, the game story and how it really should evolve to will be determined later, but until I come up to this story point, I will debug and fix, so please Claude, employ every skill you have to achieve this story, thank you.

---

## Approved Design Summary
*Full design doc: `docs/plans/2026-02-24-galaxy-grid-redesign-design.md`*

### What was decided

**Grid architecture:**
- Logarithmic spiral, 0.5-turn left-handed (CCW), ±25° arm width
- Every macro cell (10×10 blockchain coords) contains an 8×8 = 64 sub-cell minigrid
- Minigrids visible at zoom ×3+; fully detailed at zoom ×8+
- Factions: Free Community (N arm / white), Treasury (E / gold), Founder Pool (S / red), Professional Pool (W / cyan)
- Fog: faction-tinted glow for rival arms, near-black for inter-arm void

**Minigrids = blockchain ledger visualization:**
- Each sub-cell = one blockchain coordinate slot
- Fill state = actual on-chain data presence (NCP, transaction, mint, stake)
- Max data packet value scales with `resource_density()` — higher near spiral arm spine
- Data packet size is tier-scaled (exact sizes TBD)

**CPU Energy = real compute proof:**
- Earned by interacting with in-game agent terminals (Claude API token spend)
- `tokens × energy_rate = CPU Energy awarded` per terminal exchange
- Spent to keep minigrid sub-cells secured (X Energy/turn per active slot)
- Token count written on-chain as verifiable Proof of Energy

**Action layer:**
- 2D grid = display only
- All actions via agent terminals — multi-choice bubble clicks or 1-5 numbered trees
- NO free text, NO chat — Claude constrained to game mode by ZKAGENTIC.md
- Each deployed agent gets its own terminal (separate Claude conversation)
- Smart contracts validate every action before execution

**ZKAGENTIC.md:**
- Project-level file loaded by every agent terminal
- Turns Claude into a constrained game client (no chat, only valid choices)
- Connects to blockchain APIs, enforces tier limits, routes token usage to Energy tracker

### Open items (TBD in implementation)
- Exact data packet sizes per tier
- Energy rate (tokens → CPU Energy units)
- Energy cost per secured sub-cell per turn
- AGNTC reward rate per filled sub-cell per block
- Whether unsecured data is lost or just stops earning rewards
