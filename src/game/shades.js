import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "../sim/config.js";
import { bakeGeoPart } from "./ecology.js";

/**
 * Refined multi-layered Shadow Shade (Bóng Mực) instanced renderer
 * with an independent InstancedMesh eye-tracking system aimed at Mây.
 */
export function createShadeSystem(scene, maxCount = 256) {
  // 1. Multi-layered tattered cloak, sharp cape collar, hooded head, and crown horns
  const bodyParts = [
    bakeGeoPart(new THREE.ConeGeometry(0.64, 1.38, 12), 0, 0.02, 0), // Inner cloak core
    bakeGeoPart(new THREE.CylinderGeometry(0.46, 0.72, 0.65, 10, 1, false), 0, -0.25, 0), // Layered mantle skirt
    bakeGeoPart(new THREE.BoxGeometry(1.08, 0.14, 0.44), 0, 0.34, -0.05, 0.18, 0, 0), // Sharp ghostly collar/shoulders
    bakeGeoPart(new THREE.ConeGeometry(0.32, 0.56, 6), -0.42, 0.12, -0.08, 0, 0, 0.35), // Left shoulder tatters
    bakeGeoPart(new THREE.ConeGeometry(0.32, 0.56, 6), 0.42, 0.12, -0.08, 0, 0, -0.35), // Right shoulder tatters
    bakeGeoPart(new THREE.SphereGeometry(0.39, 12, 10), 0, 0.58, 0.04), // Hooded head
    bakeGeoPart(new THREE.ConeGeometry(0.42, 0.52, 10), 0, 0.76, -0.06, -0.38, 0, 0), // Flowing pointed hood tip
    // Stylized curved obsidian crown/horns (2 segments per horn)
    bakeGeoPart(new THREE.ConeGeometry(0.11, 0.42, 6), -0.25, 0.94, 0.0, 0.1, 0, 0.48),
    bakeGeoPart(new THREE.ConeGeometry(0.07, 0.34, 6), -0.38, 1.15, -0.04, 0.15, 0, 0.16),
    bakeGeoPart(new THREE.ConeGeometry(0.11, 0.42, 6), 0.25, 0.94, 0.0, 0.1, 0, -0.48),
    bakeGeoPart(new THREE.ConeGeometry(0.07, 0.34, 6), 0.38, 1.15, -0.04, 0.15, 0, -0.16)
  ];
  const bodyGeo = mergeGeometries(bodyParts, false);

  // 2. Swirling ink/smoke tendrils at the base (rotates independently)
  const tendrilParts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tilt = (i % 2 === 0 ? 0.24 : -0.18);
    tendrilParts.push(
      bakeGeoPart(
        new THREE.ConeGeometry(0.15, 0.78, 5),
        Math.cos(a) * 0.52,
        -0.46,
        Math.sin(a) * 0.52,
        Math.PI + tilt,
        a,
        0
      )
    );
  }
  const tendrilGeo = mergeGeometries(tendrilParts, false);

  // 3. Independent eye-tracking head overlay (glowing eye sockets + focused pupils)
  const eyeGeo = mergeGeometries(
    [
      bakeGeoPart(new THREE.BoxGeometry(0.15, 0.07, 0.09), -0.145, 0, 0.37, 0, 0.12, -0.24),
      bakeGeoPart(new THREE.BoxGeometry(0.15, 0.07, 0.09), 0.145, 0, 0.37, 0, -0.12, 0.24)
    ],
    false
  );
  const pupilGeo = mergeGeometries(
    [
      bakeGeoPart(new THREE.SphereGeometry(0.036, 6, 5), -0.14, 0, 0.415),
      bakeGeoPart(new THREE.SphereGeometry(0.036, 6, 5), 0.14, 0, 0.415)
    ],
    false
  );

  const auraGeo = bakeGeoPart(new THREE.TorusGeometry(0.78, 0.038, 6, 20), 0, 0.18, 0, Math.PI / 2, 0, 0);
  const stunGeo = bakeGeoPart(new THREE.TorusGeometry(0.6, 0.055, 6, 20), 0, 1.32, 0, Math.PI / 2, 0, 0);

  const makeBatch = (bodyMat, tendrilColor, eyeColor, pupilColor, auraColor, withStun = false) => {
    const body = new THREE.InstancedMesh(bodyGeo, bodyMat, maxCount);
    const tendrils = new THREE.InstancedMesh(
      tendrilGeo,
      new THREE.MeshBasicMaterial({ color: tendrilColor, transparent: true, opacity: 0.85 }),
      maxCount
    );
    const eyes = new THREE.InstancedMesh(eyeGeo, new THREE.MeshBasicMaterial({ color: eyeColor }), maxCount);
    const pupils = new THREE.InstancedMesh(pupilGeo, new THREE.MeshBasicMaterial({ color: pupilColor }), maxCount);
    const aura = new THREE.InstancedMesh(
      auraGeo,
      new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.65 }),
      maxCount
    );
    const stun = withStun
      ? new THREE.InstancedMesh(stunGeo, new THREE.MeshBasicMaterial({ color: PALETTE.goldAccent }), maxCount)
      : null;

    for (const m of [body, tendrils, eyes, pupils, aura, stun]) {
      if (!m) continue;
      m.count = 0;
      m.frustumCulled = false;
      scene.add(m);
    }
    return { body, tendrils, eyes, pupils, aura, stun };
  };

  const normalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeBody,
    emissive: PALETTE.shadeRim,
    emissiveIntensity: 0.68,
    roughness: 0.45
  });
  const drainMat = new THREE.MeshStandardMaterial({
    color: 0x24071e,
    emissive: 0xff4081,
    emissiveIntensity: 0.95,
    roughness: 0.35
  });
  const spawnMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeBody,
    emissive: PALETTE.shadeRim,
    emissiveIntensity: 0.65,
    roughness: 0.45,
    transparent: true,
    opacity: 0.45
  });
  const stunnedMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeStunned,
    emissive: PALETTE.shadeStunned,
    emissiveIntensity: 0.45,
    roughness: 0.55
  });

  const batches = {
    normal: makeBatch(normalMat, 0x1a0c2b, PALETTE.shadeRim, 0xffffff, PALETTE.shadeRim, false),
    drain: makeBatch(drainMat, 0x450b2c, 0xff5a5f, 0xffe9b0, 0xff5a5f, false),
    spawning: makeBatch(spawnMat, 0x1a0c2b, PALETTE.shadeRim, 0xffffff, PALETTE.shadeRim, false),
    stunned: makeBatch(stunnedMat, 0x3a3450, PALETTE.goldAccent, 0x120a1a, PALETTE.goldAccent, true)
  };

  const bodyDummy = new THREE.Object3D();
  const eyeDummy = new THREE.Object3D();
  const auraDummy = new THREE.Object3D();
  const tendrilDummy = new THREE.Object3D();

  function shortestAngleDiff(from, to) {
    let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function reset() {
    for (const b of [batches.normal, batches.drain, batches.spawning, batches.stunned]) {
      b.body.count = 0;
      b.tendrils.count = 0;
      b.eyes.count = 0;
      b.pupils.count = 0;
      b.aura.count = 0;
      if (b.stun) b.stun.count = 0;
    }
  }

  function update(shades, playerPos, timeSec, colorblind, lanterns) {
    const rimColor = colorblind ? PALETTE.shadeRimColorblind : PALETTE.shadeRim;
    const drainColor = colorblind ? 0xffffff : 0xff5a5f;

    batches.normal.body.material.emissive.setHex(rimColor);
    batches.normal.eyes.material.color.setHex(rimColor);
    batches.normal.aura.material.color.setHex(rimColor);

    batches.spawning.body.material.emissive.setHex(rimColor);
    batches.spawning.eyes.material.color.setHex(rimColor);
    batches.spawning.aura.material.color.setHex(rimColor);

    batches.drain.eyes.material.color.setHex(drainColor);
    batches.drain.aura.material.color.setHex(drainColor);

    const stunFlicker = Math.sin(timeSec * 22) > 0 ? PALETTE.goldAccent : 0x5c5375;
    batches.stunned.eyes.material.color.setHex(stunFlicker);

    const counts = { normal: 0, drain: 0, spawning: 0, stunned: 0 };
    const [px, py, pz] = playerPos;

    for (let i = 0; i < shades.length; i++) {
      const s = shades[i];
      const bob = Math.sin(timeSec * 4.2 + s.pos[2] * 0.7) * 0.1;
      const sy = s.pos[1] + 1.0 + bob;

      // Body faces movement/drain target when not chasing, or tracks player
      let bodyYaw = Math.atan2(px - s.pos[0], pz - s.pos[2]);
      if (s.state === "drain" && s.targetLanternId) {
        for (let k = 0; k < lanterns.length; k++) {
          if (lanterns[k].id === s.targetLanternId) {
            bodyYaw = Math.atan2(lanterns[k].pos[0] - s.pos[0], lanterns[k].pos[2] - s.pos[2]);
            break;
          }
        }
      }

      // Independent Eye Tracking toward Mây (clamped ±75 deg yaw, ±35 deg pitch relative to body)
      const dxP = px - s.pos[0];
      const dyP = py + 0.92 - (sy + 0.58);
      const dzP = pz - s.pos[2];
      const distXZP = Math.max(0.01, Math.hypot(dxP, dzP));
      const targetYaw = Math.atan2(dxP, dzP);
      const relYaw = clamp(shortestAngleDiff(bodyYaw, targetYaw), -1.3, 1.3);
      const eyeYaw = bodyYaw + relYaw + (s.state === "stunned" ? Math.sin(timeSec * 14 + i) * 0.35 : 0);
      const eyePitch = clamp(-Math.atan2(dyP, distXZP), -0.6, 0.55);

      bodyDummy.position.set(s.pos[0], sy, s.pos[2]);
      bodyDummy.rotation.set(s.state === "drain" ? 0.14 : 0, bodyYaw, 0);
      bodyDummy.scale.setScalar(1);
      bodyDummy.updateMatrix();

      eyeDummy.position.set(s.pos[0], sy + 0.58, s.pos[2]);
      eyeDummy.rotation.set(eyePitch, eyeYaw, 0, "YXZ");
      eyeDummy.scale.setScalar(1);
      eyeDummy.updateMatrix();

      tendrilDummy.position.set(s.pos[0], sy, s.pos[2]);
      tendrilDummy.rotation.set(0, timeSec * (s.state === "drain" ? 4.8 : 2.1) + i, 0);
      tendrilDummy.scale.setScalar(1);
      tendrilDummy.updateMatrix();

      auraDummy.position.set(s.pos[0], sy, s.pos[2]);
      auraDummy.rotation.set(0, -timeSec * 2.5, 0);
      auraDummy.scale.setScalar(s.state === "drain" ? 1.15 + Math.sin(timeSec * 8) * 0.08 : 1);
      auraDummy.updateMatrix();

      const key =
        s.state === "stunned" ? "stunned" : s.state === "spawning" ? "spawning" : s.state === "drain" ? "drain" : "normal";
      const idx = counts[key];
      if (idx >= maxCount) continue;
      const b = batches[key];
      b.body.setMatrixAt(idx, bodyDummy.matrix);
      b.tendrils.setMatrixAt(idx, tendrilDummy.matrix);
      b.eyes.setMatrixAt(idx, eyeDummy.matrix);
      b.pupils.setMatrixAt(idx, eyeDummy.matrix);
      b.aura.setMatrixAt(idx, auraDummy.matrix);
      if (b.stun) b.stun.setMatrixAt(idx, auraDummy.matrix);
      counts[key]++;
    }

    for (const key of ["normal", "drain", "spawning", "stunned"]) {
      const b = batches[key];
      const c = counts[key];
      b.body.count = c;
      b.tendrils.count = c;
      b.eyes.count = c;
      b.pupils.count = c;
      b.aura.count = c;
      b.body.instanceMatrix.needsUpdate = true;
      b.tendrils.instanceMatrix.needsUpdate = true;
      b.eyes.instanceMatrix.needsUpdate = true;
      b.pupils.instanceMatrix.needsUpdate = true;
      b.aura.instanceMatrix.needsUpdate = true;
      if (b.stun) {
        b.stun.count = c;
        b.stun.instanceMatrix.needsUpdate = true;
      }
    }
  }

  return { reset, update };
}
