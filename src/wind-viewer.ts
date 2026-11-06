import {
  AmbientLight, BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshPhongMaterial,
  RingGeometry, Shape, SphereGeometry, TorusGeometry, Vector3
} from 'three';
import type {Object3D, Scene} from 'three';
import {createLabViewer} from './lab-viewer';
import {surface} from './lab-mesh';

export const windParts = [
  'blades', 'pitch', 'shaft', 'gearbox', 'brake', 'generator', 'converter', 'yaw', 'sensors', 'tower', 'nacelle'
] as const;
export type WindPart = typeof windParts[number];
export type WindView = 'overview' | 'cutaway' | 'exploded';
type Point = [number, number, number];

interface WindViewState {
  view: WindView;
  selected: WindPart;
  speed: number;
  generating: boolean;
  feathered: boolean;
  showWind: boolean;
  playing: boolean;
  yawDemo: boolean;
}

const tau = 2 * Math.PI;
const axisY = 1.18;
const hubX = -2.74;
const yawX = -.49;
const towerBase = -4.17;
const explodedX: Partial<Record<WindPart, number>> = {
  blades: -1.96, pitch: -1.15, shaft: -.56, gearbox: .15,
  brake: .51, generator: 1.04, converter: 1.80
};
const explodedHidden = new Set<WindPart>(['yaw', 'sensors', 'tower', 'nacelle']);

export function windPartVisible(part: WindPart, view: WindView) {
  return view !== 'exploded' || !explodedHidden.has(part);
}

function buildWind(scene: Scene, lightweight: boolean) {
  const detail = lightweight ? 20 : 36;
  scene.add(new AmbientLight(0x7a98b3, .45));
  const parts = new Map<WindPart, {group: Group; materials: MeshPhongMaterial[]}>();
  const pickable: Object3D[] = [];
  const head = new Group();
  const platform = new Group();
  head.position.x = yawX;
  platform.position.x = -yawX;
  scene.add(head);
  head.add(platform);
  for (const id of windParts) {
    const group = new Group();
    (id === 'tower' || id === 'yaw' ? scene : platform).add(group);
    parts.set(id, {group, materials: []});
  }

  function body(id: WindPart, geometry: BufferGeometry, color: number, position: Point = [0, 0, 0], parent?: Group, double = false) {
    const material = new MeshPhongMaterial({color, shininess: 54, side: double ? DoubleSide : undefined});
    const object = new Mesh(geometry, material);
    object.position.set(...position);
    object.userData.part = id;
    const entry = parts.get(id)!;
    entry.materials.push(material);
    pickable.push(object);
    (parent ?? entry.group).add(object);
    return object;
  }

  function box(id: WindPart, size: Point, color: number, position: Point, parent?: Group) {
    return body(id, new BoxGeometry(...size), color, position, parent);
  }

  function groupAt(id: WindPart, position: Point, parent = parts.get(id)!.group) {
    const group = new Group();
    group.position.set(...position);
    parent.add(group);
    return group;
  }

  function drum(id: WindPart, radius: number, length: number, color: number, position: Point, parent?: Group) {
    const object = body(id, new CylinderGeometry(radius, radius, length, detail), color, position, parent);
    object.rotation.z = -Math.PI / 2;
    return object;
  }

  function gear(id: 'gearbox' | 'yaw', radius: number, thickness: number, teeth: number, color: number, position: Point, parent?: Group) {
    const shape = new Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const angle = tau * i / (teeth * 4);
      const r = radius + (i % 4 === 1 || i % 4 === 2 ? .043 : -.036);
      if (i === 0) shape.moveTo(r * Math.cos(angle), r * Math.sin(angle));
      else shape.lineTo(r * Math.cos(angle), r * Math.sin(angle));
    }
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false});
    geometry.translate(0, 0, -thickness / 2);
    const object = body(id, geometry, color, position, parent);
    object.rotation.y = Math.PI / 2;
    return object;
  }

  const rotor = groupAt('blades', [hubX, axisY, 0]);
  const hub = groupAt('pitch', [hubX, axisY, 0]);
  const bladePivots: Group[] = [];
  const bladeSurface = (start: number, end: number) => surface(lightweight ? 10 : 20, lightweight ? 8 : 14, (u, v) => {
    const t = start + (end - start) * u;
    const angle = tau * v;
    const chord = .38 * Math.sin(Math.PI * Math.pow(t, .60)) * (1 - .40 * t) + .23 * (1 - t) + .035;
    const thickness = chord * (.43 - .21 * t);
    const twist = .60 - .48 * t;
    const x = thickness * Math.cos(angle) / 2;
    const z = chord * Math.sin(angle) / 2;
    return [x * Math.cos(twist) + z * Math.sin(twist), .39 + 2.82 * t,
      -x * Math.sin(twist) + z * Math.cos(twist) + .27 * t * t];
  });
  for (let i = 0; i < 3; i++) {
    const angle = i * tau / 3;
    const mount = groupAt('blades', [0, 0, 0], rotor);
    mount.rotation.x = angle;
    const blade = groupAt('blades', [0, 0, 0], mount);
    bladePivots.push(blade);
    body('blades', bladeSurface(0, .88), 0xc3d7e0, undefined, blade, true);
    body('blades', bladeSurface(.88, .94), 0x62bfb2, undefined, blade, true);
    body('blades', bladeSurface(.94, 1), 0x9bc4d2, undefined, blade, true);
    const bearing = groupAt('pitch', [0, 0, 0], hub);
    bearing.rotation.x = angle;
    body('pitch', new CylinderGeometry(.15, .19, .20, 16), 0x6e93ab, [0, .40, 0], bearing);
    body('pitch', new TorusGeometry(.154, .027, 6, 16), 0xc4ac71, [0, .49, 0], bearing).rotation.x = Math.PI / 2;
    box('pitch', [.14, .15, .16], 0xc89755, [.02, .27, .04], bearing);
  }
  body('pitch', new SphereGeometry(.43, detail, 12), 0x97b4c7, [-.16, 0, 0], hub).scale.x = .88;
  drum('pitch', .33, .27, 0x6e8fa7, [.18, 0, 0], hub);

  const shaft = groupAt('shaft', [-1.70, axisY, 0]);
  drum('shaft', .12, 1.57, 0x9ab9ce, [0, 0, 0], shaft);
  drum('shaft', .27, .07, 0x6c91ad, [-.62, 0, 0], shaft);
  drum('shaft', .20, .12, 0x9bb7ca, [.53, 0, 0], shaft);
  box('shaft', [.37, .055, .065], 0x61bace, [.07, .118, .03], shaft);
  drum('shaft', .33, .28, 0x476c85, [-1.91, axisY, 0]);
  drum('shaft', .28, .33, 0x7296ae, [-1.91, axisY, 0]);
  box('shaft', [.43, .34, .72], 0x416582, [-1.91, axisY - .41, 0]);

  const low = groupAt('gearbox', [-.89, axisY, 0]);
  const intermediate = groupAt('gearbox', [-.62, axisY + .23, .682]);
  const high = groupAt('gearbox', [-.32, axisY, 0]);
  gear('gearbox', .48, .14, 24, 0xd8ad69, [0, 0, 0], low);
  gear('gearbox', .24, .14, 12, 0x739cb3, [-.27, 0, 0], intermediate);
  gear('gearbox', .48, .14, 24, 0xd6a15f, [.30, 0, 0], intermediate);
  gear('gearbox', .24, .14, 12, 0x94b4c8, [0, 0, 0], high);
  drum('gearbox', .13, .91, 0x9ab8c7, [0, 0, 0], intermediate);
  drum('gearbox', .16, .21, 0x8eacc0, [-.08, 0, 0], low);
  drum('gearbox', .12, .53, 0xa7bfcc, [.15, 0, 0], high);
  box('gearbox', [1.16, .15, 1.71], 0x427693, [-.60, axisY - .60, .19]);
  box('gearbox', [1.16, 1.19, .12], 0x436c8a, [-.60, axisY, -.54]);
  for (const x of [-1.13, -.05]) box('gearbox', [.12, .61, .53], 0x4c7793, [x, axisY - .28, -.22]);

  const disc = groupAt('brake', [.30, axisY, 0]);
  drum('brake', .086, .91, 0xb5c5cf, [0, 0, 0], disc);
  drum('brake', .30, .07, 0x9aadb8, [0, 0, 0], disc);
  for (let i = 0; i < 8; i++) {
    const a = i * tau / 8;
    body('brake', new CylinderGeometry(.019, .019, .09, 6), 0x415d73,
      [0, .21 * Math.cos(a), .21 * Math.sin(a)], disc).rotation.z = Math.PI / 2;
  }
  box('brake', [.19, .17, .21], 0xd68363, [.30, axisY + .24, .11]);

  const generator = groupAt('generator', [1.22, axisY, 0]);
  drum('generator', .31, 1.14, 0x498cae, [0, 0, 0], generator);
  for (let i = 0; i < 12; i++) {
    const a = i * tau / 12;
    box('generator', [.90, .071, .070], 0x87c6cf, [0, .325 * Math.cos(a), .325 * Math.sin(a)], generator).rotation.x = a;
  }
  const start = .74;
  const sweep = tau - 2.06;
  for (const radius of [.47, .58]) {
    const wall = new CylinderGeometry(radius, radius, 1.17, detail, 1, true, start, sweep);
    body('generator', wall, 0x4d779b, [1.22, axisY, 0], undefined, true).rotation.z = -Math.PI / 2;
  }
  for (const x of [.65, 1.79]) {
    const end = new RingGeometry(.40, .62, detail, 1, start + Math.PI, sweep);
    body('generator', end, 0x7e9fb4, [x, axisY, 0], undefined, true).rotation.y = Math.PI / 2;
  }
  for (let i = 0; i < 17; i++) {
    const a = start + sweep * (i + .5) / 17;
    box('generator', [.98, .056, .081], i % 2 ? 0xba764a : 0xe5a36a,
      [1.22, axisY - .433 * Math.sin(a), .433 * Math.cos(a)]).rotation.x = a + Math.PI / 2;
  }
  box('generator', [1.27, .13, .84], 0x4d708c, [1.22, axisY - .57, 0]);

  box('converter', [.57, 1.01, .75], 0x4c697f, [2.40, axisY - .08, -.18]);
  box('converter', [.46, .84, .049], 0x597f95, [2.40, axisY - .08, .216]);
  const led = box('converter', [.28, .097, .040], 0x61ddae, [2.40, axisY + .177, .252]);
  for (let i = 0; i < 5; i++) box('converter', [.33, .032, .047], 0x233f58, [2.40, axisY - .09 - .066 * i, .25]);
  const cableMaterial = new LineBasicMaterial({color: 0x48cba5, linewidth: 2.5});
  const cable = new Line(new BufferGeometry().setFromPoints([
    [1.75, axisY - .18, .54], [1.92, axisY - .50, .54], [2.39, axisY - .50, .41],
    [2.58, axisY - .45, .35], [2.58, .52, .41], [yawX + .20, .51, .43], [yawX + .13, .13, .24]
  ].map(point => new Vector3(...point))), cableMaterial);
  parts.get('converter')!.group.add(cable);

  const shell = surface(lightweight ? 13 : 25, lightweight ? 13 : 24, (u, v) => {
    const endTaper = 1 - .25 * Math.pow(Math.abs(2 * u - 1), 4);
    const a = .76 + (tau - 2.05) * v;
    return [-2.61 + 5.61 * u, axisY + .016 - .92 * endTaper * Math.sin(a), 1.13 * endTaper * Math.cos(a)];
  });
  body('nacelle', shell, 0x819db4, undefined, undefined, true);
  body('nacelle', new BoxGeometry(5.45, .15, 1.83, 10, 1, 5), 0x67859c, [.13, .38, -.06]);
  box('nacelle', [5.51, .102, .09], 0x8eaec1, [.16, .45, .89]);
  box('nacelle', [5.21, .07, .08], 0x849eb0, [.08, 1.98, .42]);
  for (const x of [-2.18, -.97, .72, 2.80]) box('nacelle', [.058, 1.26, .095], 0x8199ae, [x, 1.13, -.93]);
  for (let i = 0; i < 5; i++) box('nacelle', [.30, .042, .061], 0x496982, [2.74, .90 + i * .13, -.71]);

  body('tower', new CylinderGeometry(.43, .76, 4.44, detail, 1, true, .56, tau - 1.12),
    0x7494ae, [yawX, towerBase + 2.20, 0], undefined, true);
  body('tower', new CylinderGeometry(.83, .86, .13, detail), 0x45677c, [yawX, towerBase, 0]);
  for (const y of [-3.05, -1.33]) {
    body('tower', new RingGeometry(.23, .54, detail, 1, .62, tau - 1.24), 0x6e91a5, [yawX, y, 0])
      .rotation.x = -Math.PI / 2;
  }
  for (const x of [yawX - .14, yawX + .11]) box('tower', [.029, 3.76, .028], 0xa5bdc8, [x, -2.06, -.24]);
  for (let i = 0; i < 17; i++) box('tower', [.26, .025, .038], 0x8daebd, [yawX - .015, -3.83 + i * .22, -.224]);
  for (const x of [yawX + .16, yawX + .21]) box('tower', [.027, 3.7, .031], 0x4789a3, [x, -1.98, .05]);

  body('yaw', new CylinderGeometry(.52, .48, .22, detail), 0x7295ad, [yawX, .21, 0]);
  gear('yaw', .51, .095, 26, 0xc0a37a, [yawX, .29, 0]).rotation.set(-Math.PI / 2, 0, 0);
  box('yaw', [.27, .28, .28], 0x4d7797, [yawX + .51, .41, .23]);

  body('sensors', new CylinderGeometry(.028, .035, .57, 9), 0xa9c2cf, [2.33, 2.20, -.23]);
  const anemometer = groupAt('sensors', [2.33, 2.49, -.23]);
  for (let i = 0; i < 3; i++) {
    const a = i * tau / 3;
    box('sensors', [.17, .023, .023], 0xb7ccd5, [.081 * Math.cos(a), 0, .081 * Math.sin(a)], anemometer).rotation.y = -a;
    body('sensors', new SphereGeometry(.049, 8, 6), 0x7dacc4, [.176 * Math.cos(a), 0, .176 * Math.sin(a)], anemometer);
  }
  body('sensors', new CylinderGeometry(.025, .033, .38, 8), 0x90aebb, [2.79, 2.10, -.34]);
  box('sensors', [.37, .024, .026], 0xa4bfcd, [2.79, 2.31, -.34]);
  box('sensors', [.12, .12, .029], 0x81b6c9, [2.94, 2.34, -.34]);

  const airflow = new Group();
  scene.add(airflow);
  const windMarkers: Mesh[] = [];
  for (const [index, [y, z]] of [[.11, .72], [.63, 1.22], [1.63, .63], [2.39, .97]].entries()) {
    const material = new LineBasicMaterial({color: 0x5cb4cf, linewidth: 1.5, transparent: true, opacity: .48});
    airflow.add(new Line(new BufferGeometry().setFromPoints([
      new Vector3(-5.2, y, z), new Vector3(-3.06, y, z)
    ]), material));
    const arrow = new Mesh(new ConeGeometry(.055, .16, 7), new MeshBasicMaterial({color: 0x70d1e5}));
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(-3.16, y, z);
    airflow.add(arrow);
    const mark = new Mesh(new SphereGeometry(.044, 7, 5), new MeshBasicMaterial({color: 0x98e8f4}));
    mark.position.set(-4.9 + index * .39, y, z);
    airflow.add(mark);
    windMarkers.push(mark);
  }
  return {parts, pickable, head, rotor, hub, bladePivots, shaft, low, intermediate, high, disc, generator,
    led, cable, cableMaterial, anemometer, airflow, windMarkers};
}

export function createWindViewer(host: HTMLDivElement, onPart: (id: WindPart) => void, onLost: () => void) {
  let view: WindView = 'cutaway';
  const viewer = createLabViewer(host, buildWind, () => {
    if (view === 'overview') return {position: [-5.7, 3.0, 14], target: [-.85, .02, 0], halfHeight: 4.72, halfWidth: 5.2};
    if (view === 'exploded') return {position: [-4.5, 3.0, 13], target: [-.07, 1.15, 0], halfHeight: 3.40, halfWidth: 5.85};
    return {position: [-4.5, 3.0, 11], target: [-.10, 1.14, 0], halfHeight: 2.20, halfWidth: 3.64};
  }, towerBase - .08, onPart, onLost);
  const model = viewer.model;
  let spinning = false;
  let running = false;
  let wind = 0;
  let phase = 0;

  function tick(seconds: number) {
    phase = (phase + seconds * (.18 + .026 * wind)) % 1;
    model.anemometer.rotation.y += seconds * wind * .35;
    for (const [i, mark] of model.windMarkers.entries()) {
      mark.position.x = -5.17 + 2 * ((phase + i * .19) % 1);
    }
    if (!spinning) return;
    const delta = seconds * (.26 + .044 * wind);
    for (const part of [model.rotor, model.hub, model.shaft, model.low]) part.rotation.x += delta;
    model.intermediate.rotation.x -= 2 * delta;
    for (const part of [model.high, model.disc, model.generator]) part.rotation.x += 4 * delta;
  }

  return {
    ...viewer,
    setState(state: WindViewState) {
      const reframe = view !== state.view;
      view = state.view;
      const exploded = view === 'exploded';
      for (const [id, entry] of model.parts) {
        entry.group.visible = windPartVisible(id, view);
        entry.group.position.x = exploded ? explodedX[id] ?? 0 : 0;
        for (const material of entry.materials) material.emissive.setHex(id === state.selected ? 0x225b36 : 0);
      }
      model.head.rotation.y = state.yawDemo && !exploded ? .40 : 0;
      for (const blade of model.bladePivots) blade.rotation.y = state.feathered ? 1.19 : 0;
      model.airflow.visible = state.showWind && !exploded && state.speed > 0;
      model.cable.visible = !exploded;
      model.led.material.color.setHex(state.generating ? 0x65e1b2 : 0x667c8b);
      model.cableMaterial.color.setHex(state.generating ? 0x5ad6b1 : 0x395f75);
      wind = state.speed;
      spinning = state.generating;
      const animate = state.playing && !exploded && state.speed > 0;
      if (animate !== running) {
        running = animate;
        viewer.animate(running ? tick : null);
      }
      if (reframe) viewer.reset();
      viewer.requestDraw();
    }
  };
}
