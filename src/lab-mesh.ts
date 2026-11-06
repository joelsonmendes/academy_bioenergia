import {BufferGeometry, Float32BufferAttribute} from 'three';

export function surface(rows: number, columns: number, vertex: (u: number, v: number) => [number, number, number]) {
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
