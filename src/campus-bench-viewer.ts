import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, EdgesGeometry, Float32BufferAttribute, Group, Line,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshPhongMaterial, PlaneGeometry, TubeGeometry, Vector3
} from 'three';
import type {Object3D, Scene} from 'three';
import type {BenchInput, BenchResult, Terminal, Wire} from './amazon-engine';
import {createLabViewer} from './lab-viewer';
import {benchCablePath, benchTerminalPositions, wireColors, wireKind, type BenchDevice, type BenchPoint} from './campus-bench-wiring';

export type BenchCamera = 'overview' | 'rack' | 'source';
type PortProjection = (id: Terminal, x: number, y: number, inFrame: boolean) => void;
const portCoordinates = Object.entries(benchTerminalPositions) as [Terminal, BenchPoint][];

function photovoltaicCellGrid() {
  const vertices: number[] = [];
  function strip(left: number, bottom: number, right: number, top: number) {
    const z = .079;
    vertices.push(left, bottom, z, right, bottom, z, right, top, z, left, bottom, z, right, top, z, left, top, z);
  }
  for (let i = 1; i < 12; i++) {
    const x = -.78 + i * .13;
    strip(x - .0025, -.455, x + .0025, .455);
  }
  for (let i = 1; i < 6; i++) {
    const y = -.455 + i * .1517;
    strip(-.78, y - .004, .78, y + .004);
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3));
}

function buildScene(scene: Scene, lightweight: boolean) {
  const floor = new Group();
  const rack = new Group();
  const solar = new Group();
  const wind = new Group();
  const cables = new Group();
  const cube = new BoxGeometry(1, 1, 1);
  const cubeEdges = new EdgesGeometry(cube);
  const cylinder = new CylinderGeometry(1, 1, 1, 12);
  const cellGrid = photovoltaicCellGrid();
  const gridMaterial = new MeshBasicMaterial({color: 0x5a7a92});
  const glassGeometry = new PlaneGeometry(1.56, .91);
  const glassMaterials = [new MeshBasicMaterial({color: 0x213b56}), new MeshBasicMaterial({color: 0x253e59})];
  scene.add(floor, rack, solar, wind, cables);
  const pickable: Object3D[] = [];
  const highlights: {part: BenchDevice; edge: LineSegments}[] = [];
  const metals = new Map<number, MeshPhongMaterial>();
  const steel = 0x869daa, darkSteel = 0x394e5b, caseGray = 0xa5b2b8;

  function material(color: number) {
    let result = metals.get(color);
    if (!result) {
      result = new MeshPhongMaterial({color, shininess: color === steel ? 62 : 19});
      metals.set(color, result);
    }
    return result;
  }

  function solid(parent: Group, geometry: BufferGeometry, size: BenchPoint, at: BenchPoint, color: number) {
    const mesh = new Mesh(geometry, material(color));
    mesh.position.set(...at);
    mesh.scale.set(...size);
    parent.add(mesh);
    return mesh;
  }

  function box(parent: Group, size: BenchPoint, at: BenchPoint, color: number) {
    return solid(parent, cube, size, at, color);
  }

  function body(parent: Group, part: BenchDevice, size: BenchPoint, at: BenchPoint, color: number) {
    const mesh = box(parent, size, at, color);
    mesh.userData.part = part;
    pickable.push(mesh);
    const edge = new LineSegments(cubeEdges, new LineBasicMaterial({color: 0x64e9c7, transparent: true, opacity: .87}));
    edge.position.copy(mesh.position);
    edge.scale.copy(mesh.scale).multiplyScalar(1.014);
    edge.visible = false;
    parent.add(edge);
    highlights.push({part, edge});
    return mesh;
  }

  function lines(parent: Group, points: BenchPoint[], color: number, opacity = 1) {
    const geometry = new BufferGeometry().setFromPoints(points.map(point => new Vector3(...point)));
    const segments = new LineSegments(geometry, new LineBasicMaterial({color, opacity, transparent: opacity < 1}));
    parent.add(segments);
    return segments;
  }

  const slab = box(floor, [9.25, .14, 4.70], [.14, -.085, .10], 0x465b68);
  const plinth = box(floor, [9.36, .06, 4.81], [.14, -.18, .10], 0x263948);
  const floorGrid: BenchPoint[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = -4.46 + i * .46;
    floorGrid.push([x, .001, -2.23], [x, .001, 2.43]);
  }
  for (let i = 0; i <= 10; i++) {
    const z = -2.2 + i * .46;
    floorGrid.push([-4.46, .001, z], [4.74, .001, z]);
  }
  const tiles = lines(floor, floorGrid, 0x9eaeb6, .32);
  for (const x of [-4.28, 4.56]) {
    box(floor, [.043, .009, 4.28], [x, .005, .10], 0xb29a63);
  }

  // Steel rack with exposed equipment faces and a separate battery bus.
  for (const x of [-3.60, -1.12]) {
    for (const z of [-.53, .47]) {
      box(rack, [.10, 3.32, .10], [x, 1.69, z], steel);
      box(rack, [.28, .044, .26], [x, .025, z], darkSteel);
    }
    for (const y of [.22, .96, 1.76, 2.62, 3.34]) {
      box(rack, [.08, .065, 1.08], [x, y, -.03], steel);
    }
  }
  for (const y of [.28, 1.00, 1.76, 2.62]) {
    box(rack, [2.48, .065, 1.14], [-2.36, y, -.04], 0x9b7955);
    box(rack, [2.52, .065, .065], [-2.36, y - .045, .48], darkSteel);
  }
  box(rack, [2.57, .07, .09], [-2.36, 3.34, .47], darkSteel);
  box(rack, [2.52, 2.64, .045], [-2.36, 1.98, -.51], 0x304652);
  const rearBracing = box(rack, [.069, 3.55, .06], [-2.36, 1.74, -.575], steel);
  rearBracing.rotation.z = -.70;
  for (const y of [1.71, 2.61]) {
    box(rack, [2.46, .075, .11], [-2.36, y, .57], 0x314451);
  }

  const protection = new Group();
  protection.position.set(-2.94, 2.98, .31);
  rack.add(protection);
  body(protection, 'protection', [.90, .60, .37], [0, 0, 0], caseGray);
  box(protection, [.74, .43, .034], [0, 0, .202], 0x273845);
  box(protection, [.68, .055, .031], [0, -.14, .226], steel);
  const breakers = [-.22, 0, .22].map(x => {
    box(protection, [.17, .265, .073], [x, .01, .24], 0xd1d9dc);
    return box(protection, [.097, .074, .041], [x, .043, .297], darkSteel);
  });
  const protectionSignal = new Mesh(new BoxGeometry(.07, .03, .028), new MeshBasicMaterial({color: 0x6ddca9}));
  protectionSignal.position.set(.38, .22, .214);
  protection.add(protectionSignal);

  const load = new Group();
  load.position.set(-1.88, 3.06, .31);
  rack.add(load);
  body(load, 'load', [.83, .59, .40], [0, 0, 0], 0x556976);
  box(load, [.68, .44, .041], [0, 0, .213], 0x172735);
  const lamp = new Mesh(new CylinderGeometry(.116, .116, .047, lightweight ? 10 : 20),
    new MeshBasicMaterial({color: 0x54616b}));
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, .066, .262);
  load.add(lamp);
  box(load, [.33, .025, .029], [0, -.091, .248], 0x8597a3);

  const controller = new Group();
  controller.position.set(-2.94, 2.13, .28);
  rack.add(controller);
  body(controller, 'controller', [.73, .72, .43], [0, 0, 0], 0xaf5142);
  box(controller, [.59, .58, .045], [0, 0, .234], 0x602a29);
  box(controller, [.31, .112, .031], [0, 0, .265], 0x152b34);
  const controllerSignal = new Mesh(new BoxGeometry(.18, .035, .018), new MeshBasicMaterial({color: 0x52776f}));
  controllerSignal.position.set(0, 0, .286);
  controller.add(controllerSignal);
  for (const x of [-.39, .39]) box(controller, [.043, .62, .23], [x, 0, -.02], darkSteel);

  const inverter = new Group();
  inverter.position.set(-1.89, 2.12, .26);
  rack.add(inverter);
  body(inverter, 'inverter', [.87, .71, .47], [0, 0, 0], caseGray);
  box(inverter, [.73, .58, .041], [0, 0, .254], 0x3c5463);
  box(inverter, [.39, .10, .027], [0, .008, .283], 0x152a36);
  const inverterSignal = new Mesh(new BoxGeometry(.22, .033, .019), new MeshBasicMaterial({color: 0x536e75}));
  inverterSignal.position.set(0, .008, .302);
  inverter.add(inverterSignal);
  for (const x of [-.45, .45]) {
    for (const y of [-.24, -.12, 0, .12, .24]) box(inverter, [.03, .038, .26], [x, y, .018], darkSteel);
  }

  const battery = new Group();
  rack.add(battery);
  body(battery, 'battery', [1.39, .22, .28], [-2.67, 1.49, .65], darkSteel);
  for (const y of [.52, 1.25]) {
    for (const x of [-3.17, -2.36, -1.55]) {
      body(battery, 'battery', [.67, .40, .73], [x, y, .005], 0x192a36);
      box(battery, [.69, .054, .75], [x, y + .20, .005], 0x344755);
      box(battery, [.39, .135, .015], [x, y, .38], 0x99adb1);
      box(battery, [.28, .026, .015], [x, y, .39], 0x3c5b64);
      box(battery, [.095, .052, .09], [x - .22, y + .244, .23], 0xd15c47);
      box(battery, [.095, .052, .09], [x + .22, y + .244, .23], 0x337eab);
    }
  }

  const sourceBox = new Group();
  sourceBox.position.set(.78, .48, 1.49);
  scene.add(sourceBox);
  box(sourceBox, [.12, .42, .12], [0, -.27, -.024], steel);
  body(sourceBox, 'source', [.81, .31, .27], [0, 0, 0], 0x293d4b);
  box(sourceBox, [.69, .08, .02], [0, .093, .145], 0x69868f);

  // The ports are in front of the modeled equipment. Each accepts the same ID as the schematic.
  for (const [id, point] of portCoordinates) {
    const capColor = wireColors[wireKind([id, id])];
    const cap = solid(rack, cylinder, [.084, .082, .084], [point[0], point[1], point[2] - .038], darkSteel);
    cap.rotation.x = Math.PI / 2;
    const ring = new Mesh(new CylinderGeometry(.060, .060, .025, 12), new MeshBasicMaterial({color: capColor}));
    ring.position.set(...point);
    ring.rotation.x = Math.PI / 2;
    rack.add(ring);
  }

  const table = new Group();
  table.position.set(2.37, 1.24, -.30);
  table.rotation.x = -.93;
  solar.add(table);
  const rails = [-.30, .30].map(y => box(table, [1, .091, .15], [0, y, -.127], steel));
  const supports = Array.from({length: 4}, () => ({
    leg: box(solar, [.09, 1, .10], [0, 0, 0], steel),
    footing: box(solar, [.34, .12, .33], [0, .06, 0], 0x9a8b70)
  }));
  const braces = Array.from({length: 2}, () => box(solar, [.055, 1, .055], [0, 0, 0], darkSteel));
  const modules = Array.from({length: 24}, (_, index) => {
    const group = new Group();
    table.add(group);
    body(group, 'source', [1.64, .99, .085], [0, 0, 0], 0xaec5cb);
    const glass = new Mesh(glassGeometry, glassMaterials[index % 2]);
    glass.position.z = .074;
    glass.renderOrder = 1;
    const grid = new Mesh(cellGrid, gridMaterial);
    grid.renderOrder = 2;
    group.add(glass, grid);
    return group;
  });

  function resizeArray(series: number, parallel: number) {
    const scale = Math.min(4.46 / (series * 1.68), 3.10 / (parallel * 1.04), 1.42);
    const width = series * 1.68 * scale;
    const depth = parallel * 1.04 * scale;
    modules.forEach((module, index) => {
      module.visible = index < series * parallel;
      if (!module.visible) return;
      module.scale.setScalar(scale);
      module.position.set((index % series - (series - 1) / 2) * 1.68 * scale,
        (Math.floor(index / series) - (parallel - 1) / 2) * 1.04 * scale, 0);
    });
    table.updateWorldMatrix(true, false);
    rails.forEach((rail, index) => {
      rail.position.y = depth * (index === 0 ? -.32 : .32);
      rail.scale.x = width;
    });
    const feet = supports.map(({leg, footing}, index) => {
      const top = table.localToWorld(new Vector3(width * (index < 2 ? -.34 : .34),
        depth * (index % 2 ? .32 : -.32), -.14));
      leg.position.set(top.x, (top.y + .12) / 2, top.z);
      leg.scale.y = top.y - .12;
      footing.position.set(top.x, .06, top.z);
      return top;
    });
    braces.forEach((brace, index) => {
      const top = feet[index * 2 + 1];
      const base = feet[index * 2].clone().setY(.17);
      const axis = top.clone().sub(base);
      brace.position.copy(base).lerp(top, .5);
      brace.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), axis.clone().normalize());
      brace.scale.y = axis.length();
    });
  }

  const tower = new Group();
  tower.position.set(2.49, 0, -.31);
  wind.add(tower);
  box(tower, [.75, .14, .75], [0, .07, 0], 0x7c8588);
  solid(tower, new CylinderGeometry(.11, .22, 2.47, 14), [1, 1, 1], [0, 1.36, 0], caseGray);
  body(tower, 'source', [.43, .38, .68], [0, 2.67, -.12], caseGray);
  const rotor = new Group();
  rotor.position.set(0, 2.67, .31);
  tower.add(rotor);
  body(rotor, 'source', [.30, .30, .23], [0, 0, 0], 0x9bb4c1);
  for (let index = 0; index < 3; index++) {
    const blade = new Group();
    blade.rotation.z = .22 + index * 2 * Math.PI / 3;
    rotor.add(blade);
    const root = box(blade, [.18, .64, .07], [-.044, .42, 0], 0xb2c8d0);
    root.rotation.z = .13;
    const tip = box(blade, [.099, .60, .056], [-.12, .99, 0], 0xc2d1d6);
    tip.rotation.z = .12;
  }

  function rebuildCables(wires: Wire[]) {
    for (const cable of [...cables.children]) {
      if (cable instanceof Mesh || cable instanceof Line) {
        cable.geometry.dispose();
        cable.material.dispose();
      }
      cables.remove(cable);
    }
    for (const wire of wires) {
      const color = wireColors[wireKind(wire)];
      const curve = new CatmullRomCurve3(benchCablePath(wire).map(point => new Vector3(...point)));
      const cable = lightweight
        ? new Line(new BufferGeometry().setFromPoints(curve.getPoints(18)), new LineBasicMaterial({color, linewidth: 3}))
        : new Mesh(new TubeGeometry(curve, 32, .026, 6, false), new MeshPhongMaterial({color, emissive: color, emissiveIntensity: .13}));
      if (lightweight) cable.renderOrder = 3;
      cables.add(cable);
    }
  }

  return {pickable, highlights, solar, wind, slab, plinth, tiles, breakers, protectionSignal, controllerSignal, inverterSignal, lamp,
    resizeArray, rebuildCables};
}

const cameraViews = {
  overview: {position: [6.5, 6.5, 12.5], target: [.05, 1.18, .04], halfHeight: 2.64, halfWidth: 4.87},
  rack: {position: [1.7, 4.30, 10.5], target: [-2.39, 1.72, .16], halfHeight: 1.94, halfWidth: 2.00},
  source: {position: [7.1, 5.40, 10.0], target: [2.07, 1.32, .04], halfHeight: 2.13, halfWidth: 2.96}
} satisfies Record<BenchCamera, {position: BenchPoint; target: BenchPoint; halfWidth: number; halfHeight: number}>;

export function createCampusBenchViewer(host: HTMLDivElement, onDevice: (id: BenchDevice) => void,
  onLost: () => void, project: PortProjection) {
  let cameraView: BenchCamera = 'overview';
  const point = new Vector3();
  const viewer = createLabViewer(host, buildScene, () => cameraViews[cameraView], -.205, onDevice, onLost, {
    touchScroll: true,
    afterRender(camera) {
      const {clientWidth: width, clientHeight: height} = host;
      for (const [id, position] of portCoordinates) {
        point.set(...position).project(camera);
        const x = (point.x + 1) * width / 2;
        const y = (1 - point.y) * height / 2;
        project(id, x, y, point.z >= -1 && point.z <= 1 && x > 17 && x < width - 17 && y > 17 && y < height - 17);
      }
    }
  });
  const scene = viewer.model;
  let lastArray = '';
  let lastWires: Wire[] | undefined;

  return {
    ...viewer,
    focus(view: BenchCamera) {
      cameraView = view;
      viewer.reset();
    },
    update(input: BenchInput, wires: Wire[], reading: BenchResult, selected: BenchDevice, light: boolean) {
      const array = input.series + '/' + input.parallel;
      if (lastArray !== array) {
        lastArray = array;
        scene.resizeArray(input.series, input.parallel);
      }
      if (lastWires !== wires) {
        lastWires = wires;
        scene.rebuildCables(wires);
      }
      scene.solar.visible = input.source === 'solar';
      scene.wind.visible = input.source === 'wind';
      for (const {part, edge} of scene.highlights) edge.visible = part === selected;
      scene.slab.material.color.setHex(light ? 0x9a9484 : 0x465b68);
      scene.plinth.material.color.setHex(light ? 0x666f6c : 0x263948);
      scene.tiles.material.color.setHex(light ? 0x546c7b : 0x9eaeb6);
      scene.lamp.material.color.setHex(reading.outputW > 0 ? 0xffce70 : 0x54616b);
      scene.controllerSignal.material.color.setHex(reading.controllerW > 0 ? 0x75f4b5 : 0x52776f);
      scene.inverterSignal.material.color.setHex(reading.outputV > 0 ? 0x74ddfb : 0x536e75);
      scene.protectionSignal.material.color.setHex(reading.tripped ? 0xff694d : 0x6ddca9);
      for (const breaker of scene.breakers) breaker.position.y = reading.tripped ? -.045 : .043;
      viewer.requestDraw();
    }
  };
}
