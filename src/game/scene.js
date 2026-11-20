import * as THREE from "three";
import { FIREFLY_TYPES, ISLAND_RADIUS, TUNING } from "../sim/config.js";

function createMayMesh() {
  const group = new THREE.Group();

  // Cloak body
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x3b6e8c, roughness: 0.75 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf6d5b8, roughness: 0.65 })
  );
  head.position.y = 1.2;
  group.add(head);

  // Conical leaf hat (non la)
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.34, 20),
    new THREE.MeshStandardMaterial({ color: 0xd9b36c, roughness: 0.85, side: THREE.DoubleSide })
  );
  hat.position.y = 1.44;
  hat.castShadow = true;
  group.add(hat);

  // Small lantern hanging from hat brim
  const miniLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffcf70,
      emissive: 0xff9d2e,
      emissiveIntensity: 1.6
    })
  );
  miniLantern.position.set(0.45, 1.18, 0.2);
  group.add(miniLantern);

  const playerLight = new THREE.PointLight(0xffb457, 2.2, 14, 1.6);
  playerLight.position.set(0, 1.4, 0.3);
  group.add(playerLight);

  return group;
}

function createLanternMesh(lantern) {
  const group = new THREE.Group();
  group.position.set(lantern.pos[0], 0, lantern.pos[2]);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.85, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: 0x4b435c, roughness: 0.9 })
  );
  base.position.y = 0.22;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 3.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x5c3e2e, roughness: 0.85 })
  );
  pillar.position.y = 1.7;
  group.add(pillar);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x625a75,
    emissive: 0x261f38,
    emissiveIntensity: 0.4,
    roughness: 0.4
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), coreMat);
  core.position.y = 3.4;
  group.add(core);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b2a24, roughness: 0.8 })
  );
  roof.position.y = 4.05;
  group.add(roof);

  const safeRingMat = new THREE.MeshBasicMaterial({
    color: 0xffb84d,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide
  });
  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.safe_radius - 0.18, TUNING.safe_radius, 48),
    safeRingMat
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.04;
  group.add(safeRing);

  const light = new THREE.PointLight(0xff9f38, 0, 22, 1.4);
  light.position.y = 3.4;
  group.add(light);

  return { group, coreMat, light, safeRingMat };
}

function createShadeMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x160726,
    emissive: 0x2b0b47,
    emissiveIntensity: 0.7,
    roughness: 0.5
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), bodyMat);
  body.scale.set(1, 1.35, 1);
  group.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc855ff });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eyeL.position.set(-0.2, 0.25, 0.52);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeL, eyeR);

  const stunRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd166 })
  );
  stunRing.rotation.x = Math.PI / 2;
  stunRing.position.y = 1.05;
  stunRing.visible = false;
  group.add(stunRing);

  return { group, bodyMat, eyeMat, stunRing };
}

export function createWorldRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const baseFogColor = new THREE.Color(0x0c081a);
  const litFogColor = new THREE.Color(0x231730);
  scene.background = baseFogColor.clone();
  scene.fog = new THREE.FogExp2(0x0c081a, 0.022);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);

  const ambient = new THREE.AmbientLight(0x5d5285, 0.75);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0x9fb8ff, 0.6);
  moonLight.position.set(-18, 30, -15);
  scene.add(moonLight);

  // Circular Island
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS - 2.5, 2.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x253835, roughness: 0.92 })
  );
  island.position.y = -1.2;
  scene.add(island);

  // Border stones & dock hint (Dao Ben)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_RADIUS - 0.3, 0.28, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x4b4860, roughness: 0.9 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  scene.add(rim);

  const dock = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.35, 7.0),
    new THREE.MeshStandardMaterial({ color: 0x5d4030, roughness: 0.85 })
  );
  dock.position.set(0, 0.05, ISLAND_RADIUS + 2.0);
  scene.add(dock);

  // Soft sea of clouds around island
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x1d1833, roughness: 1.0 });
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + (i % 3) * 2.5, 12, 10), cloudMat);
    puff.scale.y = 0.45;
    puff.position.set(Math.sin(angle) * (ISLAND_RADIUS + 10), -3.2, Math.cos(angle) * (ISLAND_RADIUS + 10));
    scene.add(puff);
  }

  const playerMesh = createMayMesh();
  scene.add(playerMesh);

  // Pulse shockwave ring
  const pulseWave = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.9, 40),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  pulseWave.rotation.x = -Math.PI / 2;
  pulseWave.position.y = 0.08;
  pulseWave.visible = false;
  scene.add(pulseWave);
  let pulseAnimTimer = 0;

  const lanternMap = new Map();
  const moteMap = new Map();
  const shadeMap = new Map();

  function triggerPulseEffect() {
    pulseAnimTimer = 0.45;
    pulseWave.visible = true;
  }

  function syncEntities(renderState, timeSec, camYawDeg) {
    // Player
    const [px, py, pz] = renderState.player.pos;
    playerMesh.position.set(px, py, pz);
    playerMesh.visible = renderState.player.invulnTimer <= 0 || Math.floor(timeSec * 16) % 2 === 0;

    // Pulse ring animation
    if (pulseAnimTimer > 0) {
      pulseAnimTimer = Math.max(0, pulseAnimTimer - 1 / 60);
      const progress = 1 - pulseAnimTimer / 0.45;
      const scale = 1 + progress * TUNING.pulse_radius;
      pulseWave.position.set(px, 0.1, pz);
      pulseWave.scale.set(scale, scale, 1);
      pulseWave.material.opacity = (1 - progress) * 0.8;
      if (pulseAnimTimer <= 0) pulseWave.visible = false;
    }

    // Lanterns & island illumination
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
        obj.coreMat.color.setHex(0xffd27a);
        obj.coreMat.emissive.setHex(0xff9924);
        obj.coreMat.emissiveIntensity = 1.8;
        obj.light.intensity = 5.5;
        obj.safeRingMat.opacity = 0.28;
      } else {
        const ratio = l.deposited / TUNING.lantern_cost;
        obj.coreMat.color.setHex(0x625a75);
        obj.coreMat.emissive.setHex(0xff9924);
        obj.coreMat.emissiveIntensity = ratio * 0.8;
        obj.light.intensity = ratio * 1.4;
        obj.safeRingMat.opacity = 0;
      }
    }

    const litRatio = litCount / TUNING.lantern_count_night1;
    ambient.intensity = 0.7 + litRatio * 0.75;
    scene.fog.density = 0.024 - litRatio * 0.011;
    scene.background.copy(baseFogColor).lerp(litFogColor, litRatio);
    scene.fog.color.copy(scene.background);

    // Fireflies (small / medium / large)
    const activeMoteIds = new Set(renderState.motes.map((m) => m.id));
    for (const [id, mesh] of moteMap.entries()) {
      if (!activeMoteIds.has(id)) {
        scene.remove(mesh);
        moteMap.delete(id);
      }
    }
    for (const m of renderState.motes) {
      if (!moteMap.has(m.id)) {
        const spec = FIREFLY_TYPES[m.size] ?? FIREFLY_TYPES.small;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.24 * spec.scale, 12, 10),
          new THREE.MeshBasicMaterial({ color: spec.color })
        );
        moteMap.set(m.id, mesh);
        scene.add(mesh);
      }
      const mesh = moteMap.get(m.id);
      mesh.position.set(m.pos[0], 0.75 + Math.sin(timeSec * 3.5 + m.pos[0]) * 0.2, m.pos[2]);
    }

    // Shades
    const activeShadeIds = new Set(renderState.shades.map((s) => s.id));
    for (const [id, obj] of shadeMap.entries()) {
      if (!activeShadeIds.has(id)) {
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
      obj.group.position.set(s.pos[0], s.pos[1] + Math.sin(timeSec * 4 + s.pos[2]) * 0.12, s.pos[2]);
      obj.group.lookAt(px, s.pos[1], pz);
      const isStunned = s.state === "stunned";
      obj.stunRing.visible = isStunned;
      obj.stunRing.rotation.z = timeSec * 5;
      obj.bodyMat.emissive.setHex(isStunned ? 0x5c4a78 : 0x2b0b47);
      obj.eyeMat.color.setHex(isStunned ? 0xffd166 : 0xc855ff);
    }

    // Third-person camera matching cam_yaw_deg
    const theta = (camYawDeg * Math.PI) / 180;
    const camDist = 11.5;
    const camHeight = 6.4;
    camera.position.set(
      px - Math.sin(theta) * camDist,
      py + camHeight,
      pz - Math.cos(theta) * camDist
    );
    camera.lookAt(px, py + 1.2, pz);
    renderer.render(scene, camera);
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", handleResize);

  return { syncEntities, triggerPulseEffect };
}
