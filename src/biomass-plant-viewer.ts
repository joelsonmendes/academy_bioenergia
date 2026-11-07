import {
  BoxGeometry, Color, ConeGeometry, CurvePath, CylinderGeometry, DoubleSide, Group,
  LineCurve3, Mesh, MeshBasicMaterial, MeshPhongMaterial, QuadraticBezierCurve3,
  TubeGeometry, Vector3
} from 'three';
import type {BufferGeometry, Object3D, Scene} from 'three';
import {surface} from './lab-mesh';
import {createLabViewer} from './lab-viewer';
import {buildTurbineAssembly} from './turbine-viewer';

export const plantParts = [
  'yard', 'feeder', 'boiler', 'turbine', 'generator', 'transformer',
  'condenser', 'pump', 'cooling', 'filter', 'stack', 'ash'
] as const;
export type PlantPart = typeof plantParts[number];
export const plantViews = ['overview', 'boiler', 'generation', 'exhaust'] as const;
export type PlantView = typeof plantViews[number];
export const flowFilters = ['all', 'fuel', 'steam', 'cooling', 'gas', 'ash', 'electric'] as const;
export type FlowFilter = typeof flowFilters[number];

export const plantFlows = {
  fuel: {filter: 'fuel', color: '#a6e86b'},
  steam: {filter: 'steam', color: '#ff774f'},
  exhaust: {filter: 'steam', color: '#f6c7eb'},
  water: {filter: 'steam', color: '#5db5ff'},
  cooling: {filter: 'cooling', color: '#42dacc'},
  gas: {filter: 'gas', color: '#d4a76b'},
  ash: {filter: 'ash', color: '#b1bdcd'},
  electric: {filter: 'electric', color: '#ffe16b'}
} as const;
type Flow = keyof typeof plantFlows;
type Point = [number, number, number];
const poses: Record<PlantView, {position: Point; target: Point; halfWidth: number; halfHeight: number}> = {
  overview: {position: [3.9, 8.9, 19], target: [0, 1.75, 0], halfWidth: 9.5, halfHeight: 3.65},
  boiler: {position: [-.05, 4.2, 10], target: [-1.95, 2.05, 0], halfWidth: 2.4, halfHeight: 2.45},
  generation: {position: [6.2, 5.2, 14], target: [3.3, 1.35, 0], halfWidth: 4.4, halfHeight: 2.25},
  exhaust: {position: [1, 7.25, -13], target: [1.05, 2.55, -2.25], halfWidth: 4.15, halfHeight: 3.05}
};

interface PlantState {
  part: PlantPart;
  view: PlantView;
  flow: FlowFilter;
  firing: boolean;
  generating: boolean;
  playing: boolean;
}

const steel = 0x567085;
const rim = 0x9baeb9;
const frame = 0x344e5f;
const green = 0x578261;
const rail = 0xceb161;
const tau = Math.PI * 2;

function flowCurve(points: Point[]) {
  const vertices = points.map(point => new Vector3(...point));
  const curve = new CurvePath<Vector3>();
  let start = vertices[0];
  for (let i = 1; i < vertices.length - 1; i++) {
    const corner = vertices[i];
    const next = vertices[i + 1];
    const cut = Math.min(.22, corner.distanceTo(start) * .4, corner.distanceTo(next) * .4);
    const entry = corner.clone().addScaledVector(start.clone().sub(corner).normalize(), cut);
    const exit = corner.clone().addScaledVector(next.clone().sub(corner).normalize(), cut);
    curve.add(new LineCurve3(start, entry));
    curve.add(new QuadraticBezierCurve3(entry, corner, exit));
    start = exit;
  }
  curve.add(new LineCurve3(start, vertices[vertices.length - 1]));
  return curve;
}

function buildPlant(scene: Scene, lightweight: boolean) {
  const sides = lightweight ? 10 : 24;
  const pickable: Object3D[] = [];
  const materials = new Map<PlantPart, Map<number, MeshPhongMaterial>>();
  const routes: {
    id: Flow;
    curve: ReturnType<typeof flowCurve>;
    material: MeshBasicMaterial;
    arrow: Mesh;
    marker: Mesh;
    color: Color;
  }[] = [];
  const flames = new Group();
  scene.add(flames);

  function shape(part: PlantPart | null, geometry: BufferGeometry, color: number, position: Point) {
    let material: MeshPhongMaterial;
    if (part) {
      let palette = materials.get(part);
      if (!palette) {
        palette = new Map();
        materials.set(part, palette);
      }
      material = palette.get(color) ?? new MeshPhongMaterial({color, shininess: 35});
      palette.set(color, material);
    } else {
      material = new MeshPhongMaterial({color, shininess: 15});
    }
    const object = new Mesh(geometry, material);
    object.position.set(...position);
    scene.add(object);
    if (part) {
      object.userData.part = part;
      pickable.push(object);
    }
    return object;
  }

  function box(part: PlantPart | null, position: Point, size: Point, color: number) {
    return shape(part, new BoxGeometry(...size), color, position);
  }

  function cylinder(part: PlantPart, position: Point, top: number, bottom: number, height: number, color: number) {
    return shape(part, new CylinderGeometry(top, bottom, height, sides), color, position);
  }

  function beam(part: PlantPart, start: Point, end: Point, width: number, depth: number, color: number) {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    const center = from.lerp(to, .5);
    const member = box(part, [center.x, center.y, center.z], [width, direction.length(), depth], color);
    member.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  }

  function flow(id: Flow, points: Point[], radius: number) {
    const curve = flowCurve(points);
    const color = new Color(plantFlows[id].color);
    const material = new MeshBasicMaterial({color});
    const segments = Math.ceil(curve.getLength() * (lightweight ? 5 : 10));
    const pipe = new Mesh(new TubeGeometry(curve, segments, radius, lightweight ? 4 : 8), material);
    scene.add(pipe);
    const arrow = new Mesh(new ConeGeometry(radius * 2.45, radius * 4.1, sides), material);
    arrow.position.copy(curve.getPointAt(.6));
    arrow.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), curve.getTangentAt(.6).normalize());
    const marker = new Mesh(new CylinderGeometry(radius * 1.45, radius * 1.45, radius * 3, sides),
      new MeshBasicMaterial({color: color.clone().lerp(new Color(0xffffff), .65)}));
    scene.add(arrow, marker);
    routes.push({id, curve, material, arrow, marker, color});
  }

  // Foundation and separate process areas.
  box(null, [0, -.13, 0], [16.8, .26, 7.3], 0x2b4052);
  box(null, [-.2, .014, 3.18], [15.6, .025, .54], 0x40596b);
  box(null, [-.2, .038, 2.88], [15.6, .022, .032], 0x9a8754);
  box(null, [2.35, .11, 0], [4.42, .22, 1.83], frame);
  box(null, [-1.91, .084, 0], [2.38, .17, 2.35], frame);

  // Open receiving shed and a hopper with a visible bed of fuel.
  box('yard', [-6.63, .12, 0], [3.05, .24, 2.25], frame);
  box('yard', [-6.66, .64, -.98], [2.94, 1.02, .17], steel);
  box('yard', [-8.02, .64, -.08], [.16, 1.02, 1.88], steel);
  for (const x of [-8.06, -5.21]) {
    for (const z of [-1.09, 1.06]) {
      box('yard', [x, 1.24, z], [.15, 2.35, .15], green);
      beam('yard', [x, 2.08, z], [x, 2.52, 0], .09, .12, green);
    }
  }
  for (const z of [-1, 1]) box('yard', [-6.63, 2.26, z], [3.14, .13, .14], green);
  for (const z of [-.57, .57]) {
    const roof = box('yard', [-6.63, 2.44, z], [3.23, .075, 1.22], 0x486a58);
    roof.rotation.x = Math.sign(z) * .23;
  }
  const chips = [0x9b6235, 0xc7955a, 0x7f542e, 0xdda46b];
  const pileGeometry = surface(6, sides, (u, v) => {
    const angle = v * tau;
    const radius = Math.pow(1 - u, .64) * (1 + .12 * Math.cos(5 * angle));
    return [1.04 * radius * Math.cos(angle), .69 * u, .78 * radius * Math.sin(angle)];
  });
  shape('yard', pileGeometry, 0x8e5a32, [-6.95, .24, -.04]);
  for (let i = 0; i < (lightweight ? 44 : 76); i++) {
    const angle = (i * .3827 % 1) * tau;
    const radius = .14 + .86 * Math.sqrt(i * .618 % 1);
    const height = .265 + .68 * (1 - Math.pow(radius, 1 / .64));
    const chip = box('yard', [-6.95 + radius * Math.cos(angle), height, -.04 + .76 * radius * Math.sin(angle)],
      [.14 + i % 4 * .019, .072, .112], chips[i % chips.length]);
    chip.rotation.set(i * .37, i * 1.17, .32);
  }
  const hopper = shape('yard', new CylinderGeometry(.69, .29, .74, 4), steel, [-5.4, .68, .08]);
  hopper.rotation.y = Math.PI / 4;
  box('yard', [-5.4, 1.062, .08], [.88, .047, .88], 0x9c673d);

  // Belt and support frame terminate at the furnace feed opening.
  for (const z of [-.29, .45]) {
    beam('feeder', [-5.27, .47, z], [-2.9, 1.28, z], .12, .13, green);
    for (const x of [-4.78, -3.42]) {
      const height = x < -4 ? .63 : 1.09;
      box('feeder', [x, height / 2, z], [.1, height, .1], frame);
    }
  }
  beam('feeder', [-5.28, .48, .08], [-2.91, 1.29, .08], .13, .66, 0x273139);
  for (let i = 0; i < 9; i++) {
    box('feeder', [-5.15 + i * .25, .54 + i * .085, .08], [.055, .052, .58], rim);
  }
  flow('fuel', [[-6.8, 1.02, .45], [-5.4, 1.14, .08], [-5.14, .65, .08], [-2.88, 1.43, .08]], .044);

  // Cutaway boiler. The water wall is behind the grate and combustion chamber.
  box('boiler', [-1.91, 2.14, -.86], [2.07, 3.94, .17], 0x3b4852);
  box('boiler', [-2.9, 2.77, 0], [.16, 2.64, 1.78], steel);
  box('boiler', [-.93, 2.08, -.12], [.16, 3.82, 1.6], steel);
  box('boiler', [-1.91, 3.94, -.04], [2.18, .19, 1.99], rim);
  box('boiler', [-1.91, .46, .05], [1.84, .49, 1.6], 0x4a3430);
  box('boiler', [-1.91, 1.98, -.74], [1.9, 2.96, .09], 0x53362f);
  for (const x of [-2.94, -.89]) {
    box('boiler', [x, 2.14, .91], [.16, 3.93, .16], frame);
    for (const y of [.7, 3.38]) box('boiler', [x, y, 1.02], [.23, .21, .05], rim);
  }
  for (const y of [.36, 3.78]) box('boiler', [-1.91, y, .91], [2.2, .13, .16], steel);
  for (let i = 0; i < 9; i++) {
    const x = -2.69 + i * .194;
    cylinder('boiler', [x, 2.31, -.63], .035, .035, 2.53, 0xc99776);
    box('boiler', [x, .75, .14], [.09, .076, 1.19], 0x7e7f7c);
  }
  cylinder('boiler', [-1.91, 1.025, -.63], .091, .091, 1.83, 0x549dd2).rotation.z = Math.PI / 2;
  cylinder('boiler', [-1.91, 3.58, -.63], .109, .109, 1.9, 0xcb7f5b).rotation.z = Math.PI / 2;
  cylinder('boiler', [-1.43, 3.6, -.3], .19, .19, 1.25, rim).rotation.z = Math.PI / 2;
  for (const x of [-2.92, -.9]) {
    beam('boiler', [x, 4.02, .94], [x, 4.4, .94], .043, .043, rail);
  }
  box('boiler', [-1.91, 4.4, .94], [2.12, .047, .047], rail);
  cylinder('boiler', [-3.4, .44, -1.13], .25, .25, .21, steel).rotation.z = Math.PI / 2;
  cylinder('boiler', [-3.62, .44, -1.13], .14, .14, .26, 0x527fa0).rotation.z = Math.PI / 2;
  beam('boiler', [-3.31, .42, -1.13], [-2.78, .42, -.54], .22, .2, steel);

  for (let i = 0; i < 11; i++) {
    const x = -2.65 + (i % 5) * .36;
    const z = .45 - Math.floor(i / 5) * .41;
    const h = .49 + (i * .47 % .81);
    const lean = (i % 4 - 1.5) * .15;
    const flame = surface(lightweight ? 6 : 9, lightweight ? 6 : 10, (u, v) => {
      const angle = v * tau + .85 * u;
      const radius = .23 * Math.pow(1 - u, .86) * (.58 + .54 * Math.sin(u * Math.PI));
      return [
        radius * Math.cos(angle) + lean * u * u,
        h * u,
        .68 * radius * Math.sin(angle) + .12 * u * u
      ];
    });
    const tongue = new Mesh(flame, new MeshBasicMaterial({
      color: i % 3 === 0 ? 0xffd270 : i % 3 === 1 ? 0xff983c : 0xe35b27
    }));
    tongue.position.set(x, .75, z);
    flames.add(tongue);
  }

  // Existing cutaway turbine-generator assembly, with the shaft on a common bed.
  const train = new Group();
  train.position.set(2.4, 1.29, .03);
  train.scale.setScalar(.69);
  scene.add(train);
  const assembly = buildTurbineAssembly(train, lightweight);
  for (const mesh of assembly.pickable) {
    const id = mesh.userData.part;
    mesh.userData.part = id === 'casing' || id === 'turbine' ? 'turbine' : 'generator';
    pickable.push(mesh);
  }
  const rotating = (['turbine', 'coupling', 'rotor'] as const).map(id => assembly.parts.get(id)!.group);
  for (const x of [.66, 1.71, 2.94, 3.94]) {
    box(x < 2 ? 'turbine' : 'generator', [x, .4, .02], [.24, .38, 1.42], frame);
  }
  flow('steam', [[-1.04, 3.6, -.3], [-.58, 3.6, -.3], [.633, 3.6, -.205], [.633, 2.16, -.205]], .103);
  cylinder('turbine', [.633, 2.58, -.205], .145, .145, .09, rim);

  // The condenser's water-side circuit is independent of the boiler feed circuit.
  const condenser = cylinder('condenser', [1.43, .53, 2.12], .36, .36, 1.36, steel);
  condenser.rotation.z = Math.PI / 2;
  for (const x of [.76, 2.10]) {
    cylinder('condenser', [x, .53, 2.12], .389, .389, .13, rim).rotation.z = Math.PI / 2;
    box('condenser', [x, .16, 2.12], [.21, .24, .7], frame);
  }
  flow('exhaust', [[1.62, .77, .03], [1.62, .45, .03], [1.62, .45, 1.24],
    [1.62, .82, 1.24], [1.62, .82, 2.1]], .10);
  box('pump', [-.64, .14, 2.12], [.83, .16, .58], frame);
  cylinder('pump', [-.66, .39, 2.12], .19, .19, .66, 0x527fa0).rotation.z = Math.PI / 2;
  cylinder('pump', [-.27, .4, 2.12], .24, .24, .17, steel).rotation.z = Math.PI / 2;
  flow('water', [[.79, .33, 2.12], [.44, .33, 2.12], [.44, .4, 2.12], [-.24, .4, 2.12]], .053);
  flow('water', [[-.28, .54, 2.12], [-.28, .63, 2.12], [-.28, .63, 1.39], [-.28, .38, 1.39],
    [-.46, .38, 1.39], [-.46, .38, -.64], [-.67, .38, -.64], [-.67, 1.025, -.64], [-1.04, 1.025, -.64]], .061);

  const towerX = 5.24;
  const towerZ = 2.47;
  box('cooling', [towerX, .10, towerZ], [1.74, .2, 1.76], frame);
  cylinder('cooling', [towerX, .21, towerZ], .78, .83, .24, 0x477c79);
  const shell = surface(9, sides, (u, v) => {
    const radius = .53 + .27 * Math.pow(Math.abs(u - .66) / .66, 1.45);
    return [radius * Math.cos(v * tau), 1.55 * u, radius * Math.sin(v * tau)];
  });
  const tower = shape('cooling', shell, 0x829b9e, [towerX, .32, towerZ]);
  tower.material.side = DoubleSide;
  cylinder('cooling', [towerX, 1.85, towerZ], .62, .62, .09, rim);
  cylinder('cooling', [towerX, 1.899, towerZ], .51, .51, .02, frame);
  for (let i = 0; i < 10; i++) {
    const angle = i * tau / 10;
    const slat = box('cooling', [towerX + .754 * Math.cos(angle), .52, towerZ + .754 * Math.sin(angle)],
      [.035, .28, .075], frame);
    slat.rotation.y = -angle;
  }
  flow('cooling', [[2.12, .67, 2.1], [2.42, .67, 2.1], [2.42, .66, 2.56], [4.34, .66, 2.56], [4.66, .93, 2.56]], .055);
  flow('cooling', [[4.5, .27, 2.84], [2.31, .27, 2.84], [2.31, .39, 2.45], [2.14, .39, 2.25]], .055);
  cylinder('cooling', [3.28, .27, 2.84], .115, .115, .29, steel).rotation.z = Math.PI / 2;

  // Flue gas passes through the separator before discharge. Ash has its own handling line.
  box('filter', [1.01, 2.03, -2.32], [1.72, 1.7, 1.38], steel);
  box('filter', [1.01, 2.91, -2.32], [1.86, .12, 1.48], rim);
  for (const x of [.23, .74, 1.26, 1.78]) {
    for (const z of [-2.96, -1.68]) box('filter', [x, 1.51, z], [.076, 2.85, .076], frame);
    box('filter', [x, 2.08, -3.025], [.04, 1.45, .04], rim);
  }
  for (const x of [.58, 1.44]) {
    const funnel = shape('filter', new CylinderGeometry(.55, .15, .66, 4), 0x6e8191, [x, .87, -2.32]);
    funnel.rotation.y = Math.PI / 4;
  }
  cylinder('stack', [3.24, .28, -2.56], .46, .58, .54, frame);
  cylinder('stack', [3.24, 2.81, -2.56], .205, .34, 4.65, 0x8e969d);
  for (const y of [1.06, 2.07, 3.6, 4.88, 5.13]) {
    cylinder('stack', [3.24, y, -2.56], y > 4 ? .24 : .345, y > 4 ? .24 : .345, .09,
      y > 4 ? 0xaf6a5d : steel);
  }
  cylinder('stack', [3.24, 5.145, -2.56], .183, .183, .024, frame);
  flow('gas', [[-1.93, 3.29, -.96], [-1.93, 3.29, -2.32], [-.21, 3.29, -2.32],
    [-.21, 2.35, -2.32], [.17, 2.35, -2.32]], .123);
  flow('gas', [[1.86, 2.4, -2.32], [2.56, 2.4, -2.32], [2.56, 2.26, -2.56], [3, 2.26, -2.56]], .104);
  flow('gas', [[3.24, 5.15, -2.56], [3.24, 5.52, -2.56]], .063);
  box('ash', [-3.13, .29, 2.31], [1.12, .58, .86], 0x68717e);
  box('ash', [-3.13, .62, 2.31], [1.19, .08, .91], rim);
  cylinder('ash', [2.24, .51, -2.96], .30, .29, .77, 0x7c8996);
  cylinder('ash', [2.24, .92, -2.96], .15, .31, .12, rim);
  flow('ash', [[-1.92, .58, .84], [-1.92, .36, 1.38], [-3.13, .36, 1.38], [-3.13, .62, 2.01]], .068);
  flow('ash', [[.58, .56, -2.32], [.58, .33, -2.32], [1.46, .33, -2.32],
    [1.86, .33, -2.75], [2.24, .58, -2.96]], .054);
  flow('ash', [[1.44, .56, -2.32], [1.44, .33, -2.32]], .054);

  // Electrical island: generator terminals, transformer, and outgoing feeder.
  box('transformer', [5.71, .13, -.22], [1.77, .26, 1.56], frame);
  box('transformer', [5.71, .82, -.22], [1.23, 1.17, .91], 0x657c67);
  for (let i = 0; i < 8; i++) box('transformer', [5.18 + i * .15, .77, .34], [.06, .9, .26], green);
  box('transformer', [5.71, 1.42, -.22], [1.34, .12, .99], green);
  for (const x of [5.28, 5.71, 6.14]) {
    cylinder('transformer', [x, 1.66, -.27], .059, .078, .42, 0x64483c);
    for (const y of [1.54, 1.64, 1.74, 1.83]) {
      cylinder('transformer', [x, y, -.27], .103, .103, .035, 0xae8c70);
    }
  }
  for (const sign of [-1, 1]) {
    beam('transformer', [7.48 + sign * .62, 0, -.18], [7.48 + sign * .11, 3.33, -.18], .075, .095, steel);
    beam('transformer', [7.48 + sign * .44, 1.04, -.18], [7.48 - sign * .28, 2.14, -.18], .065, .065, steel);
    beam('transformer', [7.48 + sign * .28, 2.14, -.18], [7.48 - sign * .11, 3.33, -.18], .058, .058, steel);
  }
  for (const y of [1.04, 2.14, 2.8, 3.3]) box('transformer', [7.48, y, -.18], [y < 2.5 ? .99 : 1.42, .066, .09], steel);
  flow('electric', [[3.43, 2.31, -.19], [3.43, 2.31, .55], [4.3, 2.31, .55], [4.3, .37, .55],
    [5.1, .37, .32], [5.1, .87, .19]], .044);
  flow('electric', [[6.14, 1.87, -.27], [6.63, 2.66, -.22], [7.47, 2.73, -.18], [8.26, 2.69, -.18]], .037);

  function select(part: PlantPart) {
    for (const [id, palette] of materials) {
      for (const material of palette.values()) material.emissive.setHex(id === part ? 0x173c24 : 0);
    }
    for (const [id, detail] of assembly.parts) {
      const picked = id === 'casing' || id === 'turbine' ? 'turbine' : 'generator';
      for (const material of detail.materials) material.emissive.setHex(picked === part ? 0x173c24 : 0);
    }
  }

  return {pickable, routes, flames, rotating, select};
}

export function createBiomassPlantViewer(host: HTMLDivElement, onPart: (id: PlantPart) => void, onLost: () => void) {
  let view: PlantView = 'overview';
  let phase = 0;
  const viewer = createLabViewer(host, buildPlant, () => poses[view], -.27, onPart, onLost);
  const {routes, flames, rotating, select} = viewer.model;
  const up = new Vector3(0, 1, 0);

  return {
    ...viewer,
    setState(next: PlantState) {
      const reframe = next.view !== view;
      view = next.view;
      select(next.part);
      flames.visible = next.firing;
      flames.scale.set(1, 1, 1);
      for (const route of routes) {
        const show = next.flow === 'all' || next.flow === plantFlows[route.id].filter;
        const active = route.id === 'electric' ? next.generating : next.firing;
        route.material.color.copy(route.color).multiplyScalar(show ? (active ? 1 : .55) : .095);
        route.arrow.visible = show && active;
        route.marker.visible = show && active && next.playing;
      }
      viewer.animate(next.playing && next.firing ? elapsed => {
        phase += elapsed;
        flames.scale.y = 1 + .045 * Math.sin(phase * 17);
        for (const shaft of rotating) shaft.rotation.x += elapsed * 1.55;
        for (const route of routes) {
          if (!route.marker.visible) continue;
          const progress = phase * .86 / route.curve.getLength() % 1;
          route.marker.position.copy(route.curve.getPointAt(progress));
          route.marker.quaternion.setFromUnitVectors(up, route.curve.getTangentAt(progress).normalize());
        }
      } : null);
      if (reframe) viewer.reset();
      viewer.requestDraw();
    }
  };
}
