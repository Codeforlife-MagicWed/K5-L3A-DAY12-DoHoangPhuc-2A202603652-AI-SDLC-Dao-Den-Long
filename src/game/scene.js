import * as THREE from "three";
import { FIREFLY_TYPES, PALETTE, TUNING, distXZ } from "../sim/config.js";

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
    new THREE.PointsMaterial({ color: 0xffe9b0, size: 0.9, transparent: true, opacity: 0.75 })
  );
}

function createTree(type, x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);

  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });
  const leafDark = new THREE.MeshStandardMaterial({ color: 0x244c41, roughness: 0.85 });
  const leafMid = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.82 });

  if (type === "areca") {
    // Tall slender areca / palm tree for Đảo Cau
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 4.6, 8), woodMat);
    trunk.position.y = 2.3;
    trunk.castShadow = true;
    group.add(trunk);
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.1, 5), i % 2 === 0 ? leafDark : leafMid);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 0.75, 4.55, Math.sin(a) * 0.75);
      frond.rotation.z = -Math.cos(a) * 1.05;
      frond.rotation.x = Math.sin(a) * 1.05;
      frond.castShadow = true;
      group.add(frond);
    }
  } else if (type === "pine") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.5, 7), woodMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);
    const tiers = [
      { r: 1.4, h: 1.8, y: 2.0 },
      { r: 1.05, h: 1.6, y: 3.1 },
      { r: 0.68, h: 1.3, y: 4.0 }
    ];
    for (let i = 0; i < tiers.length; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(tiers[i].r, tiers[i].h, 7), i % 2 === 0 ? leafDark : leafMid);
      cone.position.y = tiers[i].y;
      cone.castShadow = true;
      group.add(cone);
    }
  } else {
    // Stylized rounded fairy-tale tree
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.8, 8), woodMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), leafDark);
    crown1.position.set(0, 2.4, 0);
    crown1.castShadow = true;
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 1), leafMid);
    crown2.position.set(0.45, 2.85, 0.25);
    crown2.castShadow = true;
    group.add(trunk, crown1, crown2);
  }
  return group;
}

function createRockCluster(x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  const rockMat = new THREE.MeshStandardMaterial({ color: PALETTE.lanternUnlit, roughness: 0.95 });
  const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), rockMat);
  r1.scale.set(1.2, 0.7, 1.0);
  r1.position.y = 0.25;
  r1.castShadow = true;
  r1.receiveShadow = true;
  const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), rockMat);
  r2.position.set(0.55, 0.16, 0.35);
  r2.castShadow = true;
  group.add(r1, r2);
  return group;
}

function createWoodenPier(x, y, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
  for (let i = 0; i < 6; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.85), woodMat);
    plank.position.set(0, 0.08, i * 1.0);
    plank.receiveShadow = true;
    group.add(plank);
  }
  for (const sx of [-1.5, 1.5]) {
    for (const sz of [0.5, 4.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.4, 8), woodMat);
      post.position.set(sx, 0.45, sz);
      post.castShadow = true;
      group.add(post);
    }
  }
  // Tiny moored lantern boat
  const boat = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.4, 2.8, 6), woodMat);
  boat.rotation.z = Math.PI / 2;
  boat.scale.set(0.45, 1, 0.95);
  boat.position.set(2.8, -0.35, 4.4);
  group.add(boat);
  return group;
}

function addDecorAroundIsland(group, night, lanterns) {
  // Ground grass patches & pebbles
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x264b41, roughness: 0.95 });
  const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.9 });

  const isNearImportant = (x, z, minClear = 4.5) => {
    if (Math.hypot(x, z) < 5.0) return true;
    if (night === 2 && Math.hypot(x - 70, z) < 5.0) return true;
    if (night === 2 && x > 22 && x < 48 && Math.abs(z) < 5) return true;
    return lanterns.some((l) => Math.hypot(x - l.pos[0], z - l.pos[2]) < minClear);
  };

  if (night === 1) {
    // Trees & rocks around perimeter + mid-ring groves (clear of spawn & lanterns) + pier
    group.add(createWoodenPier(0, 0, 39.2, 0));
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.15;
      const r = i % 2 === 0 ? 33.5 + (i % 3) * 1.1 : 17.5 + (i % 3) * 1.4;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      if (isNearImportant(x, z, 4.8)) continue;
      group.add(createTree(i % 2 === 0 ? "round" : "pine", x, 0, z, 0.95 + (i % 3) * 0.16));
      if (i % 2 === 0) group.add(createRockCluster(x * 0.9, 0, z * 0.9, 0.85));
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.6 + (i % 3), 12), patchMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(Math.cos(a) * (14 + (i % 2) * 10), 0.02, Math.sin(a) * (14 + (i % 2) * 10));
      patch.receiveShadow = true;
      group.add(patch);
    }
  } else if (night === 2) {
    // Bamboo bridge side posts & ropes (purely decorative)
    const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
    for (const bx of [27, 31, 35, 39, 43]) {
      for (const bz of [-1.9, 1.9]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 6), woodMat);
        post.position.set(bx, 0.45, bz);
        post.castShadow = true;
        group.add(post);
      }
    }
    for (const bz of [-1.9, 1.9]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 18, 6), sandMat);
      rope.rotation.z = Math.PI / 2;
      rope.position.set(35, 0.88, bz);
      group.add(rope);
    }
    // Areca trees on Island A (0,0) & Island B (70,0)
    for (const cx of [0, 70]) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.22;
        const r = 24.5;
        const x = cx + r * Math.cos(a);
        const z = r * Math.sin(a);
        if (isNearImportant(x, z, 4.2)) continue;
        group.add(createTree("areca", x, 0, z, 0.95 + (i % 2) * 0.2));
        if (i % 2 === 1) group.add(createRockCluster(cx + (r - 2) * Math.cos(a), 0, (r - 2) * Math.sin(a), 0.75));
      }
    }
  } else {
    // Night 3: Pine trees around outer ring + rocks around tier 0
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.12;
      const r = 39.5;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      if (isNearImportant(x, z, 4.5)) continue;
      group.add(createTree(i % 3 === 0 ? "round" : "pine", x, 0, z, 1.0 + (i % 3) * 0.2));
      if (i % 3 === 1) group.add(createRockCluster(r * 0.88 * Math.cos(a), 0, r * 0.88 * Math.sin(a), 0.95));
    }
  }
}

function createMayMesh() {
  const group = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayCoat, roughness: 0.72 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, roughness: 0.45, metalness: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.82 });

  // Footwear
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), woodMat);
  footL.position.set(-0.14, 0.05, 0.04);
  const footR = footL.clone();
  footR.position.x = 0.14;
  group.add(footL, footR);

  // Two-layer robe & golden hem trim
  const innerSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.46, 0.62, 16), coatMat);
  innerSkirt.position.y = 0.36;
  innerSkirt.castShadow = true;
  const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 20), goldMat);
  hemTrim.rotation.x = Math.PI / 2;
  hemTrim.position.y = 0.08;
  const upperCoat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.48, 14), coatMat);
  upperCoat.position.y = 0.82;
  upperCoat.castShadow = true;
  group.add(innerSkirt, hemTrim, upperCoat);

  // Red waist sash + glowing firefly pouch
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 18), scarfMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.65;
  const pouch = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.fireflyGlow, emissive: PALETTE.lanternLit, emissiveIntensity: 0.9 })
  );
  pouch.position.set(-0.3, 0.6, 0.08);
  group.add(belt, pouch);

  // Wide sleeves & bamboo staff
  const sleeveL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 10), coatMat);
  sleeveL.position.set(-0.34, 0.78, 0.05);
  sleeveL.rotation.z = 0.45;
  const sleeveR = sleeveL.clone();
  sleeveR.position.x = 0.34;
  sleeveR.rotation.z = -0.45;
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 1.45, 8), woodMat);
  staff.position.set(0.44, 0.74, 0.14);
  staff.rotation.x = 0.12;
  staff.castShadow = true;
  group.add(sleeveL, sleeveR, staff);

  // Red scarf + dual trailing ribbons
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.075, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.05;
  const scarfTail1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.04), scarfMat);
  scarfTail1.position.set(0.08, 0.82, -0.25);
  scarfTail1.rotation.set(0.38, 0, -0.15);
  const scarfTail2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.04), scarfMat);
  scarfTail2.position.set(-0.08, 0.85, -0.24);
  scarfTail2.rotation.set(0.32, 0, 0.18);
  group.add(scarf, scarfTail1, scarfTail2);

  // Head + Non La conical hat with rim & chin strap
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xf4d4b8, roughness: 0.65 })
  );
  head.position.y = 1.24;
  head.castShadow = true;
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.66, 0.36, 24),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.85, side: THREE.DoubleSide })
  );
  hat.position.y = 1.48;
  hat.castShadow = true;
  const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.025, 6, 24), goldMat);
  hatRim.rotation.x = Math.PI / 2;
  hatRim.position.y = 1.31;
  const miniLantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({ color: PALETTE.lanternCore, emissive: PALETTE.lanternLit, emissiveIntensity: 2.0 })
  );
  miniLantern.position.set(0.46, 1.18, 0.28);
  group.add(head, hat, hatRim, miniLantern);

  // Warm personal light & ground aura around Mây
  const light = new THREE.PointLight(PALETTE.lanternLit, 4.2, 14, 1.5);
  light.position.set(0, 1.5, 0.25);
  group.add(light);

  const selfAura = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.lanternLit, transparent: true, opacity: 0.14, depthWrite: false })
  );
  selfAura.rotation.x = -Math.PI / 2;
  selfAura.position.y = 0.03;
  group.add(selfAura);

  return { group, footL, footR, scarfTail1, scarfTail2 };
}

function createLanternMesh(lantern) {
  const group = new THREE.Group();
  group.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);

  // Stone shrine floor circle
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

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.8 })
  );
  roof.position.y = 4.18;
  roof.castShadow = true;
  group.add(roof);

  // Dark zone ring when unlit vs Warm Safe Zone disc + border ring when lit
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
  const safeRing = new THREE.Mesh(new THREE.RingGeometry(TUNING.safe_radius - 0.2, TUNING.safe_radius, 48), safeRingMat);
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  group.add(safeRing);

  const light = new THREE.PointLight(PALETTE.lanternLit, 0, 26, 1.3);
  light.position.y = 3.6;
  group.add(light);

  return { group, coreMat, light, darkZoneMat, safeDiscMat, safeRingMat };
}

function createShadeMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeBody,
    emissive: PALETTE.shadeRim,
    emissiveIntensity: 0.7,
    roughness: 0.5
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.64, 1), bodyMat);
  body.scale.set(1, 1.35, 1);
  body.castShadow = true;
  group.add(body);

  // Dark wispy tendrils around shade base
  for (let i = 0; i < 3; i++) {
    const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 6), bodyMat);
    const a = (i / 3) * Math.PI * 2;
    wisp.position.set(Math.cos(a) * 0.42, -0.45, Math.sin(a) * 0.42);
    wisp.rotation.x = Math.PI;
    group.add(wisp);
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: PALETTE.shadeRim });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eyeL.position.set(-0.2, 0.25, 0.52);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeL, eyeR);

  const stunRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.goldAccent })
  );
  stunRing.rotation.x = Math.PI / 2;
  stunRing.position.y = 1.05;
  stunRing.visible = false;
  group.add(stunRing);

  return { group, bodyMat, eyeMat, stunRing };
}

function createDrifterMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.drifter,
    emissive: PALETTE.drifter,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide
  });
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.45 - i * 0.08, 0.24, 0.55), mat);
    seg.position.set(0, 1.2, -i * 0.52);
    group.add(seg);
    parts.push(seg);
  }
  return { group, parts };
}

function createCharmMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.72, 0.08),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, emissive: PALETTE.mayScarf, emissiveIntensity: 0.5 })
  );
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.82, 0.05),
    new THREE.MeshStandardMaterial({ color: PALETTE.goldAccent, emissive: PALETTE.goldAccent, emissiveIntensity: 0.35 })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.04, 6, 20),
    new THREE.MeshBasicMaterial({ color: PALETTE.goldAccent })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(border, body, ring);
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

function buildNightTerrain(night, map) {
  const group = new THREE.Group();
  const grassMat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.92 });
  const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
  const cloudMat = new THREE.MeshStandardMaterial({ color: PALETTE.cloudSea, roughness: 1.0 });

  const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), cloudMat);
  cloudSea.rotation.x = -Math.PI / 2;
  cloudSea.position.set(night === 2 ? 35 : 0, -11.5, 0);
  group.add(cloudSea);

  // Fluffy cloud puffs around horizon
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
    const tier1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false, curveSegments: 36 });
    tier1Geo.rotateX(Math.PI / 2);
    const tier1 = new THREE.Mesh(tier1Geo, sandMat);
    tier1.position.y = 3.0;
    tier1.receiveShadow = true;
    tier1.castShadow = true;
    group.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.65, 36), grassMat);
    tier2.position.y = 5.68;
    tier2.receiveShadow = true;
    tier2.castShadow = true;
    group.add(tier2);

    // Detailed Bell Tower on Tier 2
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

    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampLen = Math.hypot(6, 3);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.3, 3.0), woodMat);
      ramp.position.set(27.0 * Math.cos(rad), 1.35, 27.0 * Math.sin(rad));
      ramp.rotation.y = -rad;
      ramp.rotation.z = Math.atan2(3, 6);
      ramp.receiveShadow = true;
      ramp.castShadow = true;
      group.add(ramp);
    }
  }

  for (const pad of map.launchpads) {
    group.add(createLaunchpadMesh(pad.pos));
  }
  addDecorAroundIsland(group, night, map.lanterns);

  return group;
}

export function createWorldRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyNight);
  scene.fog = new THREE.FogExp2(PALETTE.fogNight, 0.028);
  scene.add(createStarfield());

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);

  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0x8aa2e8, 0.16);
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

  const playerRig = createMayMesh();
  scene.add(playerRig.group);

  // Pooled warm point lights for the nearest 2 fireflies (ground discs provide glow on all fireflies)
  const moteLights = Array.from({ length: 2 }, () => {
    const l = new THREE.PointLight(PALETTE.fireflyGlow, 1.8, 7.5, 1.8);
    l.visible = false;
    scene.add(l);
    return l;
  });

  const pulseWave = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.85, 36),
    new THREE.MeshBasicMaterial({ color: PALETTE.goldAccent, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  pulseWave.rotation.x = -Math.PI / 2;
  pulseWave.visible = false;
  scene.add(pulseWave);
  let pulseAnimTimer = 0;

  let terrainGroup = null;
  let currentNight = 0;
  const lanternMap = new Map();
  const moteMap = new Map();
  const shadeMap = new Map();
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
    terrainGroup = buildNightTerrain(night, map);
    scene.add(terrainGroup);
    clearMapObjects(lanternMap);
    clearMapObjects(moteMap);
    clearMapObjects(shadeMap);
    clearMapObjects(drifterMap);
    clearMapObjects(charmMap);
  }

  function triggerPulseEffect() {
    pulseAnimTimer = 0.4;
    pulseWave.visible = true;
  }

  function syncEntities(renderState, timeSec, camYawDeg) {
    if (renderState.night !== currentNight) {
      resetForNight(renderState.night, renderState.map);
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
    playerRig.footL.position.z = 0.04 + walkPhase * 0.16;
    playerRig.footR.position.z = 0.04 - walkPhase * 0.16;
    playerRig.scarfTail1.rotation.x = 0.35 + (speedXZ > 0.4 ? 0.35 + Math.sin(timeSec * 10) * 0.12 : 0);
    playerRig.scarfTail2.rotation.x = 0.3 + (speedXZ > 0.4 ? 0.3 - Math.sin(timeSec * 10) * 0.12 : 0);

    if (pulseAnimTimer > 0) {
      pulseAnimTimer = Math.max(0, pulseAnimTimer - 1 / 60);
      const p = 1 - pulseAnimTimer / 0.4;
      const scale = 1 + p * TUNING.pulse_radius;
      pulseWave.position.set(px, py + 0.15, pz);
      pulseWave.scale.set(scale, scale, 1);
      pulseWave.material.opacity = (1 - p) * 0.85;
      if (pulseAnimTimer <= 0) pulseWave.visible = false;
    }

    let litCount = 0;
    for (const l of renderState.lanterns) {
      if (!lanternMap.has(l.id)) {
        const obj = createLanternMesh(l);
        lanternMap.set(l.id, obj);
        scene.add(obj.group);
      }
      const obj = lanternMap.get(l.id);
      if (l.lit) {
        litCount++;
        obj.coreMat.color.setHex(PALETTE.lanternCore);
        obj.coreMat.emissive.setHex(PALETTE.lanternLit);
        obj.coreMat.emissiveIntensity = 1.85;
        obj.light.intensity = 6.2;
        obj.darkZoneMat.opacity = 0;
        obj.safeDiscMat.opacity = 0.14;
        obj.safeRingMat.opacity = 0.5;
      } else {
        const ratio = l.deposited / TUNING.lantern_cost;
        obj.coreMat.color.setHex(PALETTE.lanternUnlit);
        obj.coreMat.emissive.setHex(PALETTE.lanternLit);
        obj.coreMat.emissiveIntensity = ratio * 0.85;
        obj.light.intensity = ratio * 1.8;
        obj.darkZoneMat.opacity = 0.18;
        obj.safeDiscMat.opacity = 0;
        obj.safeRingMat.opacity = 0;
      }
    }
    const litRatio = litCount / Math.max(1, renderState.lanterns.length);
    ambient.intensity = 0.15 + 0.55 * litRatio;
    scene.fog.density = 0.03 - litRatio * 0.016;

    const moteIds = new Set(renderState.motes.map((m) => m.id));
    for (const [id, mesh] of moteMap.entries()) {
      if (!moteIds.has(id)) {
        scene.remove(mesh);
        moteMap.delete(id);
      }
    }
    for (const m of renderState.motes) {
      if (!moteMap.has(m.id)) {
        const spec = FIREFLY_TYPES[m.size] ?? FIREFLY_TYPES.small;
        const group = new THREE.Group();
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.18 * spec.scale, 10, 8),
          new THREE.MeshBasicMaterial({ color: PALETTE.fireflyCore })
        );
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.36 * spec.scale, 10, 8),
          new THREE.MeshBasicMaterial({ color: PALETTE.fireflyGlow, transparent: true, opacity: 0.48 })
        );
        const groundGlow = new THREE.Mesh(
          new THREE.CircleGeometry(1.6 * spec.scale, 16),
          new THREE.MeshBasicMaterial({ color: PALETTE.fireflyGlow, transparent: true, opacity: 0.22, depthWrite: false })
        );
        groundGlow.rotation.x = -Math.PI / 2;
        groundGlow.position.y = -0.68;
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.26 * spec.scale, 0.12 * spec.scale), wingMat);
        wingL.position.set(-0.18 * spec.scale, 0.05, 0);
        const wingR = wingL.clone();
        wingR.position.x = 0.18 * spec.scale;
        group.add(core, halo, groundGlow, wingL, wingR);
        moteMap.set(m.id, group);
        scene.add(group);
      }
      const mesh = moteMap.get(m.id);
      mesh.position.set(
        m.pos[0] + Math.sin(timeSec * 2.5 + m.pos[2]) * 0.14,
        m.pos[1] + 0.72 + Math.sin(timeSec * 3.8 + m.pos[0]) * 0.18,
        m.pos[2]
      );
      mesh.rotation.y = timeSec * 3;
    }

    // Attach pooled point lights to the 6 nearest fireflies
    const nearestMotes = [...renderState.motes]
      .sort((a, b) => distXZ(a.pos, renderState.player.pos) - distXZ(b.pos, renderState.player.pos))
      .slice(0, moteLights.length);
    for (let i = 0; i < moteLights.length; i++) {
      if (i < nearestMotes.length) {
        const m = nearestMotes[i];
        moteLights[i].position.set(m.pos[0], m.pos[1] + 0.9, m.pos[2]);
        moteLights[i].visible = true;
      } else {
        moteLights[i].visible = false;
      }
    }

    const shadeIds = new Set(renderState.shades.map((s) => s.id));
    for (const [id, obj] of shadeMap.entries()) {
      if (!shadeIds.has(id)) {
        scene.remove(obj.group);
        shadeMap.delete(id);
      }
    }
    for (const s of renderState.shades) {
      if (!shadeMap.has(s.id)) {
        const obj = createShadeMesh();
        shadeMap.set(s.id, obj);
        scene.add(obj.group);
      }
      const obj = shadeMap.get(s.id);
      obj.group.position.set(s.pos[0], s.pos[1] + 1.0 + Math.sin(timeSec * 4 + s.pos[2]) * 0.1, s.pos[2]);
      obj.group.lookAt(px, s.pos[1] + 1.0, pz);
      const isStunned = s.state === "stunned";
      const isSpawning = s.state === "spawning";
      obj.stunRing.visible = isStunned;
      obj.stunRing.rotation.z = timeSec * 5;
      obj.bodyMat.transparent = isSpawning;
      obj.bodyMat.opacity = isSpawning ? 0.45 : 1.0;
      obj.bodyMat.color.setHex(isStunned ? PALETTE.shadeStunned : PALETTE.shadeBody);
      obj.bodyMat.emissive.setHex(isStunned ? PALETTE.shadeStunned : PALETTE.shadeRim);
    }

    const drifterIds = new Set(renderState.drifters.filter((d) => d.state !== "removed").map((d) => d.id));
    for (const [id, obj] of drifterMap.entries()) {
      if (!drifterIds.has(id)) {
        scene.remove(obj.group);
        drifterMap.delete(id);
      }
    }
    for (const d of renderState.drifters) {
      if (d.state === "removed") continue;
      if (!drifterMap.has(d.id)) {
        const obj = createDrifterMesh();
        drifterMap.set(d.id, obj);
        scene.add(obj.group);
      }
      const obj = drifterMap.get(d.id);
      obj.group.position.set(d.pos[0], d.pos[1] + Math.sin(timeSec * 5) * 0.2, d.pos[2]);
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

    const theta = (camYawDeg * Math.PI) / 180;
    camera.position.set(px - Math.sin(theta) * 8.4, py + 4.8, pz - Math.cos(theta) * 8.4);
    camera.lookAt(px, py + 1.15, pz);
    renderer.render(scene, camera);

    let nearest = null;
    let bestD = Infinity;
    for (const l of renderState.lanterns) {
      if (l.lit) continue;
      const d = distXZ(renderState.player.pos, l.pos);
      if (d < bestD) {
        bestD = d;
        nearest = l;
      }
    }
    let arrow = null;
    if (nearest) {
      const proj = new THREE.Vector3(nearest.pos[0], nearest.pos[1] + 2.5, nearest.pos[2]).project(camera);
      const offScreen = proj.z > 1 || Math.abs(proj.x) > 0.95 || Math.abs(proj.y) > 0.95;
      if (offScreen) {
        const sx = proj.z > 1 ? -proj.x : proj.x;
        const sy = proj.z > 1 ? -proj.y : proj.y;
        const angleRad = Math.atan2(-sy, sx);
        arrow = { id: nearest.id, angleDeg: (angleRad * 180) / Math.PI };
      }
    }
    return { arrow };
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", handleResize);

  return { syncEntities, triggerPulseEffect };
}
