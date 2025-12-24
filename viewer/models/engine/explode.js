import * as THREE from 'three';

const state = {
  parts: [],
  isExploded: false,
  playing: false,
  dir: 1,
  t: 0,
  duration: 2.2,
  raf: null,
};

function smoothstep(x) {
  return x * x * (3 - 2 * x);
}

function stopExplodeLoop() {
  if (state.raf) {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }
  state.playing = false;
}

export function prepareExplode(model) {
  state.parts.length = 0;

  model.updateWorldMatrix(true, true);

  const modelBox = new THREE.Box3().setFromObject(model);
  const modelCenter = new THREE.Vector3();
  const modelSize = new THREE.Vector3();

  modelBox.getCenter(modelCenter);
  modelBox.getSize(modelSize);

  const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);

  const LIFT = 0.15 * maxDim;
  const DIST_H = 0.35 * maxDim;

  const meshes = [];
  model.traverse(o => o.isMesh && meshes.push(o));

  meshes.forEach(m => {
    const startPos = m.position.clone();

    const partBox = new THREE.Box3().setFromObject(m);
    const partCenterW = new THREE.Vector3();
    partBox.getCenter(partCenterW);

    const v = new THREE.Vector3().subVectors(partCenterW, modelCenter);

    let axis = 'x';
    if (Math.abs(v.z) > Math.abs(v.x)) axis = 'z';

    const sign = Math.sign(axis === 'x' ? v.x : v.z) || 1;

    const midWorld = partCenterW.clone();
    midWorld.y += LIFT;

    let midPos = m.parent.worldToLocal(midWorld.clone());
    if (midPos.y < 0.05) midPos.y = 0.05;

    const finalWorld = midWorld.clone();
    if (axis === 'x') finalWorld.x += sign * DIST_H;
    else finalWorld.z += sign * DIST_H;

    let finalPos = m.parent.worldToLocal(finalWorld.clone());
    if (finalPos.y < 0.05) finalPos.y = 0.05;

    state.parts.push({ obj: m, startPos, midPos, finalPos });
  });
}

function updateExplode(dt) {
  if (!state.playing || state.parts.length === 0) return;

  const delta = (dt / state.duration) * state.dir;
  state.t = THREE.MathUtils.clamp(state.t + delta, 0, 1);

  const t = state.t;

  state.parts.forEach(p => {
    if (t <= 0.5) {
      const k = smoothstep(t * 2);
      p.obj.position.lerpVectors(p.startPos, p.midPos, k);
    } else {
      const k = smoothstep((t - 0.5) * 2);
      p.obj.position.lerpVectors(p.midPos, p.finalPos, k);
    }
  });

  if (state.t === 0 || state.t === 1) {
    state.playing = false;
    state.isExploded = (state.t === 1);
  }
}

function playExplode(forward = true) {
  state.dir = forward ? 1 : -1;
  state.playing = true;

  if (!state.raf) {
    let last = performance.now();

    const loop = now => {
      const dt = (now - last) / 1000;
      last = now;

      updateExplode(dt);

      if (state.playing) {
        state.raf = requestAnimationFrame(loop);
      } else {
        state.raf = null;
      }
    };

    state.raf = requestAnimationFrame(loop);
  }
}

export function explodeMotor() {
  playExplode(true);
  return true;
}

export function implodeMotor() {
  playExplode(false);
  return false;
}

export function toggleExplode() {
  if (state.isExploded) return implodeMotor();
  return explodeMotor();
}

export function isExploded() {
  return state.isExploded;
}

export function resetExplodeState() {
  stopExplodeLoop();
  state.t = 0;
  state.isExploded = false;
}
