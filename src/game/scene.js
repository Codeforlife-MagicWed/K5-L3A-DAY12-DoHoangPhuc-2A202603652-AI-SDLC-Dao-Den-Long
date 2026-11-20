import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FIREFLY_TYPES, PALETTE, TUNING, distXZ } from "../sim/config.js";
import { addIslandEcology, bakeGeoPart, createFlowingStreamTexture } from "./ecology.js";
import { createShadeSystem } from "./shades.js";

function createMoteInstancedPool(scene, maxCount = 256) {
  const core = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: PALETTE.fireflyCore, fog: false }),
    maxCount
  );
  const halo = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshBasicMaterial({
      color: PALETTE.fireflyGlow,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    maxCount
  );
  const glow = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.88, 10, 8),
    new THREE.MeshBasicMaterial({
      color: PALETTE.fireflyGlow,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    maxCount
  );
  const wingGeo = mergeGeometries(
    [
      bakeGeoPart(new THREE.PlaneGeometry(0.26, 0.12), -0.18, 0.05, 0),
      bakeGeoPart(new THREE.PlaneGeometry(0.26, 0.12), 0.18, 0.05, 0)
    ],
    false
  );
  const wings = new THREE.InstancedMesh(
    wingGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    maxCount
  );
  for (const m of [core, halo, glow, wings]) {
    m.count = 0;
    m.frustumCulled = false;
    scene.add(m);
  }
  return { core, halo, glow, wings };
}

function createStarfield() {
  const count = 360;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = (i * 2.39996) % (Math.PI * 2);
    const phi = Math.acos(0.15 + ((i * 0.6180339) % 0.85));
    const r = 135;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffe9b0, size: 0.9, transparent: true, opacity: 0.78, fog: false })
  );
}

function createMayMesh() {
  const group = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayCoat, roughness: 0.7 });
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf7f4ec,
    emissive: 0xfff3dc,
    emissiveIntensity: 0.2,
    roughness: 0.65
  });
  const scarfMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, roughness: 0.4, metalness: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.82 });

  const cloudBase = new THREE.Group();
  cloudBase.position.y = 0.14;
  for (const [cx, cy, cz, cr, sy] of [
    [0, 0, 0, 0.34, 0.55],
    [-0.26, -0.02, 0.04, 0.24, 0.52],
    [0.26, -0.02, 0.04, 0.24, 0.52],
    [0, -0.02, -0.22, 0.24, 0.52]
  ]) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 10), cloudMat);
    p.scale.set(1, sy, 1);
    p.position.set(cx, cy, cz);
    cloudBase.add(p);
  }
  group.add(cloudBase);

  const footL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), woodMat);
  footL.scale.set(1, 0.7, 1.3);
  footL.position.set(-0.12, 0.22, 0.06);
  const footR = footL.clone();
  footR.position.x = 0.12;
  group.add(footL, footR);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.82, 24), coatMat);
  cloak.position.y = 0.64;
  cloak.castShadow = true;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.028, 8, 24), goldMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.25;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.036, 8, 20), scarfMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.68;
  const pouch = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.fireflyGlow, emissive: PALETTE.lanternLit, emissiveIntensity: 1.0 })
  );
  pouch.position.set(-0.27, 0.62, 0.1);
  group.add(cloak, hem, belt, pouch);

  const staffPivot = new THREE.Group();
  staffPivot.position.set(0.36, 0.76, 0.08);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 1.28, 8), woodMat);
  staff.position.set(0, 0.08, 0.1);
  staff.rotation.x = 0.22;
  const staffTip = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, emissive: PALETTE.lanternLit, emissiveIntensity: 1.6 })
  );
  staffTip.position.set(0, 0.72, 0.24);
  staffPivot.add(staff, staffTip);
  group.add(staffPivot);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.065, 10, 20), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.01;
  const scarfTail1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.03), scarfMat);
  scarfTail1.position.set(0.07, 0.82, -0.22);
  scarfTail1.rotation.set(0.35, 0, -0.14);
  const scarfTail2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.03), scarfMat);
  scarfTail2.position.set(-0.07, 0.85, -0.21);
  scarfTail2.rotation.set(0.28, 0, 0.16);
  group.add(scarf, scarfTail1, scarfTail2);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe0c4, roughness: 0.6 })
  );
  head.position.y = 1.22;
  head.castShadow = true;

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({ color: 0x2b2333, roughness: 0.8 })
  );
  hair.position.set(0, 1.24, -0.02);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1b1526 });
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff9e9e, transparent: true, opacity: 0.65 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
  eyeL.position.set(-0.075, 1.21, 0.2);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.075;
  const cheekL = new THREE.Mesh(new THREE.CircleGeometry(0.032, 10), cheekMat);
  cheekL.position.set(-0.125, 1.17, 0.185);
  cheekL.rotation.y = -0.35;
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.125;
  cheekR.rotation.y = 0.35;

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 0.3, 28),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.82, side: THREE.DoubleSide })
  );
  hat.position.y = 1.46;
  hat.castShadow = true;
  const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.022, 8, 28), goldMat);
  hatRim.rotation.x = Math.PI / 2;
  hatRim.position.y = 1.32;
  const miniLantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.095, 0),
    new THREE.MeshStandardMaterial({ color: PALETTE.lanternCore, emissive: PALETTE.lanternLit, emissiveIntensity: 2.0 })
  );
  miniLantern.position.set(0.42, 1.19, 0.26);
  group.add(head, hair, eyeL, eyeR, cheekL, cheekR, hat, hatRim, miniLantern);

  // Handheld paper lantern on Mây's left side + warm local light
  const handArmPivot = new THREE.Group();
  handArmPivot.position.set(-0.36, 0.78, 0.1);
  const handStick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6), woodMat);
  handStick.position.set(-0.08, -0.05, 0.18);
  handStick.rotation.x = Math.PI / 2 - 0.35;
  const handLanternBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.09, 0.22, 8),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 2.1,
      roughness: 0.35
    })
  );
  handLanternBody.position.set(-0.14, -0.18, 0.34);
  const handCapTop = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.07, 8), woodMat);
  handCapTop.position.set(-0.14, -0.05, 0.34);
  const handCapBot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 8), woodMat);
  handCapBot.position.set(-0.14, -0.3, 0.34);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), scarfMat);
  tassel.rotation.x = Math.PI;
  tassel.position.set(-0.14, -0.36, 0.34);
  const handGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 10),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  handGlow.position.set(-0.14, -0.18, 0.34);
  handArmPivot.add(handStick, handLanternBody, handCapTop, handCapBot, tassel, handGlow);
  group.add(handArmPivot);

  const light = new THREE.PointLight(0xffb85c, 8.2, 19, 1.6);
  light.position.set(-0.2, 1.45, 0.35);
  group.add(light);

  const selfAura = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 16, 10),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    })
  );
  selfAura.position.y = 0.95;
  group.add(selfAura);

  return { group, footL, footR, scarfTail1, scarfTail2, staffPivot, handArmPivot };
}

function createLanternMesh(lantern) {
  const group = new THREE.Group();
  group.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);

  const shrinePad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.75, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: 0x454958, roughness: 0.92 })
  );
  shrinePad.position.y = 0.07;
  shrinePad.receiveShadow = true;
  group.add(shrinePad);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.85, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: PALETTE.lanternUnlit, roughness: 0.85 })
  );
  base.position.y = 0.34;
  base.castShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 3.0, 10),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 })
  );
  pillar.position.y = 1.8;
  pillar.castShadow = true;
  group.add(pillar);

  const coreMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lanternUnlit,
    emissive: PALETTE.lanternLit,
    emissiveIntensity: 0.0,
    roughness: 0.35
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.56, 1), coreMat);
  core.position.y = 3.5;
  group.add(core);

  const tearMat = new THREE.MeshBasicMaterial({ color: 0x1e192b });
  const tear1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.05), tearMat);
  tear1.position.set(0.22, 3.5, 0.45);
  tear1.rotation.z = 0.42;
  const tear2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.05), tearMat);
  tear2.position.set(-0.24, 3.45, -0.44);
  tear2.rotation.z = -0.38;
  group.add(tear1, tear2);

  const fuelBarGroup = new THREE.Group();
  fuelBarGroup.position.set(0, 4.95, 0);
  const fuelBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x161b33, side: THREE.DoubleSide })
  );
  const fuelFillMat = new THREE.MeshBasicMaterial({ color: PALETTE.lanternLit, side: THREE.DoubleSide });
  const fuelFill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.14), fuelFillMat);
  fuelFill.position.z = 0.02;
  fuelBarGroup.add(fuelBg, fuelFill);
  fuelBarGroup.visible = false;
  group.add(fuelBarGroup);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.8 })
  );
  roof.position.y = 4.18;
  roof.castShadow = true;
  group.add(roof);

  const darkZoneMat = new THREE.MeshBasicMaterial({
    color: PALETTE.shadeRim,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const darkZone = new THREE.Mesh(new THREE.RingGeometry(TUNING.safe_radius - 0.14, TUNING.safe_radius, 48), darkZoneMat);
  darkZone.rotation.x = -Math.PI / 2;
  darkZone.position.y = 0.04;
  group.add(darkZone);

  const safeDiscMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternLit,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const safeDisc = new THREE.Mesh(new THREE.CircleGeometry(TUNING.safe_radius, 48), safeDiscMat);
  safeDisc.rotation.x = -Math.PI / 2;
  safeDisc.position.y = 0.045;
  group.add(safeDisc);

  const safeRingMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternCore,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const safeRing = new THREE.Mesh(new THREE.RingGeometry(TUNING.safe_radius - 0.16, TUNING.safe_radius, 48), safeRingMat);
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  group.add(safeRing);

  const safeDomeMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternLit,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const safeDome = new THREE.Mesh(
    new THREE.SphereGeometry(TUNING.safe_radius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    safeDomeMat
  );
  safeDome.position.y = 0.02;
  group.add(safeDome);

  const beamMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternCore,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const lightBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 2.2, 5.2, 14, 1, true), beamMat);
  lightBeam.position.y = 2.6;
  group.add(lightBeam);

  const headGlowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternLit,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const headGlow = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), headGlowMat);
  headGlow.position.y = 3.5;
  group.add(headGlow);

  const light = new THREE.PointLight(PALETTE.lanternLit, 0, 28, 1.5);
  light.position.y = 3.6;
  group.add(light);

  return {
    group,
    core,
    coreMat,
    tear1,
    tear2,
    fuelBarGroup,
    fuelFill,
    fuelFillMat,
    light,
    darkZoneMat,
    safeDiscMat,
    safeRingMat,
    safeDomeMat,
    beamMat,
    headGlowMat
  };
}

function createDrifterMesh() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 1),
    new THREE.MeshStandardMaterial({ color: PALETTE.drifter, emissive: PALETTE.drifter, emissiveIntensity: 0.7 })
  );
  core.position.y = 1.25;
  group.add(core);

  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.drifter,
    emissive: PALETTE.drifter,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.42 - i * 0.06, 0.16, 0.42), mat);
    seg.position.set(0, 1.25, -0.35 - i * 0.38);
    group.add(seg);
    parts.push(seg);
  }
  return { group, parts };
}

function createCharmMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.72, 0.08),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, emissive: PALETTE.mayScarf, emissiveIntensity: 0.55 })
  );
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.82, 0.05),
    new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, emissive: PALETTE.goldAccent, emissiveIntensity: 0.4 })
  );
  group.add(border, body);
  return group;
}

function createLaunchpadMesh(pos) {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.15, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, emissive: PALETTE.lanternLit, emissiveIntensity: 0.7 })
  );
  pad.position.y = 0.11;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.06, 6, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.lanternCore })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  group.add(pad, ring);
  return group;
}

function buildNightTerrain(night, map, streamMat) {
  const group = new THREE.Group();
  const grassMat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.92 });
  const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.9 });
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x5f5866, roughness: 0.94 });
  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
  const cloudMat = new THREE.MeshStandardMaterial({ color: PALETTE.cloudSea, roughness: 0.95 });

  const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), cloudMat);
  cloudSea.rotation.x = -Math.PI / 2;
  cloudSea.position.set(night === 2 ? 35 : 0, -11.5, 0);
  group.add(cloudSea);

  const puffMat = new THREE.MeshStandardMaterial({ color: PALETTE.fogNight, roughness: 1.0 });
  const centerX = night === 2 ? 35 : 0;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const dist = (night === 2 ? 66 : 52) + (i % 3) * 5;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 3) * 2.5, 10, 8), puffMat);
    puff.scale.y = 0.35;
    puff.position.set(centerX + Math.cos(a) * dist, -4.5, Math.sin(a) * dist);
    group.add(puff);
  }

  if (night === 1) {
    const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 36.5, 2.6, 56), grassMat);
    island.position.y = -1.3;
    island.receiveShadow = true;
    const beach = new THREE.Mesh(new THREE.TorusGeometry(39.4, 0.72, 8, 56), sandMat);
    beach.rotation.x = Math.PI / 2;
    beach.position.y = -0.14;
    beach.receiveShadow = true;
    group.add(island, beach);
  } else if (night === 2) {
    for (const cx of [0, 70]) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(28, 25, 2.6, 44), grassMat);
      disc.position.set(cx, -1.3, 0);
      disc.receiveShadow = true;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(27.5, 0.55, 8, 48), sandMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(cx, -0.1, 0);
      rim.receiveShadow = true;
      group.add(disc, rim);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 4), woodMat);
    bridge.position.set(35, -0.175, 0);
    bridge.receiveShadow = true;
    group.add(bridge);
  } else {
    const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 41.5, 2.6, 56), grassMat);
    tier0.position.y = -1.3;
    tier0.receiveShadow = true;
    group.add(tier0);

    const shape = new THREE.Shape();
    shape.absarc(0, 0, 24, 0, Math.PI, false);
    shape.absarc(0, 0, 12, Math.PI, 0, true);
    const tier1Geo = new THREE.ExtrudeGeometry(shape, { depth: 2.85, bevelEnabled: false, curveSegments: 36 });
    tier1Geo.rotateX(Math.PI / 2);
    const tier1 = new THREE.Mesh(tier1Geo, cliffMat);
    tier1.position.y = 2.85;
    tier1.receiveShadow = true;
    tier1.castShadow = true;

    const tier1TopGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 36 });
    tier1TopGeo.rotateX(Math.PI / 2);
    const tier1Top = new THREE.Mesh(tier1TopGeo, sandMat);
    tier1Top.position.y = 3.01;
    tier1Top.receiveShadow = true;
    group.add(tier1, tier1Top);

    const tier2Base = new THREE.Mesh(new THREE.CylinderGeometry(8.0, 8.2, 5.75, 36), cliffMat);
    tier2Base.position.y = 2.875;
    tier2Base.receiveShadow = true;
    tier2Base.castShadow = true;
    const tier2Top = new THREE.Mesh(new THREE.CylinderGeometry(8.05, 8.05, 0.25, 36), grassMat);
    tier2Top.position.y = 5.875;
    tier2Top.receiveShadow = true;
    tier2Top.castShadow = true;
    group.add(tier2Base, tier2Top);

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 8.0, 20), woodMat);
    tower.position.y = 10.0;
    tower.castShadow = true;
    const bell = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 1.3, 14),
      new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, roughness: 0.4, metalness: 0.4 })
    );
    bell.position.y = 12.6;
    const bellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 1.9, 12),
      new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.75 })
    );
    bellRoof.position.y = 14.9;
    bellRoof.castShadow = true;
    group.add(tower, bell, bellRoof);

    const slopeAngle = Math.atan2(3, 6);
    const rampLen = Math.hypot(6, 3);
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampGroup = new THREE.Group();
      rampGroup.position.set(27.0 * Math.cos(rad), 1.5 - 0.15 / Math.cos(slopeAngle), 27.0 * Math.sin(rad));
      rampGroup.rotation.order = "YXZ";
      rampGroup.rotation.y = -rad;
      rampGroup.rotation.z = -slopeAngle;

      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.3, 3.0), woodMat);
      ramp.receiveShadow = true;
      ramp.castShadow = true;
      rampGroup.add(ramp);

      for (const side of [-1.45, 1.45]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.18, 0.14), sandMat);
        rail.position.set(0, 0.22, side);
        rampGroup.add(rail);
      }
      group.add(rampGroup);
    }
  }

  for (const pad of map.launchpads) {
    group.add(createLaunchpadMesh(pad.pos));
  }
  const ecology = addIslandEcology(group, night, map.lanterns, streamMat);

  return { group, ecology };
}

export function createWorldRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const scene = new THREE.Scene();
  const nightSkyColor = new THREE.Color(PALETTE.skyNight);
  const preDawnSkyColor = new THREE.Color(0x6e365c);
  const dawnSkyColor = new THREE.Color(0xf2a15e);
  const nightHemiSky = new THREE.Color(0x6b88d4);
  const dawnHemiSky = new THREE.Color(0xffcfa0);
  const nightMoonColor = new THREE.Color(0x8eaaf5);
  const dawnSunColor = new THREE.Color(0xffbe73);

  scene.background = nightSkyColor.clone();
  scene.fog = new THREE.Fog(PALETTE.skyNight, 10, 40);
  scene.add(createStarfield());

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);

  const ambient = new THREE.AmbientLight(0xffffff, 0.09);
  scene.add(ambient);

  const hemiLight = new THREE.HemisphereLight(nightHemiSky, new THREE.Color(0x162e27), 0.24);
  scene.add(hemiLight);

  const moonLight = new THREE.DirectionalLight(nightMoonColor, 0.32);
  moonLight.position.set(-24, 42, -20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(512, 512);
  moonLight.shadow.camera.near = 5;
  moonLight.shadow.camera.far = 140;
  const d = 65;
  moonLight.shadow.camera.left = -d;
  moonLight.shadow.camera.right = d;
  moonLight.shadow.camera.top = d;
  moonLight.shadow.camera.bottom = -d;
  scene.add(moonLight);
  scene.add(moonLight.target);

  // Dawn Cinematic 3D Rising Sun + Solar Halo (hidden at night)
  const sunGroup = new THREE.Group();
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7.5, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false })
  );
  const sunHalo1 = new THREE.Mesh(
    new THREE.SphereGeometry(12.5, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  const sunHalo2 = new THREE.Mesh(
    new THREE.SphereGeometry(20.0, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0xff7b54,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  sunGroup.add(sunDisc, sunHalo1, sunHalo2);
  sunGroup.visible = false;
  scene.add(sunGroup);

  const playerRig = createMayMesh();
  scene.add(playerRig.group);

  const moteLights = Array.from({ length: 2 }, () => {
    const l = new THREE.PointLight(PALETTE.fireflyGlow, 2.8, 9.0, 1.7);
    l.visible = false;
    scene.add(l);
    return l;
  });

  const streamTex = createFlowingStreamTexture();
  const streamMat = new THREE.MeshStandardMaterial({
    map: streamTex,
    emissive: 0x0b2c3d,
    emissiveIntensity: 0.42,
    roughness: 0.2,
    metalness: 0.25
  });

  const pulseWave = new THREE.Group();
  const pulseSphereMat = new THREE.MeshBasicMaterial({
    color: PALETTE.goldAccent,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const pulseSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pulseSphereMat);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: PALETTE.lanternCore,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 32), pulseRingMat);
  pulseRing.rotation.x = Math.PI / 2;
  pulseWave.add(pulseSphere, pulseRing);
  pulseWave.visible = false;
  scene.add(pulseWave);
  let pulseAnimTimer = 0;

  const slashArc = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.14, 6, 20, Math.PI * 0.9),
    new THREE.MeshBasicMaterial({ color: PALETTE.lanternCore, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  slashArc.rotation.x = Math.PI / 2;
  slashArc.visible = false;
  scene.add(slashArc);
  let slashAnimTimer = 0;

  let terrainGroup = null;
  let terrainEcology = null;
  let currentNight = 0;
  const lanternMap = new Map();
  const motePool = createMoteInstancedPool(scene, 256);
  const shadePool = createShadeSystem(scene, 256);
  const instDummy = new THREE.Object3D();
  const projVec = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const drifterMap = new Map();
  const charmMap = new Map();

  function clearMapObjects(mapObj) {
    for (const val of mapObj.values()) {
      scene.remove(val.group ?? val);
    }
    mapObj.clear();
  }

  function resetForNight(night, map) {
    currentNight = night;
    const cx = night === 2 ? 35 : 0;
    moonLight.position.set(cx - 24, 46, -20);
    moonLight.target.position.set(cx, 0, 0);
    if (terrainGroup) scene.remove(terrainGroup);
    const built = buildNightTerrain(night, map, streamMat);
    terrainGroup = built.group;
    terrainEcology = built.ecology;
    scene.add(terrainGroup);
    clearMapObjects(lanternMap);
    motePool.core.count = 0;
    motePool.halo.count = 0;
    motePool.glow.count = 0;
    motePool.wings.count = 0;
    shadePool.reset();
    clearMapObjects(drifterMap);
    clearMapObjects(charmMap);
  }

  function triggerPulseEffect() {
    pulseAnimTimer = 0.4;
    pulseWave.visible = true;
  }

  function triggerSlashEffect() {
    slashAnimTimer = 0.25;
    slashArc.visible = true;
  }

  function syncEntities(renderState, timeSec, camYawDeg, camPitchDeg = 34, colorblind = false, camCtrl = null) {
    if (renderState.night !== currentNight) {
      resetForNight(renderState.night, renderState.map);
    }
    streamTex.offset.y = -(timeSec * 0.65) % 1;
    if (terrainEcology) {
      terrainEcology.uniforms.uTime.value = timeSec;
      terrainEcology.uniforms.uWindAmp.value = camCtrl?.reducedMotion ? 0 : 0.095;
    }

    const [px, py, pz] = renderState.player.pos;
    playerRig.group.position.set(px, py, pz);
    playerRig.group.visible =
      renderState.player.respawnWaitTicks === 0 &&
      (renderState.player.invulnTicks === 0 || Math.floor(timeSec * 16) % 2 === 0);
    if (renderState.player.facing) {
      playerRig.group.rotation.y = Math.atan2(renderState.player.facing[0], renderState.player.facing[2]);
    }
    const speedXZ = Math.hypot(renderState.player.vel[0], renderState.player.vel[2]);
    const walkPhase = speedXZ > 0.4 ? Math.sin(timeSec * 14) : 0;
    playerRig.footL.position.z = 0.06 + walkPhase * 0.14;
    playerRig.footR.position.z = 0.06 - walkPhase * 0.14;
    playerRig.handArmPivot.rotation.z = Math.sin(timeSec * 4) * 0.06 + walkPhase * 0.12;
    playerRig.scarfTail1.rotation.x = 0.35 + (speedXZ > 0.4 ? 0.35 + Math.sin(timeSec * 10) * 0.12 : 0);
    playerRig.scarfTail2.rotation.x = 0.3 + (speedXZ > 0.4 ? 0.3 - Math.sin(timeSec * 10) * 0.12 : 0);

    if (slashAnimTimer > 0) {
      slashAnimTimer = Math.max(0, slashAnimTimer - 1 / 60);
      const sp = 1 - slashAnimTimer / 0.25;
      playerRig.staffPivot.rotation.x = -0.8 + sp * 2.1;
      slashArc.position.set(px, py + 0.85, pz);
      const facingAngle = Math.atan2(renderState.player.facing[0], renderState.player.facing[2]);
      slashArc.rotation.z = -facingAngle - Math.PI * 0.45;
      slashArc.scale.setScalar(0.8 + sp * 0.55);
      slashArc.material.opacity = (1 - sp) * 0.95;
      if (slashAnimTimer <= 0) {
        slashArc.visible = false;
        playerRig.staffPivot.rotation.x = 0;
      }
    }

    if (pulseAnimTimer > 0) {
      pulseAnimTimer = Math.max(0, pulseAnimTimer - 1 / 60);
      const p = 1 - pulseAnimTimer / 0.4;
      const scale = 0.6 + p * TUNING.pulse_radius;
      pulseWave.position.set(px, py + 0.85, pz);
      pulseWave.scale.setScalar(scale);
      pulseSphereMat.opacity = (1 - p) * 0.42;
      pulseRingMat.opacity = (1 - p) * 0.9;
      if (pulseAnimTimer <= 0) pulseWave.visible = false;
    }

    let litCount = 0;
    const blinkOn = Math.sin(timeSec * Math.PI * 2) > 0;
    for (const l of renderState.lanterns) {
      if (!lanternMap.has(l.id)) {
        const obj = createLanternMesh(l);
        lanternMap.set(l.id, obj);
        scene.add(obj.group);
      }
      const obj = lanternMap.get(l.id);
      if (l.lit) {
        litCount++;
        const isLow = l.fuel < TUNING.low_fuel_threshold;
        const flashDim = isLow && !blinkOn;
        const fuelNorm = Math.max(0.05, Math.min(1, l.fuel / TUNING.fuel_max));
        const fuelFactor = 0.35 + 0.65 * fuelNorm;

        obj.core.scale.set(1, 1, 1);
        obj.tear1.visible = false;
        obj.tear2.visible = false;
        obj.fuelBarGroup.visible = !flashDim;
        obj.fuelBarGroup.lookAt(camera.position);
        obj.fuelFill.scale.x = fuelNorm;
        obj.fuelFill.position.x = -(1 - fuelNorm) * 0.75;
        obj.fuelFillMat.color.setHex(isLow ? (colorblind ? 0xffffff : PALETTE.uiDanger) : PALETTE.lanternLit);

        obj.coreMat.color.setHex(PALETTE.lanternCore);
        obj.coreMat.emissive.setHex(PALETTE.lanternLit);
        obj.coreMat.emissiveIntensity = flashDim ? 0.35 : 1.4 + 0.65 * fuelNorm;
        obj.light.intensity = (flashDim ? 2.2 : 9.5) * fuelFactor;
        obj.light.distance = 22 + 12 * fuelNorm;
        obj.darkZoneMat.opacity = isLow ? 0.16 : 0;
        obj.safeDiscMat.opacity = isLow ? 0 : 0.05;
        obj.safeRingMat.opacity = isLow ? 0 : 0.38;
        obj.safeDomeMat.opacity = isLow ? 0 : 0.085 * fuelFactor;
        obj.beamMat.opacity = flashDim ? 0.04 : 0.15 * fuelFactor;
        obj.headGlowMat.opacity = flashDim ? 0.1 : 0.38 * fuelFactor;
      } else {
        const cost = l.ever_lit ? TUNING.relight_cost : TUNING.lantern_cost;
        const ratio = l.deposited / cost;
        obj.core.scale.set(1.05, 0.8, 1.05);
        obj.tear1.visible = true;
        obj.tear2.visible = true;
        obj.fuelBarGroup.visible = false;
        obj.coreMat.color.setHex(PALETTE.lanternUnlit);
        obj.coreMat.emissive.setHex(PALETTE.lanternLit);
        obj.coreMat.emissiveIntensity = ratio * 0.85;
        obj.light.intensity = ratio * 2.0;
        obj.darkZoneMat.opacity = 0.18;
        obj.safeDiscMat.opacity = 0;
        obj.safeRingMat.opacity = 0;
        obj.safeDomeMat.opacity = 0;
        obj.beamMat.opacity = ratio * 0.04;
        obj.headGlowMat.opacity = ratio * 0.14;
      }
    }
    const litRatio = litCount / Math.max(1, renderState.lanterns.length);

    // Physical lighting & Sky/Fog atmosphere (Night vs Menu Orbit vs Dawn Cinematic)
    const mode = camCtrl?.mode ?? (camCtrl && typeof camCtrl.angleRad === "number" ? "benchmark" : "play");
    const cx = renderState.night === 2 ? 35 : 0;

    if (mode === "dawnCinematic") {
      const p = Math.max(0, Math.min(1, camCtrl.progress ?? 0));
      if (p < 0.5) {
        scene.background.lerpColors(nightSkyColor, preDawnSkyColor, p * 2);
      } else {
        scene.background.lerpColors(preDawnSkyColor, dawnSkyColor, (p - 0.5) * 2);
      }
      scene.fog.color.copy(scene.background);
      scene.fog.near = 25 + p * 35;
      scene.fog.far = 75 + p * 110;
      ambient.intensity = 0.15 + p * 0.85;
      hemiLight.color.lerpColors(nightHemiSky, dawnHemiSky, p);
      hemiLight.intensity = 0.25 + p * 0.95;
      moonLight.color.lerpColors(nightMoonColor, dawnSunColor, p);
      moonLight.intensity = 0.35 + p * 1.55;
      moonLight.position.set(cx, 8 + p * 36, -85);
      moonLight.target.position.set(cx, 0, 0);
      renderer.toneMappingExposure = 1.24 + p * 0.22;

      sunGroup.visible = true;
      sunGroup.position.set(cx, -8 + p * 34, -95);
      const fadeOutShades = p > 0.65 ? [] : renderState.shades;
      shadePool.update(fadeOutShades, renderState.player.pos, timeSec, colorblind, renderState.lanterns);
    } else {
      sunGroup.visible = false;
      scene.background.copy(nightSkyColor);
      scene.fog.color.copy(nightSkyColor);
      hemiLight.color.copy(nightHemiSky);
      moonLight.color.copy(nightMoonColor);
      moonLight.position.set(cx - 24, 46, -20);
      moonLight.target.position.set(cx, 0, 0);
      renderer.toneMappingExposure = 1.24;

      if (mode === "menuOrbit") {
        ambient.intensity = 0.22;
        hemiLight.intensity = 0.42;
        moonLight.intensity = 0.55;
        scene.fog.near = 28;
        scene.fog.far = 96;
      } else {
        ambient.intensity = 0.08 + 0.24 * litRatio;
        hemiLight.intensity = 0.22 + 0.14 * litRatio;
        moonLight.intensity = 0.28 + 0.12 * litRatio;
        scene.fog.near = 10 + litRatio * 7;
        scene.fog.far = 40 + litRatio * 24;
      }
      shadePool.update(renderState.shades, renderState.player.pos, timeSec, colorblind, renderState.lanterns);
    }

    const moteCount = Math.min(renderState.motes.length, motePool.core.instanceMatrix.count);
    for (let i = 0; i < moteCount; i++) {
      const m = renderState.motes[i];
      const spec = FIREFLY_TYPES[m.size] ?? FIREFLY_TYPES.small;
      instDummy.position.set(
        m.pos[0] + Math.sin(timeSec * 2.5 + m.pos[2]) * 0.14,
        m.pos[1] + 0.52 + Math.sin(timeSec * 3.8 + m.pos[0]) * 0.14,
        m.pos[2]
      );
      instDummy.rotation.set(0, timeSec * 3, 0);
      instDummy.scale.setScalar(spec.scale);
      instDummy.updateMatrix();
      motePool.core.setMatrixAt(i, instDummy.matrix);
      motePool.halo.setMatrixAt(i, instDummy.matrix);
      motePool.glow.setMatrixAt(i, instDummy.matrix);
      motePool.wings.setMatrixAt(i, instDummy.matrix);
    }
    motePool.core.count = moteCount;
    motePool.halo.count = moteCount;
    motePool.glow.count = moteCount;
    motePool.wings.count = moteCount;
    motePool.core.instanceMatrix.needsUpdate = true;
    motePool.halo.instanceMatrix.needsUpdate = true;
    motePool.glow.instanceMatrix.needsUpdate = true;
    motePool.wings.instanceMatrix.needsUpdate = true;

    let m1 = null;
    let d1 = Infinity;
    let m2 = null;
    let d2 = Infinity;
    for (let i = 0; i < renderState.motes.length; i++) {
      const m = renderState.motes[i];
      const dx = m.pos[0] - px;
      const dz = m.pos[2] - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < d1) {
        d2 = d1;
        m2 = m1;
        d1 = dSq;
        m1 = m;
      } else if (dSq < d2) {
        d2 = dSq;
        m2 = m;
      }
    }
    const topMotes = [m1, m2];
    for (let i = 0; i < moteLights.length; i++) {
      const m = topMotes[i];
      if (m) {
        moteLights[i].position.set(m.pos[0], m.pos[1] + 0.85, m.pos[2]);
        moteLights[i].visible = true;
      } else {
        moteLights[i].visible = false;
      }
    }

    const drifterIds = new Set(renderState.drifters.filter((dr) => dr.state !== "removed").map((dr) => dr.id));
    for (const [id, obj] of drifterMap.entries()) {
      if (!drifterIds.has(id)) {
        scene.remove(obj.group);
        drifterMap.delete(id);
      }
    }
    for (const dr of renderState.drifters) {
      if (dr.state === "removed") continue;
      if (!drifterMap.has(dr.id)) {
        const obj = createDrifterMesh();
        drifterMap.set(dr.id, obj);
        scene.add(obj.group);
      }
      const obj = drifterMap.get(dr.id);
      obj.group.position.set(dr.pos[0], dr.pos[1] + Math.sin(timeSec * 5) * 0.2, dr.pos[2]);
      obj.group.rotation.y = timeSec * 2.2;
      obj.parts.forEach((p, idx) => {
        p.position.y = 1.2 + Math.sin(timeSec * 8 + idx) * 0.12;
      });
    }

    for (const c of renderState.charms) {
      if (!charmMap.has(c.id)) {
        const mesh = createCharmMesh();
        charmMap.set(c.id, mesh);
        scene.add(mesh);
      }
      const mesh = charmMap.get(c.id);
      mesh.visible = c.available;
      mesh.position.set(c.pos[0], c.pos[1] + 0.95 + Math.sin(timeSec * 3) * 0.15, c.pos[2]);
      mesh.rotation.y = timeSec * 2.0;
    }

    // Camera modes: benchmark | menuOrbit | dawnCinematic | play (with optional smooth blend)
    if (mode === "benchmark") {
      const a = camCtrl.angleRad;
      camera.position.set(30 * Math.cos(a), 15, -30 * Math.sin(a));
      camera.lookAt(0, 0, 0);
    } else if (mode === "menuOrbit") {
      const a = camCtrl.reducedMotion ? 0.52 : timeSec * 0.14;
      camera.position.set(42 * Math.cos(a), 20.5, 42 * Math.sin(a));
      camera.lookAt(0, 1.5, 0);
    } else if (mode === "dawnCinematic") {
      const p = Math.max(0, Math.min(1, camCtrl.progress ?? 0));
      const reduced = Boolean(camCtrl.reducedMotion);
      const lift = reduced ? 12 : 4 + p * 14;
      const distBack = reduced ? 20 : 9 + p * 22;
      const orbitA = reduced ? 0.25 : 0.15 + p * 0.45;
      camera.position.set(px + Math.sin(orbitA) * distBack, py + lift, pz + Math.cos(orbitA) * distBack);
      camera.lookAt(cx * 0.25, py + 4 + (reduced ? 6 : p * 10), -28);
    } else {
      const theta = (camYawDeg * Math.PI) / 180;
      const pitchRad = (Math.min(82, Math.max(18, camPitchDeg)) * Math.PI) / 180;
      const camRadius = 10.2;
      const horiz = camRadius * Math.cos(pitchRad);
      const height = camRadius * Math.sin(pitchRad);
      const desiredX = px - Math.sin(theta) * horiz;
      const desiredY = py + height;
      const desiredZ = pz - Math.cos(theta) * horiz;
      const blendAlpha = camCtrl?.blendAlpha ?? 1;
      if (blendAlpha < 1) {
        camTarget.set(desiredX, desiredY, desiredZ);
        camera.position.lerp(camTarget, Math.min(1, blendAlpha));
      } else {
        camera.position.set(desiredX, desiredY, desiredZ);
      }
      camera.lookAt(px, py + 1.0, pz);
    }

    renderer.render(scene, camera);

    const getRendererInfo = () => {
      const gl = renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return `Three.js r${THREE.REVISION} (${gpu})`;
    };

    const projectEdgeArrow = (worldPos, label) => {
      projVec.set(worldPos[0], worldPos[1] + 2.0, worldPos[2]).project(camera);
      const offScreen = projVec.z > 1 || Math.abs(projVec.x) > 0.95 || Math.abs(projVec.y) > 0.95;
      if (!offScreen) return null;
      const sx = projVec.z > 1 ? -projVec.x : projVec.x;
      const sy = projVec.z > 1 ? -projVec.y : projVec.y;
      return { id: label, angleDeg: (Math.atan2(-sy, sx) * 180) / Math.PI };
    };

    let nearest = null;
    let bestD = Infinity;
    for (const l of renderState.lanterns) {
      if (l.lit) continue;
      const dist = distXZ(renderState.player.pos, l.pos);
      if (dist < bestD) {
        bestD = dist;
        nearest = l;
      }
    }
    const arrow = nearest ? projectEdgeArrow(nearest.pos, nearest.id) : null;
    return { arrow, projectEdgeArrow, getRendererInfo };
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", handleResize);

  return { syncEntities, triggerPulseEffect, triggerSlashEffect };
}
