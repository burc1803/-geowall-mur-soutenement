export class MatrixSolver {
  /**
   * Solves a system of linear equations Ax = B using Gaussian elimination.
   * Modifies A and B in place.
   */
  static solve(A: number[][], B: number[]): number[] {
      const n = B.length;
      const M = A.map((row, i) => [...row, B[i]]);
      
      for (let i = 0; i < n; i++) {
          let maxRow = i;
          for (let k = i + 1; k < n; k++) {
              if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                  maxRow = k;
              }
          }
          [M[i], M[maxRow]] = [M[maxRow], M[i]];
          
          if (Math.abs(M[i][i]) < 1e-12) {
              throw new Error("Matrix is singular or nearly singular");
          }

          for (let k = i + 1; k < n; k++) {
              const c = -M[k][i] / M[i][i];
              for (let j = i; j <= n; j++) {
                  if (i === j) {
                      M[k][j] = 0;
                  } else {
                      M[k][j] += c * M[i][j];
                  }
              }
          }
      }
      
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
          x[i] = M[i][n] / M[i][i];
          for (let k = i - 1; k >= 0; k--) {
              M[k][n] -= M[k][i] * x[i];
          }
      }
      return x;
  }
}

export interface SupportBoundary {
  y: number; // height from top of footing
  v: boolean; // constrain horizontal translation
  theta: boolean; // constrain rotation
}

export interface FEMResult {
  forces: { depth: number; shear: number; moment: number }[];
  reactions: { y: number; Fx: number; Mz: number }[];
  maxShear: number;
  maxMoment: number;
}

export function solveBeamFEM(
  height: number,
  E: number, // Modulus of elasticity (kPa)
  I: number, // Moment of inertia (m^4)
  supports: SupportBoundary[],
  loads: ((y: number) => number)[], // Evaluated pressure q(y) in kN/m at height y from bottom
  numElements: number = 50,
  pointLoads: { y: number; Fx: number; Mz?: number }[] = [] // charges nodales (E01) : y depuis le pied du voile
): FEMResult {
  const L = height / numElements;
  const numNodes = numElements + 1;
  const numDof = numNodes * 2;
  
  const K = Array.from({length: numDof}, () => new Array(numDof).fill(0));
  const F = Array.from({length: numDof}, () => 0);

  // For recovering reactions
  const K_orig = Array.from({length: numDof}, () => new Array(numDof).fill(0));
  const F_orig = Array.from({length: numDof}, () => 0);

  const k_factor = E * I / Math.pow(L, 3);

  for (let i = 0; i < numElements; i++) {
      const y1 = i * L; // distance from bottom
      const y2 = (i + 1) * L;
      
      let q1 = 0;
      let q2 = 0;
      for (const getLoad of loads) {
          q1 += getLoad(y1);
          q2 += getLoad(y2);
      }
      
      // Local element stiffness matrix
      const k_local = [
        [ 12,   6*L,  -12,   6*L ],
        [ 6*L,  4*L*L, -6*L, 2*L*L ],
        [-12,  -6*L,   12,  -6*L ],
        [ 6*L,  2*L*L, -6*L, 4*L*L ]
      ].map(row => row.map(v => v * k_factor));

      // Fixed end forces due to distributed load
      const qu = q1;
      const qt = q2 - q1; // triangle portion
      
      const f1v = qu * L / 2 + qt * 0.15 * L;
      const m1  = qu * L * L / 12 + qt * L * L / 30;
      const f2v = qu * L / 2 + qt * 0.35 * L;
      const m2  = -qu * L * L / 12 - qt * L * L / 20;
      const fe = [f1v, m1, f2v, m2];

      const dofs = [i*2, i*2+1, (i+1)*2, (i+1)*2+1];
      
      for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
              K[dofs[r]][dofs[c]] += k_local[r][c];
              K_orig[dofs[r]][dofs[c]] += k_local[r][c];
          }
          F[dofs[r]] += fe[r];
          F_orig[dofs[r]] += fe[r];
      }
  }

  // Charges ponctuelles et moments appliqués au nœud le plus proche
  for (const pl of pointLoads) {
      const nodeIdx = Math.max(0, Math.min(numNodes - 1, Math.round(pl.y / L)));
      F[nodeIdx * 2] += pl.Fx;
      F_orig[nodeIdx * 2] += pl.Fx;
      if (pl.Mz) {
          F[nodeIdx * 2 + 1] += pl.Mz;
          F_orig[nodeIdx * 2 + 1] += pl.Mz;
      }
  }

  const isConstrained = new Array(numDof).fill(false);
  
  for (const support of supports) {
      const nodeIdx = Math.max(0, Math.min(numNodes - 1, Math.round(support.y / L)));
      if (support.v) isConstrained[nodeIdx * 2] = true;
      if (support.theta) isConstrained[nodeIdx * 2 + 1] = true;
  }

  // Apply constraints to K and F
  for (let i = 0; i < numDof; i++) {
      if (isConstrained[i]) {
          for (let j = 0; j < numDof; j++) {
              K[i][j] = (i === j) ? 1 : 0;
          }
          F[i] = 0;
      }
  }

  const d = MatrixSolver.solve(K, F);

  // Compute support reactions: R = K_orig * d - F_orig
  const reactions: { y: number; Fx: number; Mz: number }[] = [];
  const R_vector = new Array(numDof).fill(0);
  for (let i = 0; i < numDof; i++) {
      let sum = 0;
      for (let j = 0; j < numDof; j++) sum += K_orig[i][j] * d[j];
      R_vector[i] = sum - F_orig[i];
  }

  for (let i = 0; i < numNodes; i++) {
      if (isConstrained[i * 2] || isConstrained[i * 2 + 1]) {
          reactions.push({
              y: i * L,
              Fx: R_vector[i * 2],
              Mz: R_vector[i * 2 + 1]
          });
      }
  }

  // Calculate internal forces along the beam
  const forcesData: { depth: number; shear: number; moment: number }[] = [];
  let maxShear = 0;
  let maxMoment = 0;

  for (let i = 0; i < numElements; i++) {
      const dofs = [i*2, i*2+1, (i+1)*2, (i+1)*2+1];
      const d_el = dofs.map(idx => d[idx]);
      
      const k_local = [
        [ 12,   6*L,  -12,   6*L ],
        [ 6*L,  4*L*L, -6*L, 2*L*L ],
        [-12,  -6*L,   12,  -6*L ],
        [ 6*L,  2*L*L, -6*L, 4*L*L ]
      ].map(row => row.map(v => v * k_factor));

      const y1 = i * L;
      const y2 = (i + 1) * L;
      
      let q1 = 0; let q2 = 0;
      for (const getLoad of loads) { q1 += getLoad(y1); q2 += getLoad(y2); }
      const qt = q2 - q1;
      
      const f1v = q1 * L / 2 + qt * 0.15 * L;
      const m1  = q1 * L * L / 12 + qt * L * L / 30;
      // Evaluate just at node 1 (bottom of element)
      const F_el_1 = [0, 0];
      for (let c = 0; c < 4; c++) {
          F_el_1[0] += k_local[0][c] * d_el[c];
          F_el_1[1] += k_local[1][c] * d_el[c];
      }
      F_el_1[0] -= f1v;
      F_el_1[1] -= m1;

      // Depth from top = height - y1
      const depth = height - y1;
      const V = F_el_1[0]; // Shear
      const M = F_el_1[1]; // Moment

      forcesData.push({ depth, shear: V, moment: M });
      
      if (Math.abs(V) > maxShear) maxShear = Math.abs(V);
      if (Math.abs(M) > maxMoment) maxMoment = Math.abs(M);
  }
  
  // Add the final node
  forcesData.push({ depth: 0, shear: 0, moment: 0 }); // Roughly zero at top

  return { forces: forcesData, reactions, maxShear, maxMoment };
}
