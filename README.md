# Engine 3D Viewer

Engine 3D Viewer is an interactive WebGL application for exploring a 3D engine model.  
It provides realistic camera control, animated component separation (explode mode),  
label overlays, part inspection, and information display.

The project is modular and structured for maintainability, scalability, and potential
migration to React + TypeScript.

---

## Project Structure

```text
ENGINE_VIEWER/
├─ css/                           # Global UI and viewer styling
│  └─ 3dmodel.css                 # Layout, controls, labels, info panel design
├─ glb/                           # 3D assets (GLTF / GLB models)
│  └─ motor_animacija.glb         # Main engine model
├─ hdr/                           # Environment HDR lighting files
│  └─ venice_sunset_1k.hdr        # Primary HDRI used for reflections and lighting
├─ viewer/
│  ├─ core.js                     # Core viewer engine (Three.js, renderer, camera, loading, cleanup)
│  ├─ index.js                    # Viewer runtime, UI wiring, loading logic, zoom + explode handlers
│  └─ models/                     # Model-specific feature modules
│     └─ engine/                  # Engine model implementation
│        ├─ index.js              # Model entry point (binds explode + UI systems, lifecycle control)
│        ├─ explode.js            # Explode / assemble animation logic and state
│        ├─ ui.js                 # Labels, picking, focus mode, info panel, UI cleanup
│        └─ naming.js             # Human-readable name mapping and component descriptions
└─ index-main.html                # Application entry page, imports viewer and initializes UI



---

## File Overview

### index-main.html

Application entry point. Responsible for:

• loading Three.js modules via import-map  
• loading GSAP runtime  
• creating viewer container and UI placeholders  
• mounting the viewer script (`viewer/index.js`)

The HTML file contains no model logic — only structural UI layout.

---

## Core Viewer Engine

### viewer/core.js

This module implements the generic 3D viewer engine. It is model-agnostic.

Responsibilities:

• initialize Three.js scene and renderer  
• configure camera and OrbitControls  
• apply HDRI environment lighting  
• load GLTF / DRACO-compressed models  
• normalize model scale and position  
• compute automatic camera framing  
• manage resource cleanup and disposal  
• expose a programmatic viewer API

Exports:

```js
{
  scene,
  camera,
  renderer,
  controls,
  loadModelModule,
  readyOnce
}
