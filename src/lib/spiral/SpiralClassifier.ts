export type Faction = 'free_community' | 'treasury' | 'founder_pool' | 'professional_pool'
export type FogLevel = 'clear' | 'hazy' | 'hidden'

export interface CellClassification {
  faction: Faction | null   // null = inter-arm void
  fogLevel: FogLevel
  armStrength: number       // 0..1, 1 = on spine
  distanceFromCenter: number
}

// Arm origin angles (radians). N/E/S/W at center, twist CCW outward.
const ARM_ANGLES: Record<Faction, number> = {
  free_community:    Math.PI / 2,   // 90°  N
  treasury:          0,              // 0°   E
  founder_pool:     -Math.PI / 2,   // 270° S
  professional_pool: Math.PI,       // 180° W
}

const ARM_ENTRIES = Object.entries(ARM_ANGLES) as [Faction, number][]

const ARM_HALF_WIDTH = 25 * Math.PI / 180  // ±25°
// R_FLAT: inner flat zone radius. Below this, no spiral twist — genesis nodes stay in
// their cardinal faction arms. The spiral only applies for r > R_FLAT.
const R_FLAT = 30.0
const R_MAX = 324.0    // grid boundary (±3240 blockchain / 10 NODE_GRID_SPACING)
const SPIRAL_TURNS = 0.5  // half-turn CCW from R_FLAT to R_MAX

function spiralOffset(r: number): number {
  if (r <= R_FLAT) return 0
  return SPIRAL_TURNS * 2 * Math.PI * Math.log(r / R_FLAT) / Math.log(R_MAX / R_FLAT)
}

function minAngularDist(a: number, b: number): number {
  let d = ((a - b) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  if (d > Math.PI) d = 2 * Math.PI - d
  return d
}

export function classifyCell(
  gx: number,
  gy: number,
  userFaction: Faction,
): CellClassification {
  const r = Math.sqrt(gx * gx + gy * gy)

  if (r < 0.5) {
    return {
      faction: 'free_community',
      fogLevel: userFaction === 'free_community' ? 'clear' : 'hazy',
      armStrength: 1,
      distanceFromCenter: 0,
    }
  }

  const theta = Math.atan2(gy, gx)
  const offset = spiralOffset(r)

  let closestFaction: Faction | null = null
  let minDist = Infinity

  for (const [faction, armAngle] of ARM_ENTRIES) {
    const dist = minAngularDist(theta, armAngle + offset)
    if (dist < minDist) {
      minDist = dist
      closestFaction = faction as Faction
    }
  }

  if (minDist > ARM_HALF_WIDTH) {
    return { faction: null, fogLevel: 'hidden', armStrength: 0, distanceFromCenter: r }
  }

  const armStrength = 1 - minDist / ARM_HALF_WIDTH
  const fogLevel: FogLevel = closestFaction === userFaction ? 'clear' : 'hazy'

  return { faction: closestFaction, fogLevel, armStrength, distanceFromCenter: r }
}

// Faction display colors (PixiJS hex)
export const FACTION_COLORS: Record<Faction, number> = {
  free_community:    0xffffff,  // white
  treasury:          0xffd700,  // gold
  founder_pool:      0xff4444,  // red
  professional_pool: 0x00ffff,  // cyan
}

export const FACTION_FOG_ALPHA: Record<FogLevel, number> = {
  clear:  1.0,
  hazy:   0.25,
  hidden: 0.0,
}
