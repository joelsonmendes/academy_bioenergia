import {
  AmbientLight, BoxGeometry, BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, DoubleSide,
  Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial,
  MeshPhongMaterial, RingGeometry, SphereGeometry, TorusGeometry, Vector3
} from 'three';
import type {Object3D, Scene} from 'three';
import {createLabViewer} from './lab-viewer';

export const hydroParts = ['penstock', 'spiral', 'gates', 'runner', 'shaft', 'rotor', 'stator', 'draft', 'powerhouse'] as const;
export type HydroPart = typeof hydroParts[number];
export type HydroView = 'plant' | 'machine' | 'exploded';
type Point = [number, number, number];

interface HydroViewState {
  view: HydroView;
  selected: HydroPart;
  flowVisible: boolean;
  playing: boolean;
  hasFlow: boolean;
  hasShaftPower: boolean;
  flow: number;
}

const tau = 2 * Math.PI;
const machineY = -.56;
const outletY = -1.23;
const explodedOffset: Record<HydroPart, Point> = {
  penstock: [-.53, .10, 0], spiral: [0, .16, 0], gates: [0, .80, 0],
  runner: [0, -.42, 0], shaft: [0, .46, 0], rotor: [0, 1.64, 0],
  stator: [0, .70, 0], draft: [0, -.79, 0], powerhouse: [0, 0, 0]
};

function path(points: Point[]) {
  return new CatmullRomCurve3(points.map(point => new Vector3(...point)));
}

const inlet = path([
  [-4.40, 2.0, -1.02], [-3.65, 1.36, -1.17], [-2.70, .16, -1.43],
  [-1.52, -.45, -1.56], [0, machineY, -1.60]
]);
const outlet = path([
  [0, outletY, 0], [0, -1.70, 0], [.60, -2.25, .04],
  [1.76, -2.37, .18], [3.30, -2.33, .30], [4.21, -2.28, .34]
]);
const water = path([
  [-4.40, 2.0, -1.02], [-3.65, 1.36, -1.17], [-2.70, .16, -1.43],
  [-1.52, -.45, -1.56], [0, machineY, -1.60], [1.04, machineY, -1.15],
  [1.43, machineY, -.23], [1.10, machineY, .70], [.46, -.64, .83],
  [.13, -.83, .52], [0, outletY, 0], [0, -1.70, 0],
  [.60, -2.25, .04], [1.76, -2.37, .18], [3.30, -2.33, .30], [4.21, -2.28, .34]
]);

function surface(rows: number, columns: number, vertex: (u: number, v: number) => Point) {
  const positions: number[] = [];
  const faces: number[] = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= columns; j++) {
      positions.push(...vertex(i / rows, j / columns));
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j;
        const b = a + columns + 1;
        faces.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function buildHydro(scene: Scene, lightweight: boolean) {
  const detail = lightweight ? 24 : 48;
  scene.add(new AmbientLight(0x7193ae, .48));
  const parts = new Map<HydroPart, {group: Group; materials: MeshPhongMaterial[]}>();
  const pickable: Object3D[] = [];
  for (const id of hydroParts) {
    const group = new Group();
    scene.add(group);
    parts.set(id, {group, materials: []});
  }

  function body(id: HydroPart, geometry: BufferGeometry, color: number, position: Point = [0, 0, 0], parent?: Group, double = false) {
    const material = new MeshPhongMaterial({color, shininess: 64, side: double ? DoubleSide : undefined});
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.userData.part = id;
    const entry = parts.get(id)!;
    entry.materials.push(material);
    pickable.push(mesh);
    (parent ?? entry.group).add(mesh);
    return mesh;
  }

  function box(id: HydroPart, size: Point, color: number, position: Point, parent?: Group) {
    return body(id, new BoxGeometry(...size), color, position, parent);
  }

  function drum(id: HydroPart, top: number, bottom: number, height: number, y: number, color: number, parent?: Group) {
    return body(id, new CylinderGeometry(top, bottom, height, detail), color, [0, y, 0], parent);
  }

  // Leave a front sector open so the stator and distributor can be inspected.
  function cutRing(id: HydroPart, inner: number, outer: number, height: number, y: number, color: number) {
    const start = 1.94;
    const end = tau + .11;
    const sweep = end - start;
    for (const radius of [inner, outer]) {
      const wall = new CylinderGeometry(radius, radius, height, detail, 1, true, Math.PI / 2 - end, sweep);
      body(id, wall, color, [0, y, 0], undefined, true);
    }
    for (const level of [y - height / 2, y + height / 2]) {
      const ring = new RingGeometry(inner, outer, detail, 1, -end, sweep);
      body(id, ring, color, [0, level, 0], undefined, true).rotation.x = -Math.PI / 2;
    }
    for (const angle of [start, end]) {
      const mid = (inner + outer) / 2;
      box(id, [outer - inner, height, .037], color, [mid * Math.cos(angle), y, mid * Math.sin(angle)]).rotation.y = -angle;
    }
  }

  function duct(id: 'penstock' | 'draft', curve: CatmullRomCurve3, small: number, large: number, color: number) {
    const count = lightweight ? 15 : 30;
    const sections = Array.from({length: count + 1}, (_, i) => {
      const t = i / count;
      const tangent = curve.getTangentAt(t);
      const horizontal = new Vector3(0, 0, 1).cross(tangent).normalize();
      return {
        center: curve.getPointAt(t), horizontal, front: tangent.clone().cross(horizontal),
        radius: small + (large - small) * t
      };
    });
    const geometry = surface(count, lightweight ? 9 : 16, (u, v) => {
      const {center, horizontal, front, radius} = sections[Math.round(u * count)];
      const angle = 2.60 + (tau - 2.05) * v;
      const point = center.clone().addScaledVector(horizontal, radius * Math.cos(angle))
        .addScaledVector(front, radius * Math.sin(angle));
      return point.toArray();
    });
    body(id, geometry, color, undefined, undefined, true);
    for (const t of [0, .48, 1]) {
      const {center, horizontal, front, radius} = sections[Math.round(t * count)];
      const arc = new TorusGeometry(radius + .014, .035, 5, detail, tau - 2.05);
      arc.rotateZ(2.60);
      const rim = body(id, arc, 0x79a0b5, center.toArray(), undefined, true);
      const matrix = rim.matrix.makeBasis(horizontal, front, horizontal.clone().cross(front));
      rim.quaternion.setFromRotationMatrix(matrix);
    }
  }

  duct('penstock', inlet, .57, .56, 0x517a97);
  duct('draft', outlet, .49, .69, 0x417794);

  // A diminishing scroll section around the distributor, with a viewing cut.
  const spiralRows = lightweight ? 24 : 45;
  const scroll = surface(spiralRows, lightweight ? 9 : 15, (u, v) => {
    const angle = 1.94 + (tau + .11 - 1.94) * u;
    const progress = ((angle + Math.PI / 2) % tau) / tau;
    const cross = tau * v;
    const radius = 1.34 + (.50 - .30 * progress) * Math.cos(cross);
    return [radius * Math.cos(angle), machineY + (.36 - .19 * progress) * Math.sin(cross), radius * Math.sin(angle)];
  });
  body('spiral', scroll, 0x245a78, undefined, undefined, true);
  cutRing('spiral', 1.40, 1.53, .10, machineY + .29, 0x6e97af);

  cutRing('gates', .82, 1.27, .075, machineY + .21, 0x8b9caf);
  cutRing('gates', .80, 1.26, .075, machineY - .19, 0x527791);
  for (let i = 0; i < 18; i++) {
    const a = i * tau / 18;
    const blade = box('gates', [.30, .30, .064], 0x9cb4c2,
      [1.04 * Math.cos(a), machineY, 1.04 * Math.sin(a)]);
    blade.rotation.y = -a - .56;
    const pin = body('gates', new CylinderGeometry(.035, .035, .09, 8), 0xcbb68c,
      [1.13 * Math.cos(a), machineY + .254, 1.13 * Math.sin(a)]);
    pin.rotation.y = -a;
  }

  const runner = parts.get('runner')!.group;
  drum('runner', .43, .21, .23, -.76, 0x54a6ca, runner);
  const band = new TorusGeometry(.54, .059, 8, detail);
  body('runner', band, 0x4c9fc2, [0, -1.13, 0], runner).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const a = tau * i / 12;
    const blade = surface(lightweight ? 4 : 8, 2, (u, v) => {
      const radius = .79 - .43 * u + (v - .5) * .05;
      const theta = a + .72 * u + (v - .5) * .22;
      return [radius * Math.cos(theta), -.66 - .38 * u + (v - .5) * .27, radius * Math.sin(theta)];
    });
    body('runner', blade, i % 2 ? 0x397fac : 0x4c9bc6, undefined, runner, true);
  }

  const shaft = parts.get('shaft')!.group;
  drum('shaft', .15, .15, 2.25, .42, 0xb0c6d3, shaft);
  for (const y of [-.38, .10, .81, 1.45]) drum('shaft', .27, .27, .08, y, 0x7295ad, shaft);
  box('shaft', [.27, .085, .06], 0x68d1eb, [.15, .18, .03], shaft);

  const rotor = parts.get('rotor')!.group;
  drum('rotor', .46, .46, .30, 1.51, 0x6384a2, rotor);
  drum('rotor', 1.08, 1.08, .46, 1.45, 0x254e77, rotor);
  for (const y of [1.21, 1.71]) drum('rotor', 1.13, 1.13, .06, y, 0x4d83ab, rotor);
  for (let i = 0; i < 24; i++) {
    const a = i * tau / 24;
    box('rotor', [.15, .43, .24], i % 2 ? 0xe6b15e : 0xeccc78,
      [1.075 * Math.cos(a), 1.46, 1.075 * Math.sin(a)], rotor).rotation.y = -a;
    if (i % 3 === 0) {
      box('rotor', [.76, .105, .15], 0x5290b3, [.64 * Math.cos(a), 1.78, .64 * Math.sin(a)], rotor).rotation.y = -a;
    }
  }

  cutRing('stator', 1.21, 1.53, .72, 1.46, 0x657c96);
  cutRing('stator', 1.20, 1.57, .085, 1.87, 0x89a4b6);
  cutRing('stator', 1.20, 1.57, .085, 1.05, 0x4a6e89);
  for (let i = 0; i <= 26; i++) {
    const a = 1.96 + (tau + .06 - 1.96) * i / 26;
    box('stator', [.11, .64, .095], i % 2 ? 0xd38451 : 0xe39d64,
      [1.24 * Math.cos(a), 1.46, 1.24 * Math.sin(a)]).rotation.y = -a;
    if (i % 2 === 0) {
      box('stator', [.14, .64, .11], 0x7b99ae, [1.56 * Math.cos(a), 1.46, 1.56 * Math.sin(a)]).rotation.y = -a;
    }
  }

  const civil = 'powerhouse';
  body(civil, new BoxGeometry(5.84, 5.55, .23, 10, 10, 1), 0x374f66, [.32, .29, -2.06]);
  body(civil, new BoxGeometry(6.2, .24, 3.46, 9, 1, 5), 0x526c7f, [.52, -2.90, -.16]);
  for (const x of [-2.49, 3.07]) {
    box(civil, [.23, 5.90, .30], 0x8098a9, [x, .19, -1.84]);
    box(civil, [.25, 4.50, .24], 0x7f9aab, [x, .73, -.31]);
  }
  for (const y of [-1.45, .14, 1.78]) {
    body(civil, new BoxGeometry(1.80, .18, 2.05, 4, 1, 4), 0x70899c, [2.53, y, -.80]);
    box(civil, [1.80, .065, .045], 0xa4b2b7, [2.53, y + .42, .24]);
    for (const x of [1.67, 2.53, 3.39]) box(civil, [.041, .37, .041], 0xa7b4bd, [x, y + .235, .24]);
  }
  box(civil, [5.90, .24, .25], 0x7c95a8, [.3, 3.08, -1.82]);
  for (const x of [-2.45, 3.02]) box(civil, [.14, .14, 2.38], 0x93a5ad, [x, 2.95, -1.05]);
  for (const z of [-1.08, -.64]) box(civil, [5.53, .21, .16], 0xedb03d, [.26, 2.86, z]);
  box(civil, [.57, .25, .65], 0xe39528, [.35, 3.04, -.86]);
  box(civil, [.021, .58, .022], 0xc3ccd1, [.35, 2.47, -.86]);
  body(civil, new TorusGeometry(.093, .024, 7, 16, 5.2), 0xe4ae53, [.35, 2.13, -.86]);
  for (const x of [2.81, 3.18]) {
    box(civil, [.28, .44, .25], 0x4b6e8a, [x, 2.10, -1.39]);
    box(civil, [.12, .10, .04], 0x73c6c4, [x, 2.20, -1.242]);
  }

  const routeMaterial = new LineBasicMaterial({color: 0x45d7ff, linewidth: 2.5, transparent: true, opacity: .8});
  const route = new Line(new BufferGeometry().setFromPoints(water.getPoints(85)), routeMaterial);
  const stream = new Group();
  stream.add(route);
  scene.add(stream);
  for (const t of [.08, .24, .45, .64, .79, .93]) {
    const arrow = new Mesh(new ConeGeometry(.045, .16, 8), new MeshBasicMaterial({color: 0x77e6ff}));
    arrow.position.copy(water.getPointAt(t));
    arrow.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), water.getTangentAt(t));
    stream.add(arrow);
  }
  const particles = Array.from({length: lightweight ? 9 : 16}, () => {
    const droplet = new Mesh(new SphereGeometry(.058, 7, 5), new MeshBasicMaterial({color: 0x8df0ff}));
    stream.add(droplet);
    return droplet;
  });

  return {parts, pickable, rotor, shaft, runner, stream, routeMaterial, particles};
}

export function createHydroViewer(host: HTMLDivElement, onPart: (id: HydroPart) => void, onLost: () => void) {
  let view: HydroView = 'plant';
  const viewer = createLabViewer(host, buildHydro, () => {
    if (view === 'exploded') return {position: [5.3, 3.6, 12], target: [0, .13, 0], halfHeight: 4.22, halfWidth: 4.95};
    if (view === 'machine') return {position: [4.0, 3.0, 10], target: [0, .25, 0], halfHeight: 2.25, halfWidth: 2.7};
    return {position: [5.9, 4.0, 13], target: [0, .04, -.22], halfHeight: 3.72, halfWidth: 4.90};
  }, -3.02, onPart, onLost);
  const model = viewer.model;
  let animate = false;
  let rotorMoving = false;
  let speed = 0;
  let phase = 0;

  function droplets() {
    for (const [i, particle] of model.particles.entries()) {
      particle.position.copy(water.getPointAt((phase + i / model.particles.length) % 1));
    }
  }

  function tick(seconds: number) {
    phase = (phase + seconds * speed) % 1;
    droplets();
    if (rotorMoving) {
      for (const group of [model.rotor, model.shaft, model.runner]) group.rotation.y += seconds * speed * 8;
    }
  }

  return {
    ...viewer,
    setState(state: HydroViewState) {
      const reframe = state.view !== view;
      view = state.view;
      const exploded = view === 'exploded';
      for (const [id, entry] of model.parts) {
        entry.group.visible = id !== 'powerhouse' || view === 'plant';
        entry.group.position.set(...(exploded ? explodedOffset[id] : [0, 0, 0] as Point));
        for (const material of entry.materials) material.emissive.setHex(id === state.selected ? 0x215335 : 0);
      }
      model.stream.visible = state.flowVisible && !exploded;
      model.routeMaterial.color.setHex(state.hasFlow ? 0x45d7ff : 0x416c85);
      for (const particle of model.particles) particle.visible = state.hasFlow;
      rotorMoving = state.hasShaftPower;
      speed = state.hasFlow ? .10 + .18 * Math.min(1, Math.sqrt(state.flow / 2)) : 0;
      droplets();
      const shouldAnimate = state.playing && !exploded && state.hasFlow;
      if (shouldAnimate !== animate) {
        animate = shouldAnimate;
        viewer.animate(animate ? tick : null);
      }
      if (reframe) viewer.reset();
      viewer.requestDraw();
    }
  };
}
