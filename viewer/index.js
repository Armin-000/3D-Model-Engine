import { createViewer } from './core.js';

const gsap = window.gsap || null;

const viewerWrap = document.getElementById('viewer');
const container  = document.getElementById('three');
const loadingEl  = document.getElementById('loadingOverlay');

const zoomInBtn  = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const explodeBtn = document.getElementById('explodeBtn');

if (!container) {
  console.error('[viewer] #three container nije pronađen.');
}

function setLoading(isLoading) {
  if (!loadingEl) return;
  loadingEl.classList.toggle('hidden', !isLoading);
  if (viewerWrap) {
    viewerWrap.setAttribute('data-loading', isLoading ? '1' : '0');
  }
}

setLoading(true);

const viewer = createViewer(container, {
  disableWheelZoom: false,
  disablePinchZoom: false,
  zoomToCursor: true,
});

const canvasEl = viewer.renderer.domElement;
Object.assign(canvasEl.style, {
  visibility: 'hidden',
  opacity: '0',
  transition: 'opacity .35s ease',
});

const MODEL_REGISTRY = {
  engine: () => import('./models/engine/index.js'),
};

let explodeHandler = null;
let exploded = false;

async function loadEngine() {
  const loadFn = MODEL_REGISTRY.engine;

  if (!loadFn) {
    console.error('[viewer] Nema loadera za "engine" model.');
    if (explodeBtn) explodeBtn.style.display = 'none';
    return;
  }

  try {
    setLoading(true);

    canvasEl.style.visibility = 'hidden';
    canvasEl.style.opacity = '0';

    const mod = await loadFn();
    await viewer.loadModelModule(mod);
    if (viewer.readyOnce) await viewer.readyOnce;

    if (explodeBtn) {
      if (explodeHandler) {
        explodeBtn.removeEventListener('click', explodeHandler);
        explodeHandler = null;
      }

      explodeBtn.style.display = 'block';
      exploded = false;
      explodeBtn.textContent = 'Explode Engine';

      const api = {
        toggle:  mod.toggleExplode || null,
        explode: mod.explodeMotor || mod.explode || null,
        implode: mod.implodeMotor || mod.implode || null,
      };

      explodeHandler = () => {
        if (api.toggle) {
          const state = api.toggle();
          exploded = !!state;
        } else {
          if (!exploded && api.explode) api.explode();
          else if (exploded && api.implode) api.implode?.();
          else if (api.explode) api.explode();
          exploded = !exploded;
        }

        explodeBtn.textContent = exploded
          ? 'Assemble Engine'
          : 'Explode Engine';
      };

      explodeBtn.addEventListener('click', explodeHandler);
    }

    await new Promise(r => requestAnimationFrame(r));
    canvasEl.style.visibility = 'visible';
    canvasEl.style.opacity = '1';
  } catch (err) {
    console.error('[viewer] Greška pri učitavanju engine modela:', err);
  } finally {
    setLoading(false);
  }
}

await new Promise(r => requestAnimationFrame(r));
loadEngine();

const MIN_DIST = 0.8;
const MAX_DIST = 12;

function currentDistance() {
  return viewer.camera.position.distanceTo(viewer.controls.target);
}

function smoothZoom(sign = 1, step = 0.8, dur = 0.6) {
  const dir = viewer.controls.target
    .clone()
    .sub(viewer.camera.position)
    .normalize();

  const newPos = viewer.camera.position.clone().addScaledVector(dir, sign * step);
  const newDist = newPos.distanceTo(viewer.controls.target);
  if (newDist < MIN_DIST) return;

  if (gsap) {
    gsap.to(viewer.camera.position, {
      duration: dur,
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      ease: 'power2.out',
      onUpdate: () => viewer.controls.update(),
    });
  } else {
    viewer.camera.position.copy(newPos);
    viewer.controls.update();
  }
}

function clampedSmoothZoom(sign = 1, step = 0.8, dur = 0.6) {
  const dist = currentDistance();
  if ((sign < 0 && dist <= MIN_DIST) || (sign > 0 && dist >= MAX_DIST)) return;
  smoothZoom(sign, step, dur);
}

function pulse(el) {
  if (!gsap || !el) return;
  gsap.fromTo(el, { scale: 1 }, {
    scale: 1.18,
    duration: 0.18,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out'
  });
}

if (zoomInBtn && zoomOutBtn) {
  zoomInBtn.addEventListener('click', () => {
    clampedSmoothZoom(-1);
    pulse(zoomInBtn);
  });

  zoomOutBtn.addEventListener('click', () => {
    clampedSmoothZoom(+1);
    pulse(zoomOutBtn);
  });
}
