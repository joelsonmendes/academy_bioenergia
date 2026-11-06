import {
  BoxGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, Line, LineBasicMaterial,
  Mesh, MeshPhongMaterial, Shape, TorusGeometry, Vector3, BufferGeometry
} from 'three';
import type {Object3D, Scene} from 'three';
import {createLabViewer} from './lab-viewer';
import {benchLimits} from './renewable-bench';
import type {RenewableInput, evaluateRenewableBench} from './renewable-bench';

export const benchParts = ['pv', 'wind', 'control', 'meter', 'inverter', 'battery', 'load', 'grid', 'pump', 'tanks'] as const;
export type BenchPart = typeof benchParts[number];
type Point = [number, number, number];

export function visibleBenchParts({mode, mix}: RenewableInput): BenchPart[] {
  if (mode === 'pump') return ['pv', 'control', 'meter', 'pump', 'tanks'];
  const sources: BenchPart[] = mix === 'hybrid' ? ['pv', 'wind'] : [mix === 'solar' ? 'pv' : 'wind'];
  return [...sources, 'control', 'meter', 'inverter', mode === 'grid' ? 'grid' : 'battery', 'load'];
}

function buildBench(scene: Scene, lightweight: boolean) {
  const parts = new Map<BenchPart, {group: Group; materials: MeshPhongMaterial[]}>();
  const pickable: Object3D[] = [];
  const segments = lightweight ? 12 : 24;
  const frame = new Group();
  scene.add(frame);
  for (const id of benchParts) {
    const group = new Group();
    scene.add(group);
    parts.set(id, {group, materials: []});
  }

  function body(id: BenchPart | null, geometry: BufferGeometry, color: number,
    position: Point, parent?: Group, opacity = 1) {
    const material = new MeshPhongMaterial({
      color, shininess: 42, opacity, transparent: opacity < 1,
      side: opacity < 1 ? DoubleSide : undefined
    });
    const object = new Mesh(geometry, material);
    object.position.set(...position);
    if (id) {
      object.userData.part = id;
      parts.get(id)!.materials.push(material);
      pickable.push(object);
    }
    (parent ?? (id ? parts.get(id)!.group : frame)).add(object);
    return object;
  }

  function box(id: BenchPart | null, size: Point, color: number, position: Point, parent?: Group) {
    return body(id, new BoxGeometry(...size), color, position, parent);
  }

  box(null, [4.34, .12, 1.54], 0x415c73, [0, -.08, .02]);
  body(null, new BoxGeometry(4.22, 1.33, .1, 8, 4, 1), 0x203951, [0, .86, -.61]);
  for (const x of [-2.15, 2.15]) {
    for (const z of [-.65, .66]) box(null, [.09, .84, .09], 0x7290a2, [x, -.40, z]);
    box(null, [.09, 1.6, .1], 0x71879b, [x, .74, -.65]);
  }
  for (const y of [.20, 1.57]) box(null, [4.4, .055, .14], 0x8aa4b9, [0, y, -.59]);
  box(null, [4.28, .075, .1], 0x354e63, [0, -.58, .65]);

  const modules: {col: number; row: number; group: Group}[] = [];
  const pv = parts.get('pv')!.group;
  pv.position.set(-2.88, 1.01, .68);
  pv.rotation.x = -.28;
  box('pv', [1.56, .07, .09], 0x486479, [0, -.43, -.14]);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const group = new Group();
      group.position.set((col - 1) * .5, row * .63 - .08, 0);
      pv.add(group);
      modules.push({col, row, group});
      body('pv', new BoxGeometry(.46, .59, .08, 4, 6, 1), 0x6d8caa, [0, 0, 0], group);
      for (const x of [-.103, .103]) {
        for (const y of [-.178, 0, .178]) {
          box('pv', [.192, .164, .028], 0x1b437c, [x, y, .064], group);
          box('pv', [.156, .008, .006], 0x64b1e5, [x, y, .083], group);
        }
      }
    }
  }
  const stand = box('pv', [.07, 1.26, .08], 0x607e96, [-2.88, -.12, .6], frame);
  pv.attach(stand);

  const wind = parts.get('wind')!.group;
  wind.position.set(2.96, 0, -.2);
  body('wind', new CylinderGeometry(.05, .09, 2.56, segments), 0x9aaebe, [0, .51, 0]);
  body('wind', new CylinderGeometry(.24, .27, .11, segments), 0x435f76, [0, -.72, 0]);
  box('wind', [.34, .20, .31], 0x5b84a6, [0, 1.81, 0]);
  const rotor = new Group();
  rotor.position.set(0, 1.81, .22);
  wind.add(rotor);
  body('wind', new CylinderGeometry(.12, .12, .14, segments), 0x6babc0, [0, 0, 0], rotor).rotation.x = Math.PI / 2;
  const blade = new Shape();
  blade.moveTo(-.035, .06);
  blade.lineTo(-.09, .35);
  blade.lineTo(-.04, .66);
  blade.lineTo(.025, .69);
  blade.lineTo(.095, .23);
  blade.closePath();
  for (let k = 0; k < 3; k++) {
    body('wind', new ExtrudeGeometry(blade, {depth: .035, bevelEnabled: false}), 0xd4e2e9, [0, 0, .024], rotor)
      .rotation.z = k * 2 * Math.PI / 3;
  }

  function module(id: BenchPart, x: number, color: number, screen: number) {
    body(id, new BoxGeometry(.79, .78, .28, 4, 4, 1), color, [x, .94, -.35]);
    body(id, new BoxGeometry(.54, .31, .036, 4, 4, 1), 0x12283c, [x, 1.06, -.179]);
    box(id, [.41, .125, .016], screen, [x, 1.07, -.147]);
    for (const [offset, terminalColor] of [[-.24, 0xe69767], [.24, 0x98aec6]]) {
      body(id, new CylinderGeometry(.044, .044, .055, 10), terminalColor, [x + offset, .64, -.183])
        .rotation.x = Math.PI / 2;
    }
  }

  module('control', -1.52, 0x546e86, 0x51b9a3);
  module('meter', -.47, 0x567c94, 0x56d5da);
  module('inverter', .58, 0x51758f, 0x7abed4);

  box('battery', [1.03, .38, .61], 0x344962, [-.45, .18, .48]);
  box('battery', [1.06, .055, .63], 0x7b94a9, [-.45, .40, .48]);
  for (const [x, color] of [[-.79, 0xef9271], [-.09, 0x94aabf]]) {
    body('battery', new CylinderGeometry(.06, .06, .066, 10), color, [x, .46, .44]);
  }

  box('load', [.56, .27, .44], 0x4f667c, [1.57, .14, .17]);
  body('load', new CylinderGeometry(.10, .10, .12, 12), 0x8a9cab, [1.57, .32, .17]);
  const lamp = body('load', new CylinderGeometry(.155, .10, .24, segments), 0xead2a1, [1.57, .49, .17]);

  box('grid', [.63, .72, .23], 0x596b85, [1.58, .96, -.38]);
  box('grid', [.39, .23, .035], 0x162b41, [1.58, 1.07, -.242]);
  const gridLight = box('grid', [.24, .06, .022], 0x67cfe2, [1.58, 1.08, -.214]);

  body('pump', new CylinderGeometry(.22, .22, .5, segments), 0x298c80, [1.30, .28, .40])
    .rotation.z = Math.PI / 2;
  body('pump', new CylinderGeometry(.255, .255, .1, segments), 0x749ca4, [1.05, .28, .40])
    .rotation.z = Math.PI / 2;
  box('pump', [.21, .16, .25], 0x3a9e8e, [1.31, .49, .4]);

  const upperBase = 1.35;
  const lowerBase = -.72;
  const tankHeight = .68;
  function tank(x: number, base: number, z: number) {
    body('tanks', new CylinderGeometry(.45, .45, tankHeight, segments, 1, true, .8, 4.65),
      0x68b7d2, [x, base + tankHeight / 2, z], undefined, .46);
    body('tanks', new TorusGeometry(.45, .022, 6, segments), 0x9ad0e1, [x, base + tankHeight, z])
      .rotation.x = Math.PI / 2;
    body('tanks', new CylinderGeometry(.46, .46, .05, segments), 0x4b748c, [x, base, z]);
    return body('tanks', new CylinderGeometry(.414, .414, tankHeight - .045, segments),
      0x2d90be, [x, base, z]);
  }
  const upper = tank(2.83, upperBase, -.05);
  const lower = tank(2.83, lowerBase, .49);
  box('tanks', [.81, .07, .84], 0x6a8194, [2.83, 1.30, -.05]);
  for (const x of [2.46, 3.2]) box('tanks', [.06, 2.04, .07], 0x536d81, [x, .26, -.35]);
  box('tanks', [.18, .13, .18], 0xaacbd8, [2.83, 2.15, -.05]);

  function wire(points: Point[], activeColor: number) {
    const geometry = new BufferGeometry().setFromPoints(points.map(point => new Vector3(...point)));
    const material = new LineBasicMaterial({color: activeColor, linewidth: 3});
    const object = new Line(geometry, material);
    scene.add(object);
    return {object, update(visible: boolean, active: boolean, color = activeColor) {
      object.visible = visible;
      material.color.setHex(active ? color : 0x355469);
    }};
  }

  const pvPath = wire([[-2.52, .64, .63], [-2.22, .31, .29], [-1.75, .31, .29], [-1.75, .63, -.15]], 0xf4c16d);
  const windPath = wire([[2.96, 1.66, -.18], [2.96, -.20, -.18], [1.97, -.20, -.23], [1.97, .22, -.22], [-1.28, .22, -.22], [-1.28, .63, -.15]], 0x71d7cb);
  const dcPath = wire([[-1.30, .66, -.13], [-1.30, .48, -.10], [.34, .48, -.10], [.34, .66, -.13]], 0x75e3b2);
  const batteryPath = wire([[-.09, .46, .44], [-.09, .32, -.08], [.34, .32, -.08], [.34, .50, -.10]], 0x6de5b8);
  const loadPath = wire([[.82, .64, -.13], [.82, .42, .04], [1.33, .42, .04], [1.33, .2, .17]], 0x80caff);
  const gridPath = wire([[.81, .65, -.14], [.98, .64, -.12], [1.23, .64, -.12], [1.40, .70, -.19]], 0x80caff);
  const pumpPath = wire([[-1.28, .64, -.14], [-1.28, .30, .12], [.84, .30, .12], [1.08, .35, .39]], 0x75e3b2);
  const pipe = wire([[2.50, -.40, .49], [2.04, -.40, .49], [2.04, .28, .40], [1.56, .28, .40],
    [1.56, .79, .44], [2.19, .79, .44], [2.19, 2.14, .44], [2.76, 2.14, .02], [2.76, 1.97, .02]], 0x54d7ff);

  return {parts, pickable, rotor, modules, lamp, gridLight, upper, lower, upperBase, lowerBase, tankHeight,
    pvPath, windPath, dcPath, batteryPath, loadPath, gridPath, pumpPath, pipe};
}

export function createRenewableViewer(host: HTMLDivElement, onPart: (id: BenchPart) => void, onLost: () => void) {
  const viewer = createLabViewer(host, buildBench, () => ({
    position: [4.7, 4.2, 10], target: [0, .67, 0], halfHeight: 2.07, halfWidth: 3.82
  }), -.79, onPart, onLost);
  const m = viewer.model;
  let spin = 0;

  return {
    ...viewer,
    update(input: RenewableInput, reading: ReturnType<typeof evaluateRenewableBench>, selected: BenchPart, running: boolean) {
      const visible = visibleBenchParts(input);
      const isPump = input.mode === 'pump';
      const isGrid = input.mode === 'grid';
      const powered = isPump ? reading.pumpW > 0 : reading.generationW > 0 || reading.batteryW > 0;
      for (const [id, {group, materials}] of m.parts) {
        group.visible = visible.includes(id);
        for (const material of materials) material.emissive.setHex(id === selected ? 0x1a472d : 0);
      }
      for (const {col, row, group} of m.modules) group.visible = col < input.series && row < input.parallel;
      m.pvPath.update(visible.includes('pv'), powered && reading.solarW > 0);
      m.windPath.update(visible.includes('wind'), powered && reading.windW > 0);
      m.dcPath.update(!isPump, powered);
      m.batteryPath.update(input.mode === 'island', reading.batteryW !== 0, reading.batteryW < 0 ? 0xf2b76a : 0x6de5b8);
      m.loadPath.update(!isPump, reading.servedW > 0);
      m.gridPath.update(isGrid, input.gridPresent);
      m.pumpPath.update(isPump, reading.pumpW > 0);
      m.pipe.update(isPump, reading.flowLpm > 0);
      m.lamp.material.color.setHex(reading.servedW > 0 ? 0xffd797 : 0x788593);
      m.gridLight.material.color.setHex(input.gridPresent ? 0x64d7dc : 0xcb7669);
      const upperFill = reading.upperL / benchLimits.upperCapacityL;
      const lowerFill = reading.lowerL / benchLimits.waterTotalL;
      m.upper.scale.y = upperFill;
      m.upper.position.y = m.upperBase + m.tankHeight * upperFill / 2;
      m.lower.scale.y = lowerFill;
      m.lower.position.y = m.lowerBase + m.tankHeight * lowerFill / 2;

      const speed = running && reading.windW > 0 ? input.windSpeed : 0;
      if (speed !== spin) {
        spin = speed;
        viewer.animate(spin > 0 ? seconds => { m.rotor.rotation.z += .38 * spin * seconds; } : null);
      }
      viewer.requestDraw();
    }
  };
}
