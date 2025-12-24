import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const DEFAULT_CAMERA_DIR = new THREE.Vector3(5, 0.1, 7).normalize();

function disposeObject3D(obj) {
  if (!obj) return;

  obj.traverse(child => {
    if (!child.isMesh) return;

    child.geometry?.dispose?.();

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach(m => {
      if (!m) return;

      [
        'map',
        'normalMap',
        'metalnessMap',
        'roughnessMap',
        'aoMap',
        'emissiveMap',
        'alphaMap',
      ].forEach(key => m[key]?.dispose?.());

      m.dispose?.();
    });
  });
}

function getFitPose(obj, camera, preset = {}) {
  const box    = new THREE.Box3().setFromObject(obj);
  const size   = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fovRad = (camera.fov * Math.PI) / 180;

  let distance = (maxDim / 2) / Math.tan(fovRad / 2);

  const baseMul = preset.distanceMul ?? 1.35;

  const w = window.innerWidth || 0;
  let screenMul = 1.0;

  if (w >= 2560) screenMul = 1.7;
  else if (w >= 1920) screenMul = 1.4;
  else if (w >= 1366) screenMul = 1.15;

  distance *= baseMul * screenMul;

  const dirVec = (preset.dir || DEFAULT_CAMERA_DIR).clone();
  const camPos = center.clone().add(dirVec.multiplyScalar(distance));
  if (preset.offset) camPos.add(preset.offset);

  const target = center.clone();
  if (preset.targetOffset) target.add(preset.targetOffset);

  return { camPos, target };
}

export function createViewer(containerEl, opts = {}) {
  if (!containerEl) {
    throw new Error('[viewer] createViewer: containerEl je null/undefined');
  }

  const {
    disableWheelZoom = true,
    disablePinchZoom = false,
    zoomToCursor = false,
  } = opts;

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  containerEl.appendChild(renderer.domElement);

  Object.assign(renderer.domElement.style, {
    visibility: 'hidden',
    opacity: '0',
    transition: 'opacity .35s ease',
  });

  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1e9);
  camera.position.set(2.8, 2.2, 3.8);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.5);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 8, 5);
  dir.castShadow = true;
  scene.add(dir);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1, 0);
  controls.zoomToCursor = zoomToCursor;

  if (disableWheelZoom) {
    controls.enableZoom = false;
    controls.zoomSpeed = 0;
    controls.zoomToCursor = false;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  if (disablePinchZoom) {
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.PAN };
    renderer.domElement.style.touchAction = 'pan-x pan-y';
  }

  const loadingManager = new THREE.LoadingManager();
  let resolveReady;
  const readyOnce = new Promise(res => (resolveReady = res));

  loadingManager.onLoad = () => resolveReady?.();
  loadingManager.onError = () => resolveReady?.();

  const pmremGen = new THREE.PMREMGenerator(renderer);
  pmremGen.compileEquirectangularShader();

  const rgbe = new RGBELoader(loadingManager).setDataType(THREE.FloatType);
  const hdriList = [
    'hdr/venice_sunset_1k.hdr',
    'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/venice_sunset_1k.hdr',
  ];

  (function loadEnv(i = 0) {
    if (i >= hdriList.length) {
      pmremGen.dispose();
      return;
    }

    rgbe.load(
      hdriList[i],
      hdr => {
        const envMap = pmremGen.fromEquirectangular(hdr).texture;
        scene.environment = envMap;
        hdr.dispose();
        pmremGen.dispose();
      },
      undefined,
      () => loadEnv(i + 1),
    );
  })();

  const loader = new GLTFLoader(loadingManager);
  const draco  = new DRACOLoader(loadingManager);
  draco.setDecoderPath(
    'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/',
  );
  loader.setDRACOLoader(draco);

  const root = new THREE.Group();
  scene.add(root);

  let current = null;
  let currentDispose = null;

  function resize() {
    const w = containerEl.clientWidth || 1;
    const h = containerEl.clientHeight || 1;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    let dpr = window.devicePixelRatio || 1;
    if (w < 600) dpr = Math.min(dpr, 1.4);
    else if (w < 900) dpr = Math.min(dpr, 1.8);
    else dpr = Math.min(dpr, 2);

    renderer.setPixelRatio(dpr);
  }

  async function loadModelModule(mod) {
    if (!mod) {
      console.warn('[viewer] loadModelModule: modul je null/undefined');
      return;
    }

    if (typeof currentDispose === 'function') {
      try {
        await currentDispose();
      } catch (err) {
        console.warn('[viewer] cleanup error:', err);
      }
      currentDispose = null;
    }

    if (current) {
      root.remove(current);
      disposeObject3D(current);
      current = null;
    }

    if (!mod.url) {
      console.warn('[viewer] model modul nema "url"');
      return;
    }

    const gltf = await loader.loadAsync(mod.url);
    current = gltf.scene || gltf.scenes?.[0];
    if (!current) {
      console.error('[viewer] GLTF nema scene.');
      return;
    }

    root.add(current);

    const box    = new THREE.Box3().setFromObject(current);
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const minY  = box.min.y;
    const scale = 1.0 / Math.max(size.x, size.y, size.z);

    current.scale.setScalar(scale);
    current.position.set(-center.x, -minY, -center.z);
    root.updateMatrixWorld(true);

    if (typeof mod.afterLoad === 'function') {
      const extra = {
        camera,
        controls,
        renderer,
        container: containerEl,
      };

      const maybeDispose = await mod.afterLoad(current, THREE, extra);
      if (typeof maybeDispose === 'function') {
        currentDispose = maybeDispose;
      }
    }

    const pose = getFitPose(current, camera, mod.viewPreset || {});
    camera.position.copy(pose.camPos);
    controls.target.copy(pose.target);
    controls.update();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
  resize();
  window.addEventListener('resize', resize);

  return {
    scene,
    camera,
    renderer,
    controls,
    loadModelModule,
    readyOnce,
  };
}
