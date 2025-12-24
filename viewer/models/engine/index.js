import * as THREE from 'three';
import {
  prepareExplode,
  resetExplodeState,
  explodeMotor,
  implodeMotor,
  toggleExplode
} from './explode.js';

import { setupEngineUI } from './ui.js';

export const id   = 'engine';
export const name = 'Engine';
export const url  = new URL('../../../glb/motor_animacija.glb', import.meta.url).href;

export const viewPreset = {
  dir: new THREE.Vector3(-9.6, 3.25, 7.8).normalize(),
  distanceMul: 1.45,
  offset: new THREE.Vector3(0.0, 0.05, 0.0),
  targetOffset: new THREE.Vector3(0.0, 0.10, 0.0),
};

export { explodeMotor, implodeMotor, toggleExplode };

export async function afterLoad(root, THREE_NS, extra = {}) {
  prepareExplode(root);

  const disposeUI = setupEngineUI(root, extra);

  resetExplodeState();

  const nameElement = document.getElementById('model-name');
  if (nameElement) nameElement.textContent = name;

  console.group('[ENGINE PARTS]');
  root.traverse(o => o.isMesh && console.log(o.name));
  console.groupEnd();

  return function disposeEngineModule() {
    resetExplodeState();
    disposeUI();
  };
}
