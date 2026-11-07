import {
  BoxGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshPhongMaterial,
  RingGeometry, TorusGeometry
} from 'three';
import type {BufferGeometry, Object3D, Scene} from 'three';
import {createLabViewer} from './lab-viewer';

export const partIds = ['casing', 'turbine', 'coupling', 'rotor', 'stator', 'terminals'] as const;
export type PartId = typeof partIds[number];

interface ViewState {
  selected: PartId;
  exploded: boolean;
  spinning: boolean;
}

const tau = 2 * Math.PI;
const openingStart = .65;
const shellSweep = tau - 2.5;
const offsets = {
  casing: [-2.8, 0], turbine: [.10, 0], coupling: [.27, 0],
  rotor: [.5, 0], stator: [3.18, 0], terminals: [3.18, .55]
} as const;

export function buildTurbineAssembly(scene: Scene | Group, lightweight: boolean) {
  const segments = lightweight ? 16 : 32;
  const blades = lightweight ? 12 : 18;
  const positions = {
    casing: [-1.72, 0], turbine: [-1.72, 0], coupling: [-.04, 0],
    rotor: [1.49, 0], stator: [1.49, 0], terminals: [1.49, 1.06]
  } as const;
  const parts = new Map<PartId, {group: Group; materials: MeshPhongMaterial[]}>();
  const pickable: Object3D[] = [];

  for (const id of partIds) {
    const group = new Group();
    const [x, y] = positions[id];
    group.position.set(x, y, 0);
    scene.add(group);
    parts.set(id, {group, materials: []});
  }

  function mesh(id: PartId, geometry: BufferGeometry, color: number, x = 0, y = 0, z = 0) {
    const {group, materials} = parts.get(id)!;
    const material = new MeshPhongMaterial({color, shininess: 65, side: DoubleSide});
    const object = new Mesh(geometry, material);
    object.position.set(x, y, z);
    object.userData.part = id;
    materials.push(material);
    pickable.push(object);
    group.add(object);
    return object;
  }

  function cylinder(id: PartId, radius: number, length: number, color: number, x = 0) {
    const object = mesh(id, new CylinderGeometry(radius, radius, length, segments), color, x);
    object.rotation.z = -Math.PI / 2;
  }

  function shell(id: PartId, inner: number, outer: number, length: number, color: number) {
    for (const radius of [inner, outer]) {
      const geometry = new CylinderGeometry(radius, radius, length, segments, 1, true, openingStart, shellSweep);
      mesh(id, geometry, color).rotation.z = -Math.PI / 2;
    }
    for (const x of [-length / 2, length / 2]) {
      const geometry = new RingGeometry(inner, outer, segments, 1, openingStart, shellSweep);
      // Match the angular origin of the cylinder's open sector.
      geometry.rotateZ(Math.PI);
      mesh(id, geometry, color, x).rotation.y = Math.PI / 2;
    }
    for (const angle of [openingStart, openingStart + shellSweep]) {
      const radius = (inner + outer) / 2;
      const lip = mesh(id, new BoxGeometry(length, outer - inner, .035), color,
        0, -Math.sin(angle) * radius, Math.cos(angle) * radius);
      lip.rotation.x = angle + Math.PI / 2;
    }
  }

  shell('casing', .85, .99, 2.7, 0x467a9e);
  for (const x of [-1.1, 1.1]) {
    const collar = new CylinderGeometry(1.065, 1.065, .17, segments, 1, true, openingStart, shellSweep);
    mesh('casing', collar, 0x81a9c7, x).rotation.z = -Math.PI / 2;
  }
  mesh('casing', new CylinderGeometry(.27, .32, .58, 24), 0x648eaf, -.84, .94, -.34);
  mesh('casing', new CylinderGeometry(.39, .39, .12, 24), 0x9fc2d5, -.84, 1.27, -.34);

  cylinder('turbine', .17, 3.04, 0xadc3d1);
  for (const [index, radius] of [.44, .59, .73].entries()) {
    const x = -.77 + .76 * index;
    cylinder('turbine', radius - .14, .19, 0x9b7951, x);
    for (let blade = 0; blade < blades; blade++) {
      const angle = blade * tau / blades;
      const fin = mesh('turbine', new BoxGeometry(.22, .22, .08), 0xe8b56b, x,
        (radius - .085) * Math.cos(angle), (radius - .085) * Math.sin(angle));
      fin.rotation.set(angle, .28, 0, 'XYZ');
    }
  }

  cylinder('coupling', .31, .47, 0x92aabd);
  for (const x of [-.17, .17]) {
    cylinder('coupling', .39, .1, 0x507187, x);
    for (let bolt = 0; bolt < 6; bolt++) {
      const a = bolt * tau / 6;
      const head = mesh('coupling', new CylinderGeometry(.048, .048, .055, 6), 0xc4d5df,
        x * 1.35, .31 * Math.cos(a), .31 * Math.sin(a));
      head.rotation.z = Math.PI / 2;
    }
  }

  cylinder('rotor', .13, 2.64, 0xb4c8d9);
  cylinder('rotor', .49, 1.91, 0x365674);
  for (let rib = 0; rib < 12; rib++) {
    const angle = rib * tau / 12;
    const bar = mesh('rotor', new BoxGeometry(1.84, .085, .08), 0x4bc4c2,
      0, .49 * Math.cos(angle), .49 * Math.sin(angle));
    bar.rotation.x = angle;
  }

  shell('stator', .65, .92, 2.44, 0x4f7395);
  for (const x of [-.98, .98]) {
    const winding = new TorusGeometry(.69, .07, lightweight ? 5 : 10, segments, shellSweep);
    winding.rotateZ(openingStart + Math.PI);
    mesh('stator', winding, 0xf4a367, x).rotation.y = Math.PI / 2;
  }
  for (let winding = 1; winding < 18; winding++) {
    const angle = openingStart + shellSweep * winding / 18;
    const coil = mesh('stator', new BoxGeometry(1.93, .08, .085), 0xcc834a,
      0, -.68 * Math.sin(angle), .68 * Math.cos(angle));
    coil.rotation.x = angle + Math.PI / 2;
  }

  mesh('terminals', new BoxGeometry(.86, .38, .68), 0x507798, 0, 0, -.32);
  mesh('terminals', new BoxGeometry(.9, .10, .71), 0x91aec4, 0, .23, -.32);
  for (const x of [-.26, 0, .26]) {
    mesh('terminals', new CylinderGeometry(.056, .065, .14, 12), 0xe2b76f, x, .32, -.32);
  }

  return {parts, positions, pickable};
}

export function createTurbineViewer(host: HTMLDivElement, onPart: (id: PartId) => void, onLost: () => void) {
  let exploded = false;
  let spinning = false;
  const viewer = createLabViewer(host, buildTurbineAssembly, () => ({
    position: [3.5, 3.5, 10], target: [exploded ? .18 : 0, .1, 0],
    halfHeight: 2.1, halfWidth: exploded ? 6.7 : 3.75
  }), -1.17, onPart, onLost);
  const {parts, positions} = viewer.model;

  function rotateShaft(advance: number) {
    for (const id of ['turbine', 'coupling', 'rotor'] as const) {
      parts.get(id)!.group.rotation.x += advance * 1.45;
    }
  }

  return {
    ...viewer,
    setState(next: ViewState) {
      const reframe = next.exploded !== exploded;
      exploded = next.exploded;
      if (next.spinning !== spinning) {
        spinning = next.spinning;
        viewer.animate(spinning ? rotateShaft : null);
      }
      for (const [id, {group, materials}] of parts) {
        const [x, y] = positions[id];
        const [dx, dy] = offsets[id];
        group.position.set(x + (exploded ? dx : 0), y + (exploded ? dy : 0), 0);
        for (const material of materials) material.emissive.setHex(id === next.selected ? 0x1c4f28 : 0x000000);
      }
      if (reframe) viewer.reset();
      viewer.requestDraw();
    }
  };
}
