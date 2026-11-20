import { TUNING, round3 } from "./config.js";

function ringPoints(cx, cz, r, anglesDeg, y = 0) {
  return anglesDeg.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [round3(cx + r * Math.cos(rad)), y, round3(cz + r * Math.sin(rad))];
  });
}

function stepAngles(startDeg, stepDeg, count) {
  return Array.from({ length: count }, (_, i) => startDeg + i * stepDeg);
}

const NIGHT3_RAMPS = [30, 150].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { deg, ux: Math.cos(rad), uz: Math.sin(rad), px: -Math.sin(rad), pz: Math.cos(rad) };
});

export function getNightMap(night) {
  if (night === 1) {
    return {
      night: 1,
      name: "Đêm 1 – Đảo Bến",
      introQuote: "Ông Đăng: \"Ánh sáng của Đảo Bến đang tắt dần. Hãy gom 10 đom đóm để thắp lại từng Đèn Lồng Lớn trước bình minh, Mây ơi.\"",
      durationS: TUNING.night1_duration_s,
      shadeSpeed: 4.0,
      shadeSpawnIntervalTicks: 480,
      shadeMax: 6,
      windEnabled: false,
      driftersEnabled: false,
      spawnPos: [0, 0, 0],
      lanterns: [
        { id: "L1", pos: [0, 0, 25], lit: false, deposited: 0 },
        { id: "L2", pos: [23.8, 0, 7.7], lit: false, deposited: 0 },
        { id: "L3", pos: [14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: "L4", pos: [-14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: "L5", pos: [-23.8, 0, 7.7], lit: false, deposited: 0 }
      ],
      moteSpawnPoints: [
        ...ringPoints(0, 0, 12, stepAngles(0, 45, 8), 0),
        ...ringPoints(0, 0, 33, stepAngles(0, 22.5, 16), 0)
      ],
      shadeSpawnPoints: ringPoints(0, 0, 37, stepAngles(15, 30, 12), 0),
      charms: [],
      drifterSpawnPoints: [],
      launchpads: []
    };
  }

  if (night === 2) {
    return {
      night: 2,
      name: "Đêm 2 – Đảo Cau",
      introQuote: "Ông Đăng: \"Hai bờ Đảo Cau nối nhau bằng cầu tre mỏng manh. Coi chừng Gió Lạc rình cướp đom đóm, hãy tận dụng bục nhảy và Bùa Gió!\"",
      durationS: TUNING.night2_duration_s,
      shadeSpeed: 4.0,
      shadeSpawnIntervalTicks: 420,
      shadeMax: 8,
      windEnabled: false,
      driftersEnabled: true,
      spawnPos: [0, 0, 0],
      lanterns: [
        { id: "L1", pos: [0, 0, 20], lit: false, deposited: 0 },
        { id: "L2", pos: [17, 0, -10], lit: false, deposited: 0 },
        { id: "L3", pos: [-17, 0, -10], lit: false, deposited: 0 },
        { id: "L4", pos: [70, 0, 20], lit: false, deposited: 0 },
        { id: "L5", pos: [87, 0, -10], lit: false, deposited: 0 },
        { id: "L6", pos: [53, 0, -10], lit: false, deposited: 0 }
      ],
      moteSpawnPoints: [
        ...ringPoints(0, 0, 10, stepAngles(0, 90, 4), 0),
        ...ringPoints(0, 0, 22, stepAngles(0, 45, 8), 0),
        ...ringPoints(70, 0, 10, stepAngles(0, 90, 4), 0),
        ...ringPoints(70, 0, 22, stepAngles(0, 45, 8), 0)
      ],
      shadeSpawnPoints: [
        ...ringPoints(0, 0, 26, stepAngles(22.5, 45, 8), 0),
        ...ringPoints(70, 0, 26, stepAngles(22.5, 45, 8), 0)
      ],
      charms: [{ id: "C1", pos: [35, 0, 0], available: true, respawnTicks: 0 }],
      drifterSpawnPoints: [
        [35, 0, -8],
        [35, 0, 8],
        [15, 0, 12],
        [55, 0, -12]
      ],
      launchpads: [
        { pos: [20, 0, 18], radius: 1.0, vy: 14.0, horizSpeed: 24.0, target: [70, 0] },
        { pos: [50, 0, -18], radius: 1.0, vy: 14.0, horizSpeed: 24.0, target: [0, 0] }
      ]
    };
  }

  return {
    night: 3,
    name: "Đêm 3 – Đảo Chuông",
    introQuote: "Ông Đăng: \"Đêm cuối trên Đảo Chuông ba tầng. Gió lớn sắp nổi lên — giữ vững bước chân, thắp sáng cả tháp chuông để đón Bình Minh!\"",
    durationS: TUNING.night3_duration_s,
    shadeSpeed: 4.5,
    shadeSpawnIntervalTicks: 360,
    shadeMax: 10,
    windEnabled: true,
    driftersEnabled: true,
    spawnPos: [0, 0, -15],
    lanterns: [
      { id: "L1", pos: [0, 6, 6], lit: false, deposited: 0 },
      { id: "L2", pos: [18, 3, 10], lit: false, deposited: 0 },
      { id: "L3", pos: [-18, 3, 10], lit: false, deposited: 0 },
      { id: "L4", pos: [35, 0, -10], lit: false, deposited: 0 },
      { id: "L5", pos: [-35, 0, -10], lit: false, deposited: 0 },
      { id: "L6", pos: [20, 0, -35], lit: false, deposited: 0 },
      { id: "L7", pos: [-20, 0, -35], lit: false, deposited: 0 }
    ],
    moteSpawnPoints: [
      ...ringPoints(0, 0, 34, stepAngles(0, 20, 18), 0),
      ...ringPoints(0, 0, 18, stepAngles(20, 20, 8), 3),
      ...ringPoints(0, 0, 5, stepAngles(45, 90, 4), 6)
    ],
    shadeSpawnPoints: ringPoints(0, 0, 43, stepAngles(0, 22.5, 16), 0),
    charms: [
      { id: "C1", pos: [30, 0, 25], available: true, respawnTicks: 0 },
      { id: "C2", pos: [-30, 0, 25], available: true, respawnTicks: 0 }
    ],
    drifterSpawnPoints: [
      [25, 0, 20],
      [-25, 0, 20],
      [0, 3, 20],
      [0, 0, -25]
    ],
    launchpads: [
      { pos: [0, 3, 13], radius: 1.0, vy: 12.0, horizSpeed: 8.0, dir: [0, -1] }
    ]
  };
}

/**
 * Returns all valid walkable surface heights at (x, z) for a given night.
 */
export function getSurfaceHeights(night, x, z) {
  if (night === 1) {
    return Math.hypot(x, z) <= 40.0 ? [0] : [];
  }
  if (night === 2) {
    const onA = Math.hypot(x, z) <= 28.0;
    const onB = Math.hypot(x - 70, z) <= 28.0;
    const onBridge = x >= 26 && x <= 44 && z >= -2 && z <= 2;
    return onA || onB || onBridge ? [0] : [];
  }

  // Night 3: 3 tiers + 2 ramps
  const heights = [];
  const r = Math.hypot(x, z);
  if (r <= 45.0) heights.push(0);
  if (r >= 12.0 && r <= 24.0 && z > 0) heights.push(3);
  if (r <= 8.0) heights.push(6);

  for (const ramp of NIGHT3_RAMPS) {
    const along = x * ramp.ux + z * ramp.uz;
    const perp = Math.abs(x * ramp.px + z * ramp.pz);
    if (along >= 24.0 && along <= 30.0 && perp <= 1.5) {
      heights.push((3 * (30.0 - along)) / 6.0);
    }
  }
  return heights;
}

/**
 * Resolves solid vertical walls/pillars on Night 3 and returns highest support Y <= prevY + stepAllowance.
 */
export function resolvePlayerTerrain(night, prevPos, nextPos) {
  let x = nextPos[0];
  let z = nextPos[2];
  const y = nextPos[1];

  if (night === 3) {
    // Bell tower cylinder at (0, 6..14, 0), radius 2 m
    if (y >= 5.5 && y < 14.0) {
      const r = Math.hypot(x, z);
      if (r < 2.0) {
        const nx = r > 1e-6 ? x / r : 1;
        const nz = r > 1e-6 ? z / r : 0;
        x = nx * 2.0;
        z = nz * 2.0;
      }
    }

    // Vertical cliff faces of Tier 1 (Y=3) and Tier 2 (Y=6) cannot be walked through from below
    const candidateHeights = getSurfaceHeights(3, x, z);
    const blockedAbove = candidateHeights.some((h) => h > y + 0.45 && prevPos[1] < h - 0.45);
    if (blockedAbove) {
      // Check if moving along X only or Z only avoids hitting the vertical wall
      const xOnlyOk = !getSurfaceHeights(3, x, prevPos[2]).some((h) => h > y + 0.45 && prevPos[1] < h - 0.45);
      const zOnlyOk = !getSurfaceHeights(3, prevPos[0], z).some((h) => h > y + 0.45 && prevPos[1] < h - 0.45);
      if (xOnlyOk) {
        z = prevPos[2];
      } else if (zOnlyOk) {
        x = prevPos[0];
      } else {
        x = prevPos[0];
        z = prevPos[2];
      }
    }
  }

  const surfaces = getSurfaceHeights(night, x, z);
  let supportY = null;
  for (const h of surfaces) {
    if (h <= y + 0.45 && (supportY === null || h > supportY)) {
      supportY = h;
    }
  }
  return { x, z, supportY };
}

/**
 * Keeps horizontal push / shade movement inside island bounds where needed.
 */
export function isWithinPlayableXZ(night, x, z) {
  return getSurfaceHeights(night, x, z).length > 0;
}
