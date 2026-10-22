// MIKO - shared materials: shell fur (InstancedMesh, one instance per shell) + soft rim light for a fuzzy toon look.
import * as THREE from 'three';

// shared uniforms so day/night can retint every rim at once
export const RIM = { color: { value: new THREE.Color(0x8fa8ff) }, strength: { value: 0.6 } };

const HASH = `
float furHash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }`;

function addRim(shader, amount) {
  shader.uniforms.uRimColor = RIM.color;
  shader.uniforms.uRimStrength = RIM.strength;
  shader.uniforms.uRimAmount = { value: amount };
  shader.fragmentShader = 'uniform vec3 uRimColor; uniform float uRimStrength; uniform float uRimAmount;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.2);
      totalEmissiveRadiance += uRimColor * rim * uRimStrength * uRimAmount; }`);
}

// smooth body material ("shaved" lion-cut fur): standard + soft rim + faint velvet noise
export function skinMaterial(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.85, metalness: 0, map: opts.map || null });
  m.onBeforeCompile = sh => addRim(sh, opts.rim ?? 0.55);
  m.customProgramCacheKey = () => 'skin' + (opts.rim ?? 0.55);
  return m;
}

// shell fur: shells = number of extra layers, len = fur length (m), density = strands across uv
export function furMesh(geometry, o) {
  const shells = Math.max(0, o.shells | 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, map: o.map || null });
  const U = {
    uShells: { value: Math.max(1, shells) }, uLen: { value: o.len }, uDensity: { value: o.density || new THREE.Vector2(90, 45) },
    uRoot: { value: new THREE.Color(o.root) }, uTip: { value: new THREE.Color(o.tip) }, uGravity: { value: o.gravity ?? 0.25 },
    uPuff: { value: 1.0 }, uWind: { value: 0 }, uCell: { value: o.cell || 0.0032 },
  };
  mat.userData.fur = U;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    addRim(sh, o.rim ?? 1.0);
    sh.vertexShader = 'uniform float uShells; uniform float uLen; uniform float uGravity; uniform float uPuff; uniform float uWind;\nvarying float vShell; varying vec2 vFurUv; varying vec3 vFurP;\n' + sh.vertexShader;
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float shF = float(gl_InstanceID) / uShells;
      #else
        float shF = 0.0;
      #endif
      vShell = shF; vFurUv = uv; vFurP = position;
      transformed += normal * uLen * uPuff * shF;
      transformed.y -= uGravity * uLen * shF * shF;
      transformed.x += sin(uWind + position.y * 30.0) * uLen * 0.25 * shF * shF;`);
    sh.fragmentShader = 'uniform float uShells; uniform vec2 uDensity; uniform vec3 uRoot; uniform vec3 uTip;\nvarying float vShell; varying vec2 vFurUv; varying vec3 vFurP; uniform float uCell;\n' + HASH + '\n' + sh.fragmentShader;
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        // latitude bands: fewer strands per row near the poles, so they never pinch together
        float rows = uDensity.y; float row = floor(vFurUv.y * rows);
        float nRow = max(3.0, floor(uDensity.x * sin(3.14159265 * (row + 0.5) / rows)));
        vec2 cell = vec2(vFurUv.x * nRow + furHash(vec2(row, 3.7)) * 7.0, vFurUv.y * rows);
        vec2 id = vec2(mod(floor(cell.x), nRow), row); vec2 f = fract(cell) - 0.5;
        f += (vec2(furHash(id + 1.3), furHash(id + 9.1)) - 0.5) * 0.35;
        float r = furHash(id); float len = mix(0.45, 1.0, r);
        if (vShell > 0.001) {
          float rad = (1.0 - vShell / len) * 0.72;
          if (vShell > len || length(f) > rad) discard;
        }
        vec3 c = mix(uRoot, uTip, smoothstep(0.0, 1.0, vShell));
        c *= mix(0.92, 1.06, furHash(id + 7.0));
        diffuseColor.rgb *= c;
        diffuseColor.rgb *= mix(0.78, 1.0, vShell);   // self-shadow at the roots
      }`);
  };
  mat.customProgramCacheKey = () => 'fur' + (o.rim ?? 1.0);
  const n = shells + 1;
  const mesh = new THREE.InstancedMesh(geometry, mat, n);
  const I = new THREE.Matrix4();
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, I);
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.userData.fur = U;
  return mesh;
}
