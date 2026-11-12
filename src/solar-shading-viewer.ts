import {
  ArrowHelper, BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, EdgesGeometry, Group,
  Line, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  PlaneGeometry, SphereGeometry, Vector3
} from 'three';
import type {Scene} from 'three';
import {createLabViewer} from './lab-viewer';
import {
  groundShadow, modulePositions, panelPoint, shadeGround, shadeModule, solarPosition
} from './solar-shading';
import type {evaluateShade, ModuleId, Point2, Point3, ShadeScenario} from './solar-shading';

const skyRadius = 4.25;

function box(parent: Group | Scene, size: Point3, position: Point3, color: number) {
  const mesh = new Mesh(new BoxGeometry(...size), new MeshLambertMaterial({color}));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function segments(parent: Group | Scene, points: Point3[], color: number, opacity = 1) {
  const line = new LineSegments(new BufferGeometry().setFromPoints(points.map(point => new Vector3(...point))),
    new LineBasicMaterial({color, opacity, transparent: opacity < 1}));
  parent.add(line);
  return line;
}

function projection(parent: Group | Scene, color: number, opacity: number, renderOrder: number) {
  const positions = new BufferAttribute(new Float32Array(24 * 9), 3);
  const geometry = new BufferGeometry().setAttribute('position', positions);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({color, opacity, transparent: opacity < 1, side: DoubleSide, depthWrite: false}));
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = renderOrder;
  parent.add(mesh);
  return {
    update(polygon: Point2[], toWorld: (point: Point2) => Point3) {
      mesh.visible = polygon.length >= 3;
      if (!mesh.visible) return;
      positions.array.fill(0);
      let vertex = 0;
      for (let i = 1; i + 1 < polygon.length; i++) {
        for (const point of [polygon[0], polygon[i], polygon[i + 1]]) positions.setXYZ(vertex++, ...toWorld(point));
      }
      positions.needsUpdate = true;
      geometry.setDrawRange(0, vertex);
    }
  };
}

function buildScene(scene: Scene) {
  const {halfWidth, halfDepth} = shadeGround;
  const ground = box(scene, [halfWidth * 2, .24, halfDepth * 2], [0, -.12, 0], 0x20303b);
  ground.renderOrder = -10;
  const groundLines: Point3[] = [];
  for (let x = -halfWidth; x <= halfWidth; x++) groundLines.push([x, .004, -halfDepth], [x, .004, halfDepth]);
  for (let z = -halfDepth; z <= halfDepth; z++) groundLines.push([-halfWidth, .004, z], [halfWidth, .004, z]);
  segments(scene, groundLines, 0x637f93, .38).renderOrder = -9;
  const floorShadow = projection(scene, 0x050d16, .86, -7);
  const arrayShadow = projection(scene, 0x081522, .52, -8);

  const compass = new Group();
  compass.position.set(-3.25, .016, -.9);
  compass.add(new ArrowHelper(new Vector3(0, 0, -1), new Vector3(), 1.05, 0x89cce0, .24, .15));
  segments(compass, [[-.09, 0, -1.13], [-.09, 0, -1.39], [-.09, 0, -1.39], [.09, 0, -1.13], [.09, 0, -1.13], [.09, 0, -1.39]], 0xb3e3f1);
  scene.add(compass);

  const table = new Group();
  scene.add(table);
  const {width, length, blocks} = shadeModule;
  box(table, [.08, 2 * length + .18, .13], [-.85, 0, -.132], 0x59788a);
  box(table, [.08, 2 * length + .18, .13], [.85, 0, -.132], 0x59788a);
  const panels = modulePositions.map(({id, u, v}) => {
    const module = new Group();
    module.position.set(u, v, 0);
    table.add(module);
    box(module, [width + .035, length + .035, .08], [0, 0, -.042], 0xa6b6c2);
    const glass = new Mesh(new PlaneGeometry(width, length), new MeshBasicMaterial({color: 0x23547a, side: DoubleSide}));
    glass.userData.part = id;
    glass.renderOrder = 1;
    module.add(glass);
    const cellLines: Point3[] = [];
    for (let column = 1; column < 6; column++) {
      const x = width * (column / 6 - .5);
      cellLines.push([x, -length / 2, .002], [x, length / 2, .002]);
    }
    for (let row = 1; row < 12; row++) {
      const y = length * (row / 12 - .5);
      cellLines.push([-width / 2, y, .002], [width / 2, y, .002]);
    }
    segments(module, cellLines, 0x8fc1df, .5).renderOrder = 2;
    const shadow = projection(module, 0x050e18, .87, 3);
    const outlines = Array.from({length: blocks}, (_, index) => {
      const left = width * (index / blocks - .5) + .01;
      const right = width * ((index + 1) / blocks - .5) - .01;
      const bottom = -length / 2 + .01;
      const top = length / 2 - .01;
      const line = segments(module, [[left, bottom, .009], [right, bottom, .009], [right, bottom, .009], [right, top, .009],
        [right, top, .009], [left, top, .009], [left, top, .009], [left, bottom, .009]], 0xffc769);
      line.renderOrder = 4;
      return line;
    });
    const selectedFrame = new LineSegments(new EdgesGeometry(new PlaneGeometry(width + .032, length + .032)),
      new LineBasicMaterial({color: 0x84ff9e}));
    selectedFrame.position.z = .012;
    selectedFrame.renderOrder = 5;
    module.add(selectedFrame);
    return {id, glass, shadow, outlines, selectedFrame};
  });

  const supports = [-.85, .85].flatMap(u => [-1.4, 1.4].map(v => {
    const leg = box(scene, [.095, 1, .095], [0, 0, 0], 0x6a8699);
    const base = box(scene, [.34, .065, .34], [0, .0325, 0], 0x6b7a83);
    return {u, v, leg, base};
  }));

  const obstacle = new Group();
  const prism = box(obstacle, [1, 1, 1], [0, .5, 0], 0x9b7451);
  const edge = new LineSegments(new EdgesGeometry(prism.geometry), new LineBasicMaterial({color: 0xdfb681}));
  edge.position.copy(prism.position);
  obstacle.add(edge);
  scene.add(obstacle);

  const sun = new Mesh(new SphereGeometry(.185, 16, 10), new MeshBasicMaterial({color: 0xffcf70}));
  scene.add(sun);
  const track = new Line(new BufferGeometry(), new LineBasicMaterial({color: 0xdca75d, transparent: true, opacity: .66}));
  scene.add(track);
  const rays = [-.45, 0, .45].map(offset => {
    const arrow = new ArrowHelper(new Vector3(0, -1, 0), new Vector3(), 1.5, 0xffca73, .2, .09);
    scene.add(arrow);
    return {arrow, offset};
  });

  return {scene, pickable: panels.map(panel => panel.glass), table, panels, supports, floorShadow, arrayShadow, obstacle, sun, track, rays};
}

export function createSolarShadingViewer(host: HTMLDivElement, select: (module: ModuleId) => void, onLost: () => void) {
  let overhead = false;
  const viewer = createLabViewer(host, buildScene, () => overhead ? {
    position: [0, 16, .001], target: [0, 0, 0], halfWidth: 6.2, halfHeight: 5.35
  } : {
    position: [7.8, 12, 8.8], target: [.35, 1.65, -.15], halfWidth: 4.75, halfHeight: 3.08
  }, -.26, select, onLost);
  const model = viewer.model;
  const matrix = new Matrix4();
  const rayDirection = new Vector3();
  let trackKey = '';

  return {
    ...viewer,
    setOverhead(value: boolean) {
      overhead = value;
      viewer.reset();
    },
    update(scenario: ShadeScenario, reading: ReturnType<typeof evaluateShade>, selected: ModuleId, showBlocks: boolean) {
      const {frame, daylight, object} = reading;
      model.table.position.set(...frame.origin);
      matrix.makeBasis(new Vector3(...frame.u), new Vector3(...frame.v), new Vector3(...frame.normal));
      model.table.quaternion.setFromRotationMatrix(matrix);
      for (const {u, v, leg, base} of model.supports) {
        const [x, y, z] = panelPoint(frame, u, v);
        const height = y - .13;
        leg.scale.y = height;
        leg.position.set(x, height / 2, z);
        base.position.set(x, .0325, z);
      }
      for (const [index, module] of reading.modules.entries()) {
        const panel = model.panels[index];
        panel.shadow.update(module.polygon, ([u, v]) => [u - module.u, v - module.v, .006]);
        panel.selectedFrame.visible = module.id === selected;
        panel.glass.material.color.setHex(daylight ? 0x23547a : 0x152737);
        panel.outlines.forEach((line, block) => {line.visible = showBlocks && module.blocks[block];});
      }

      model.obstacle.visible = !!object;
      if (object) {
        model.obstacle.position.set(object.east, 0, object.south);
        model.obstacle.scale.set(object.width, object.height, object.depth);
        model.obstacle.rotation.y = -object.angle;
      }
      model.floorShadow.update(object ? groundShadow(object.vertices, reading.sun.direction) : [], ([x, z]) => [x, .012, z]);
      const halfU = shadeModule.width + .03;
      const halfV = shadeModule.length + .03;
      const corners = [[-halfU, -halfV], [halfU, -halfV], [halfU, halfV], [-halfU, halfV]];
      model.arrayShadow.update(groundShadow(corners.map(([u, v]) => panelPoint(frame, u, v)), reading.sun.direction), ([x, z]) => [x, .01, z]);

      const key = `${scenario.date}/${scenario.latitude}`;
      if (key !== trackKey) {
        trackKey = key;
        const points: Vector3[] = [];
        for (let minute = 0; minute <= 1440; minute += 15) {
          const sun = solarPosition(scenario.latitude, scenario.date, minute);
          if (sun.altitude > 0) points.push(new Vector3(...sun.direction).multiplyScalar(skyRadius).add(new Vector3(0, .25, 0)));
        }
        model.track.geometry.dispose();
        model.track.geometry = new BufferGeometry().setFromPoints(points);
      }
      (model.scene.background as Color).setHex(daylight ? 0x081724 : 0x070e19);
      model.sun.visible = daylight;
      model.sun.position.set(...reading.sun.direction).multiplyScalar(skyRadius).y += .25;
      rayDirection.set(...reading.sun.direction).negate();
      for (const {arrow, offset} of model.rays) {
        arrow.visible = daylight && scenario.dni > 0;
        arrow.position.copy(model.sun.position).addScaledVector(rayDirection, .43);
        arrow.position.x += offset * -rayDirection.z;
        arrow.position.z += offset * rayDirection.x;
        arrow.setDirection(rayDirection);
        arrow.setLength(1.6, .2, .08);
      }
      viewer.requestDraw();
    }
  };
}
