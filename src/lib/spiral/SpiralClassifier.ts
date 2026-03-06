export type Faction = 'free_community' | 'treasury' | 'founder_pool' | 'professional_pool'
export type FogLevel = 'clear' | 'hazy' | 'hidden'

export interface CellClassification {
  faction: Faction | null   // null = inter-arm void
  fogLevel: FogLevel
  armStrength: number       // 0..1, 1 = on spine
  distanceFromCenter: number
}

// Arm origin angles (radians). N/E/S/W at center, twist CCW outward.
// Each arm is nudged +0.006° CCW so that cells exactly on the 45° boundary
// between two arms resolve to the clockwise arm — matching the game's faction
// territory assignment (NE→treasury, NW→free_community, SE→founder_pool, SW→pro).
const _CW_BIAS = 0.0001  // radians ≈ 0.006° — visually imperceptible
const ARM_ANGLES: Record<Faction, number> = {
  free_community:    Math.PI / 2 + _CW_BIAS,   // 90° N
  treasury:          0           + _CW_BIAS,   // 0°  E
  founder_pool:     -Math.PI / 2 + _CW_BIAS,   // S
  professional_pool: Math.PI     + _CW_BIAS,   // 180° W
}

const ARM_ENTRIES = Object.entries(ARM_ANGLES) as [Faction, number][]

// ARM_HALF_WIDTH = 45°: each arm covers exactly 90°, four arms tile the full 360°
// with no gaps. Faction borders always touch — no factionless void cells exist.
const ARM_HALF_WIDTH = Math.PI / 4   // 45° — full-coverage spiral wedge sectors
// R_FLAT: inner flat zone radius. Below this, no spiral twist.
const R_FLAT = 3.0
const R_MAX = 324.0    // visual spiral extent — derived from epoch ring (dynamic in v2)
const SPIRAL_TURNS = 0.15  // loose quarter-ish turn CCW across the full grid

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
  free_community:    0x0d9488,  // teal
  treasury:          0xdc2680,  // reddish purple/vermillion
  founder_pool:      0xf59e0b,  // gold-orange
  professional_pool: 0x3b82f6,  // blue
}

export const FACTION_FOG_ALPHA: Record<FogLevel, number> = {
  clear:  1.0,
  hazy:   0.25,
  hidden: 0.0,
}
