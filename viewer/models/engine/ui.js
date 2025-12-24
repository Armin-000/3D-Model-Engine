import * as THREE from 'three';
import { getNiceName, PART_INFO } from './naming.js';
import { isExploded } from './explode.js';

const gsap = window.gsap || null;

let cameraRef    = null;
let controlsRef  = null;
let containerRef = null;
let rendererRef  = null;
let rootRef      = null;

let labelLayer   = null;
let labelRAF     = null;

let focusMode    = false;
let focusedPart  = null;

const savedVisibility = new Map();
const savedCamPos     = new THREE.Vector3();
const savedCamTarget  = new THREE.Vector3();

const labelItems = [];

let infoPanel        = null;
let infoTitleEl      = null;
let infoTextEl       = null;
let infoCloseBtn     = null;
let infoCloseHandler = null;

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let pickHandler = null;

function ensureLayer() {
  if (labelLayer) return labelLayer;
  if (!containerRef) return null;

  const host = containerRef.parentElement || containerRef;
  if (!host.style.position || host.style.position === 'static') {
    host.style.position = 'relative';
  }

  const layer = document.createElement('div');
  layer.className = 'engine-label-layer';
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '30',
  });

  host.appendChild(layer);
  labelLayer = layer;
  return layer;
}

function ensureInfoPanel() {
  if (infoPanel) return infoPanel;

  const viewer = document.getElementById('viewer');
  if (!viewer) return null;

  const panel = document.createElement('div');
  panel.className = 'engine-info-panel';
  panel.innerHTML = `
    <div class="engine-info-inner">
      <div class="engine-info-main">
        <h4 class="engine-info-title"></h4>
        <p class="engine-info-text"></p>
      </div>
      <button class="engine-info-close" type="button" aria-label="Close">✕</button>
    </div>
  `;
  viewer.appendChild(panel);

  infoTitleEl  = panel.querySelector('.engine-info-title');
  infoTextEl   = panel.querySelector('.engine-info-text');
  infoCloseBtn = panel.querySelector('.engine-info-close');

  infoCloseHandler = () => exitFocusMode();
  infoCloseBtn.addEventListener('click', infoCloseHandler);

  panel.style.display = 'none';
  infoPanel = panel;
  return panel;
}

function showInfoPanel(partName) {
  const panel = ensureInfoPanel();
  if (!panel) return;

  const desc = PART_INFO[partName] || PART_INFO['Engine Component'];

  infoTitleEl.textContent = partName;
  infoTextEl.textContent  = desc;
  panel.style.display = 'block';
}

function hideInfoPanel() {
  if (!infoPanel) return;
  infoPanel.style.display = 'none';
}

function focusOnPart(mesh, labelText) {
  if (!rootRef || !cameraRef || !controlsRef) return;
  if (focusedPart === mesh) return;

  if (!focusedPart) {
    savedVisibility.clear();
    rootRef.traverse(o => {
      if (o.isMesh) savedVisibility.set(o, o.visible);
    });
    savedCamPos.copy(cameraRef.position);
    savedCamTarget.copy(controlsRef.target);
  }

  focusedPart = mesh;
  focusMode   = true;

  labelItems.forEach(item => {
    if (item.el) item.el.style.display = 'none';
  });

  rootRef.traverse(o => {
    if (o.isMesh) o.visible = (o === mesh);
  });

  const box    = new THREE.Box3().setFromObject(mesh);
  const size   = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov    = cameraRef.fov * Math.PI / 180;
  let distance = (maxDim / 2) / Math.tan(fov / 2);
  distance *= 1.6;

  const dir    = new THREE.Vector3(2.5, 1.5, 2.5).normalize();
  const newPos = center.clone().add(dir.multiplyScalar(distance));

  if (gsap) {
    gsap.to(cameraRef.position, {
      duration: 0.8,
      x: newPos.x, y: newPos.y, z: newPos.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });
    gsap.to(controlsRef.target, {
      duration: 0.8,
      x: center.x, y: center.y, z: center.z,
      ease: 'power2.out',
    });
  } else {
    cameraRef.position.copy(newPos);
    controlsRef.target.copy(center);
    controlsRef.update();
  }

  showInfoPanel(labelText);
}

export function exitFocusMode() {
  if (!rootRef || !cameraRef || !controlsRef) {
    hideInfoPanel();
    return;
  }

  if (!focusedPart) {
    hideInfoPanel();
    return;
  }

  rootRef.traverse(o => {
    if (o.isMesh && savedVisibility.has(o)) {
      o.visible = savedVisibility.get(o);
    }
  });

  focusedPart = null;
  focusMode   = false;
  hideInfoPanel();

  labelItems.forEach(item => {
    if (item.el) item.el.style.display = 'block';
  });

  if (gsap) {
    gsap.to(cameraRef.position, {
      duration: 0.8,
      x: savedCamPos.x, y: savedCamPos.y, z: savedCamPos.z,
      ease: 'power2.out',
      onUpdate: () => controlsRef.update(),
    });
    gsap.to(controlsRef.target, {
      duration: 0.8,
      x: savedCamTarget.x, y: savedCamTarget.y, z: savedCamTarget.z,
      ease: 'power2.out',
    });
  } else {
    cameraRef.position.copy(savedCamPos);
    controlsRef.target.copy(savedCamTarget);
    controlsRef.update();
  }
}

function createTooltip(el, text) {
}

function startLabelsLoop() {
  if (labelRAF) return;

  const update = () => {
    labelRAF = requestAnimationFrame(update);
    if (!cameraRef || !containerRef) return;

    const w = containerRef.clientWidth || 1;
    const h = containerRef.clientHeight || 1;

    if (focusMode || !isExploded()) {
      labelItems.forEach(({ el }) => { el.style.opacity = '0'; });
      return;
    }

    const screenLabels = [];

    labelItems.forEach(({ mesh, el, anchorLocal }) => {
      if (!mesh.visible) {
        el.style.opacity = '0';
        return;
      }

      const worldCenter = mesh.localToWorld(anchorLocal.clone());

      const ndcPos = worldCenter.clone();
      ndcPos.project(cameraRef);

      if (ndcPos.z > 1 || ndcPos.z < -1) {
        el.style.opacity = '0';
        return;
      }

      const x = (ndcPos.x * 0.5 + 0.5) * w;
      const y = (-ndcPos.y * 0.5 + 0.5) * h;

      const width  = el.offsetWidth  || 80;
      const height = el.offsetHeight || 24;

      const dist = cameraRef.position.distanceTo(worldCenter);

      screenLabels.push({ el, x, y, width, height, dist });
    });

    screenLabels.sort((a, b) => a.dist - b.dist);

    const placed = [];
    const paddingX = 4;
    const paddingY = 4;

    screenLabels.forEach(label => {
      const halfW = label.width / 2;
      const halfH = label.height / 2;

      let left   = label.x - halfW;
      let right  = label.x + halfW;
      let top    = label.y - halfH;
      let bottom = label.y + halfH;

      left   -= paddingX;
      right  += paddingX;
      top    -= paddingY;
      bottom += paddingY;

      let overlaps = false;
      for (const p of placed) {
        if (
          left   < p.right  &&
          right  > p.left   &&
          top    < p.bottom &&
          bottom > p.top
        ) {
          overlaps = true;
          break;
        }
      }

      if (overlaps) {
        label.el.style.opacity = '0';
        return;
      }

      placed.push({ left, right, top, bottom });

      label.el.style.left = `${label.x}px`;
      label.el.style.top  = `${label.y}px`;
      label.el.style.opacity = '1';
    });
  };

  labelRAF = requestAnimationFrame(update);
}

function setupLabels(root) {
  const layer = ensureLayer();
  if (!layer || !cameraRef) return;

  labelItems.forEach(i => i.el?.remove?.());
  labelItems.length = 0;

  root.traverse(mesh => {
    if (!mesh.isMesh) return;

    const box  = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (Math.max(size.x, size.y, size.z) < 0.10) return;

    const nice = getNiceName(mesh);
    if (!nice) return;

    const centerWorld = box.getCenter(new THREE.Vector3());
    const anchorLocal = mesh.worldToLocal(centerWorld.clone());

    const el = document.createElement('div');
    el.className = 'engine-label';

    Object.assign(el.style, {
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      opacity: 0,
      pointerEvents: 'auto',
      cursor: 'pointer',
    });
    el.textContent = nice;

    createTooltip(el, nice);

    const baseMat = mesh.material;

    el.addEventListener('click', e => {
      e.stopPropagation();

      const highlight = baseMat.clone();
      highlight.emissive = new THREE.Color(0xff5500);
      highlight.emissiveIntensity = 1.0;
      mesh.material = highlight;
      setTimeout(() => { mesh.material = baseMat; }, 800);

      focusOnPart(mesh, nice);
    });

    layer.appendChild(el);
    labelItems.push({ mesh, el, baseMat, anchorLocal });
  });

  startLabelsLoop();
}

function setupPicking() {
  if (!rendererRef || !cameraRef || !rootRef) return;
  const dom = rendererRef.domElement;

  if (pickHandler) {
    dom.removeEventListener('click', pickHandler);
  }

  pickHandler = event => {
    if (!isExploded() || focusMode) return;

    const rect = dom.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, cameraRef);

    const meshes = [];
    rootRef.traverse(o => o.isMesh && meshes.push(o));

    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;

    let hit = hits[0].object;

    let targetMesh = hit;
    let labelItem  = labelItems.find(li => li.mesh === targetMesh);
    while (!labelItem && targetMesh.parent) {
      targetMesh = targetMesh.parent;
      labelItem  = labelItems.find(li => li.mesh === targetMesh);
    }
    if (!labelItem) return;

    const partName = labelItem.el.textContent || getNiceName(targetMesh);

    focusOnPart(targetMesh, partName);
  };

  dom.addEventListener('click', pickHandler);
}

export function setupEngineUI(root, extra = {}) {
  cameraRef    = extra.camera    || null;
  controlsRef  = extra.controls  || null;
  containerRef = extra.container || null;
  rendererRef  = extra.renderer  || null;
  rootRef      = root;

  setupLabels(root);
  setupPicking();

  return function disposeEngineUI() {
    if (labelRAF) {
      cancelAnimationFrame(labelRAF);
      labelRAF = null;
    }

    labelItems.forEach(i => i.el?.remove?.());
    labelItems.length = 0;

    if (rendererRef && pickHandler) {
      rendererRef.domElement.removeEventListener('click', pickHandler);
    }
    pickHandler = null;

    if (infoCloseBtn && infoCloseHandler) {
      infoCloseBtn.removeEventListener('click', infoCloseHandler);
    }

    cameraRef = controlsRef = containerRef = rendererRef = rootRef = null;
    labelLayer = null;
    focusMode = false;
    focusedPart = null;
    infoPanel = infoTitleEl = infoTextEl = infoCloseBtn = null;
  };
}
