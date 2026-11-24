import * as THREE from 'three';

/** Batch only leaf meshes directly owned by this static group. Animated child
 * groups retain their own transforms and independently editable materials. */
export function batchStaticBoxes(root: THREE.Group, geometry: THREE.BufferGeometry) {
  const groups = new Map<string, THREE.Mesh[]>();
  for (const child of [...root.children]) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || child.geometry !== geometry || Array.isArray(child.material) || child.children.length || child.userData.animated || !child.visible) continue;
    const key = `${child.material.id}:${child.castShadow}:${child.receiveShadow}:${child.renderOrder}`;
    const meshes = groups.get(key) ?? []; meshes.push(child); groups.set(key, meshes);
  }
  let instances = 0, batches = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0], batch = new THREE.InstancedMesh(geometry, first.material, meshes.length);
    batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow; batch.renderOrder = first.renderOrder;
    meshes.forEach((mesh, i) => { mesh.updateMatrix(); batch.setMatrixAt(i, mesh.matrix); root.remove(mesh); });
    batch.computeBoundingSphere(); root.add(batch); batches++; instances += meshes.length;
  }
  return { instances, batches, saved: instances - batches };
}
