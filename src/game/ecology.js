import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "../sim/config.js";
import { getSurfaceHeights } from "../sim/maps.js";

export function bakeGeoPart(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  if (x || y || z) g.translate(x, y, z);
  return g;
}

export function createFlowingStreamTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0.0, "#7ae2f2");
  grad.addColorStop(0.14, "#184e68");
  grad.addColorStop(0.5, "#1f6c8d");
  grad.addColorStop(0.86, "#184e68");
  grad.addColorStop(1.0, "#7ae2f2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 28; i++) {
    const x = 12 + ((i * 37) % 104);
    const y = (i * 29) % 128;
    const h = 16 + (i % 4) * 10;
    ctx.fillStyle = i % 2 === 0 ? "rgba(195, 246, 255, 0.34)" : "rgba(120, 215, 240, 0.22)";
    ctx.fillRect(x, y, 2.5, h);
    if (y + h > 128) ctx.fillRect(x, y - 128, 2.5, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  return tex;
}

export function createFlowingStreamMesh(points, halfWidth, closed, waterMat) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "catmullrom", 0.5);
  const segs = closed ? 140 : 96;
  const positions = [];
  const uvs = [];
  const indices = [];
  const totalLen = Math.max(1, curve.getLength());
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) % 1;
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();
    positions.push(pt.x - right.x * halfWidth, pt.y, pt.z - right.z * halfWidth);
    positions.push(pt.x + right.x * halfWidth, pt.y, pt.z + right.z * halfWidth);
    const vCoord = (i / segs) * (totalLen / 8.0);
    uvs.push(0, vCoord, 1, vCoord);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, waterMat);
  mesh.receiveShadow = true;
  return mesh;
}

export function createPondMesh(x, y, z, radius, streamMat) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), streamMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.032;
  water.receiveShadow = true;
  group.add(water);

  const bankRing = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.15, radius + 0.35, 24),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.92 })
  );
  bankRing.rotation.x = -Math.PI / 2;
  bankRing.position.y = 0.024;
  bankRing.receiveShadow = true;
  group.add(bankRing);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x387058, roughness: 0.78 });
  const lotusMat = new THREE.MeshStandardMaterial({
    color: 0xffd1dc,
    emissive: 0xff8fab,
    emissiveIntensity: 0.25,
    roughness: 0.55
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    const pr = radius * (0.42 + (i % 2) * 0.24);
    const lx = Math.cos(a) * pr;
    const lz = Math.sin(a) * pr;
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 10, 1, false, 0.3, Math.PI * 1.8), padMat);
    lily.position.set(lx, 0.048, lz);
    group.add(lily);
    if (i % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 6), lotusMat);
      flower.position.set(lx, 0.12, lz);
      group.add(flower);
    }
  }
  return group;
}

export function createRockCluster(x, y, z, scale = 1) {
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

export function createWoodenPier(x, y, z, rotY = 0) {
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
  const boat = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.4, 2.8, 6), woodMat);
  boat.rotation.z = Math.PI / 2;
  boat.scale.set(0.45, 1, 0.95);
  boat.position.set(2.8, -0.35, 4.4);
  group.add(boat);
  return group;
}

const TREE_MATS = {
  wood: new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x224a3e, roughness: 0.86 }),
  leafMid: new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.82 }),
  autumnWarm: new THREE.MeshStandardMaterial({ color: 0x9b6434, roughness: 0.84 }),
  autumnPlum: new THREE.MeshStandardMaterial({ color: 0x5c3a62, roughness: 0.85 }),
  bud: new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffb347, emissiveIntensity: 0.9, roughness: 0.4 })
};

export function createVarietyTree(type, x, y, z, scale = 1, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  group.scale.setScalar(scale);

  const { wood: woodMat, leafDark, leafMid, autumnWarm, autumnPlum, bud: budMat } = TREE_MATS;

  if (type === "areca") {
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
  } else if (type === "autumn") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.9, 8), woodMat);
    trunk.position.y = 0.95;
    trunk.castShadow = true;
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), autumnWarm);
    c1.position.set(0, 2.5, 0);
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84, 1), autumnPlum);
    c2.position.set(-0.45, 2.9, 0.2);
    c2.castShadow = true;
    group.add(trunk, c1, c2);
  } else if (type === "flowerBush") {
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), leafMid);
    bush.scale.set(1.25, 0.78, 1.25);
    bush.position.y = 0.36;
    group.add(bush);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), budMat);
      bud.position.set(Math.cos(a) * 0.5, 0.56 + (i % 2) * 0.14, Math.sin(a) * 0.5);
      group.add(bud);
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.8, 8), woodMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), leafDark);
    crown1.position.set(0, 2.4, 0);
    crown1.castShadow = true;
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 1), leafMid);
    crown2.position.set(0.45, 2.85, 0.25);
    group.add(trunk, crown1, crown2);
  }
  return group;
}

export function createInstancedGrassField(night, isBlockedFn) {
  const bladeParts = [
    bakeGeoPart(new THREE.ConeGeometry(0.06, 0.42, 4), -0.09, 0.2, 0.03, 0.08, 0.3, 0.15),
    bakeGeoPart(new THREE.ConeGeometry(0.065, 0.52, 4), 0.02, 0.25, -0.04, -0.1, 1.1, -0.08),
    bakeGeoPart(new THREE.ConeGeometry(0.055, 0.38, 4), 0.1, 0.18, 0.06, 0.12, 2.1, -0.16)
  ];
  const grassGeo = mergeGeometries(bladeParts, false);
  const windUniforms = {
    uTime: { value: 0 },
    uWindAmp: { value: 0.1 }
  };
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindAmp = windUniforms.uWindAmp;
    shader.vertexShader = `uniform float uTime;\nuniform float uWindAmp;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       float hWeight = clamp(position.y * 2.0, 0.0, 1.0);
       float instPhase = 0.0;
       #ifdef USE_INSTANCING
         instPhase = instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.28;
       #endif
       transformed.x += sin(uTime * 2.1 + instPhase) * uWindAmp * hWeight;`
    );
  };

  const placements = [];
  const dummy = new THREE.Object3D();
  const paletteShades = [new THREE.Color(0x234c40), new THREE.Color(0x2f5d50), new THREE.Color(0x3a6f57), new THREE.Color(0x1f4037)];

  const addRingTufts = (cx, cz, minR, maxR, count, expectedY = 0) => {
    for (let i = 0; i < count; i++) {
      // Golden-angle pseudo-random deterministic scatter
      const t = (i + 0.5) / count;
      const r = minR + Math.sqrt(t) * (maxR - minR);
      const a = i * 2.399963 + night * 1.3;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const heights = getSurfaceHeights(night, x, z);
      if (heights.length === 0) continue;
      if (night === 3 && heights.some((h) => h > expectedY + 0.5)) continue;
      if (!heights.some((h) => Math.abs(h - expectedY) < 0.05)) continue;
      if (isBlockedFn(x, z, expectedY)) continue;
      placements.push({ x, y: expectedY, z, yaw: (i * 1.73) % (Math.PI * 2), s: 0.78 + ((i * 19) % 7) * 0.08, cIdx: i % paletteShades.length });
    }
  };

  if (night === 1) {
    addRingTufts(0, 0, 4.5, 37.5, 360, 0);
  } else if (night === 2) {
    addRingTufts(0, 0, 4.5, 25.5, 220, 0);
    addRingTufts(70, 0, 4.5, 25.5, 220, 0);
  } else {
    addRingTufts(0, 0, 9.5, 42.0, 340, 0);
    addRingTufts(0, 0, 13.0, 22.8, 100, 3);
    addRingTufts(0, 0, 3.0, 7.2, 40, 6);
  }

  const inst = new THREE.InstancedMesh(grassGeo, grassMat, Math.max(1, placements.length));
  inst.receiveShadow = false;
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.yaw, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, paletteShades[p.cIdx]);
  }
  inst.count = placements.length;
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

  return { mesh: inst, uniforms: windUniforms };
}

export function addIslandEcology(group, night, lanterns, streamMat) {
  const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.9 });
  const ponds = [];

  const isNearWater = (x, z, pad = 2.6) => ponds.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + pad);

  const isNearImportant = (x, z, minClear = 4.6) => {
    if (Math.hypot(x, z) < 5.2) return true;
    if (night === 2 && Math.hypot(x - 70, z) < 5.2) return true;
    if (night === 2 && x > 22 && x < 48 && Math.abs(z) < 5.0) return true;
    if (night === 3 && Math.hypot(x, z) < 25.5 && Math.hypot(x, z) > 10.5 && z > -2) return true;
    if (isNearWater(x, z, 2.2)) return true;
    return lanterns.some((l) => Math.hypot(x - l.pos[0], z - l.pos[2]) < minClear);
  };

  if (night === 1) {
    // Main winding river + side tributary brook
    const riverPts = [];
    for (let i = -10; i <= 10; i++) {
      const z = (i / 10) * 38.4;
      const x = Math.sin(z * 0.11) * 9.5 + 11.0;
      riverPts.push(new THREE.Vector3(x, 0.032, z));
      if (i % 3 === 0 && Math.abs(z) < 34) {
        group.add(createRockCluster(x + 2.4, 0, z, 0.55));
        group.add(createRockCluster(x - 2.4, 0, z, 0.48));
      }
    }
    group.add(createFlowingStreamMesh(riverPts, 1.9, false, streamMat));

    const branchPts = [
      new THREE.Vector3(11.0, 0.032, 0),
      new THREE.Vector3(19.5, 0.032, -2.8),
      new THREE.Vector3(28.0, 0.032, -7.2),
      new THREE.Vector3(36.5, 0.032, -10.5)
    ];
    group.add(createFlowingStreamMesh(branchPts, 1.05, false, streamMat));

    // Two cozy ponds with lily pads & lotus buds
    ponds.push({ x: -16.5, z: 19.0, r: 4.1 }, { x: 24.5, z: -21.0, r: 3.6 });
    for (const p of ponds) {
      group.add(createPondMesh(p.x, 0, p.z, p.r, streamMat));
      group.add(createRockCluster(p.x + p.r * 0.9, 0, p.z - p.r * 0.5, 0.72));
    }

    // Footbridges over river
    for (const bz of [-11, 12]) {
      const bx = Math.sin(bz * 0.11) * 9.5 + 11.0;
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.24, 2.5),
        new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 })
      );
      bridge.position.set(bx, 0.18, bz);
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      group.add(bridge);
    }

    group.add(createWoodenPier(0, 0, 39.2, 0));

    const treeTypes = ["round", "pine", "autumn", "flowerBush"];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + 0.12;
      const r = i % 2 === 0 ? 33.8 + (i % 3) * 1.1 : 17.5 + (i % 4) * 1.6;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      if (isNearImportant(x, z, 4.5)) continue;
      if (Math.abs(x - (Math.sin(z * 0.11) * 9.5 + 11.0)) < 3.4) continue;
      const kind = treeTypes[i % treeTypes.length];
      group.add(createVarietyTree(kind, x, 0, z, 0.9 + (i % 3) * 0.16, a));
      if (i % 4 === 0) group.add(createRockCluster(x * 0.91, 0, z * 0.91, 0.78));
    }
  } else if (night === 2) {
    for (const cx of [0, 70]) {
      const pts = [];
      for (let i = -8; i <= 8; i++) {
        const z = (i / 8) * 25.5;
        const x = cx + Math.cos(z * 0.14) * 5.5 - 9.0;
        pts.push(new THREE.Vector3(x, 0.032, z));
      }
      group.add(createFlowingStreamMesh(pts, 1.55, false, streamMat));
    }

    ponds.push({ x: 9.0, z: -15.5, r: 3.3 }, { x: 61.0, z: 14.5, r: 3.4 });
    for (const p of ponds) group.add(createPondMesh(p.x, 0, p.z, p.r, streamMat));

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

    const n2Types = ["areca", "flowerBush", "areca", "autumn"];
    for (const cx of [0, 70]) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.18;
        const r = i % 3 === 0 ? 15.5 : 24.4;
        const x = cx + r * Math.cos(a);
        const z = r * Math.sin(a);
        if (isNearImportant(x, z, 4.3)) continue;
        group.add(createVarietyTree(n2Types[i % n2Types.length], x, 0, z, 0.92 + (i % 2) * 0.2, a));
        if (i % 3 === 1) group.add(createRockCluster(cx + (r - 1.8) * Math.cos(a), 0, (r - 1.8) * Math.sin(a), 0.72));
      }
    }
  } else {
    // Night 3: Circular flowing moat stream at R=32m + pond + varied pine/autumn/flower groves
    const moatPts = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = 32.0 + Math.sin(a * 4) * 0.9;
      moatPts.push(new THREE.Vector3(Math.cos(a) * r, 0.032, Math.sin(a) * r));
    }
    group.add(createFlowingStreamMesh(moatPts, 1.65, true, streamMat));

    ponds.push({ x: -16.0, z: -22.0, r: 3.6 }, { x: 16.0, z: -22.0, r: 3.4 });
    for (const p of ponds) group.add(createPondMesh(p.x, 0, p.z, p.r, streamMat));

    const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
    for (const deg of [30, 150, 225, 315]) {
      const rad = (deg * Math.PI) / 180;
      const r = 32.0 + Math.sin(rad * 4) * 0.9;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 2.5), woodMat);
      bridge.position.set(Math.cos(rad) * r, 0.16, Math.sin(rad) * r);
      bridge.rotation.y = -rad;
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      group.add(bridge);
    }

    const n3Types = ["pine", "round", "autumn", "flowerBush"];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.12;
      const r = i % 2 === 0 ? 40.5 : 36.2;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      if (isNearImportant(x, z, 4.6)) continue;
      group.add(createVarietyTree(n3Types[i % n3Types.length], x, 0, z, 0.95 + (i % 3) * 0.2, a));
      if (i % 3 === 1) group.add(createRockCluster(r * 0.92 * Math.cos(a), 0, r * 0.92 * Math.sin(a), 0.85));
    }
  }

  // Instanced 3D swaying grass tufts across island tiers
  const grass = createInstancedGrassField(night, (x, z, y) => {
    if (isNearWater(x, z, 2.2)) return true;
    if (night === 1 && Math.abs(x - (Math.sin(z * 0.11) * 9.5 + 11.0)) < 2.6) return true;
    if (night === 2 && (Math.abs(x - (Math.cos(z * 0.14) * 5.5 - 9.0)) < 2.2 || Math.abs(x - 70 - (Math.cos(z * 0.14) * 5.5 - 9.0)) < 2.2)) {
      return true;
    }
    if (night === 3 && y === 0 && Math.abs(Math.hypot(x, z) - 32.0) < 3.0) return true;
    return lanterns.some((l) => Math.hypot(x - l.pos[0], z - l.pos[2]) < 2.4 && Math.abs(y - l.pos[1]) < 1.5);
  });
  group.add(grass.mesh);
  return grass;
}
