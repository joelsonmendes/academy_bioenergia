import {
  Color, DirectionalLight, GridHelper, HemisphereLight, Line, Mesh,
  OrthographicCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer
} from 'three';
import type {Object3D} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';

function createRenderer() {
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2', {antialias: true, powerPreference: 'low-power'});
    if (context) {
      const renderer = new WebGLRenderer({canvas, context});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      return renderer;
    }
  } catch {
    // Use the same 3D scene on devices without hardware acceleration.
  }

  const renderer = new SVGRenderer();
  renderer.setPrecision(1);
  renderer.overdraw = .25;
  return renderer;
}

interface LabPose {
  position: [number, number, number];
  target: [number, number, number];
  halfWidth: number;
  halfHeight: number;
}

export function createLabViewer<Part extends string, Model extends {pickable: Object3D[]}>(
  host: HTMLDivElement, buildModel: (scene: Scene, lightweight: boolean) => Model,
  pose: () => LabPose, floor: number, onPart: (id: Part) => void, onLost: () => void
) {
  const renderer = createRenderer();
  const lightweight = renderer instanceof SVGRenderer;
  const surface = renderer.domElement;
  host.append(surface);
  const scene = new Scene();
  scene.background = new Color(0x081421);
  scene.add(new HemisphereLight(0xe1f3ff, 0x516988, 2));
  const key = new DirectionalLight(0xd7efff, 2.3);
  key.position.set(2, 6, 5);
  scene.add(key);
  const fill = new DirectionalLight(0x7fc9ff, 1.35);
  fill.position.set(-2, 1, -4);
  scene.add(fill);

  const grid = new GridHelper(28, lightweight ? 28 : 56, 0x346079, 0x183047);
  if (lightweight) {
    grid.material.vertexColors = false;
    grid.material.color.setHex(0x274056);
  }
  grid.position.y = floor;
  scene.add(grid);

  const model = buildModel(scene, lightweight);
  const camera = new OrthographicCamera(-5, 5, 3, -3, .1, 80);
  const controls = new OrbitControls(camera, surface);
  controls.enablePan = false;
  controls.minZoom = .85;
  controls.maxZoom = 3;
  controls.maxPolarAngle = Math.PI * .57;

  let animation: ((seconds: number) => void) | null = null;
  let frame = 0;
  let previousTime = 0;
  let disposed = false;

  function draw(time: number) {
    frame = 0;
    if (!lightweight && renderer.getContext().isContextLost()) return;
    if (animation) {
      requestDraw();
      if (lightweight && previousTime && time - previousTime < 42) return;
      animation(previousTime ? Math.min(.05, (time - previousTime) / 1000) : 0);
      previousTime = time;
    }
    renderer.render(scene, camera);
  }

  function requestDraw() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const {clientWidth: width, clientHeight: height} = host;
    if (!width || !height) return;
    const aspect = width / height;
    const bounds = pose();
    const halfHeight = Math.max(bounds.halfHeight, bounds.halfWidth / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestDraw();
  }

  function reset() {
    const bounds = pose();
    camera.position.set(...bounds.position);
    camera.zoom = 1;
    controls.target.set(...bounds.target);
    controls.update();
    resize();
  }

  const raycaster = new Raycaster();
  let pointer: {id: number; x: number; y: number} | null = null;
  function pointerDown(event: PointerEvent) {
    pointer = event.isPrimary && event.button === 0
      ? {id: event.pointerId, x: event.clientX, y: event.clientY}
      : null;
  }
  function pointerUp(event: PointerEvent) {
    const start = pointer;
    pointer = null;
    if (!start || start.id !== event.pointerId || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 6) return;
    const rect = host.getBoundingClientRect();
    raycaster.setFromCamera(new Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2
    ), camera);
    const hit = raycaster.intersectObjects(model.pickable, false).find(({object}) => {
      for (let current: Object3D | null = object; current; current = current.parent) {
        if (!current.visible) return false;
      }
      return true;
    });
    if (hit) onPart(hit.object.userData.part as Part);
  }
  function pointerCancel() {
    pointer = null;
  }
  function contextLost(event: Event) {
    event.preventDefault();
    onLost();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener('change', requestDraw);
  // The host receives pointer events from both the canvas and the SVG.
  host.addEventListener('pointerdown', pointerDown);
  host.addEventListener('pointerup', pointerUp);
  host.addEventListener('pointercancel', pointerCancel);
  surface.addEventListener('webglcontextlost', contextLost);
  reset();

  return {
    lightweight,
    model,
    requestDraw,
    animate(callback: ((seconds: number) => void) | null) {
      animation = callback;
      previousTime = 0;
      requestDraw();
    },
    zoom(factor: number) {
      camera.zoom = Math.min(controls.maxZoom, Math.max(controls.minZoom, camera.zoom * factor));
      camera.updateProjectionMatrix();
      requestDraw();
    },
    rotate(horizontal: number, vertical: number) {
      const offset = camera.position.clone().sub(controls.target);
      const radius = offset.length();
      const azimuth = Math.atan2(offset.x, offset.z) + horizontal;
      const polar = Math.min(controls.maxPolarAngle, Math.max(.08, Math.acos(offset.y / radius) + vertical));
      camera.position.copy(controls.target).add(new Vector3().setFromSphericalCoords(radius, polar, azimuth));
      controls.update();
    },
    reset,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      host.removeEventListener('pointerdown', pointerDown);
      host.removeEventListener('pointerup', pointerUp);
      host.removeEventListener('pointercancel', pointerCancel);
      surface.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => {
        if (!(object instanceof Mesh || object instanceof Line)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      if (!lightweight) renderer.dispose();
      surface.remove();
    }
  };
}
