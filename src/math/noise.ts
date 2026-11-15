/**
 * Welwitschia Lunar - Gerador Matemático de Ruído e Crateras Lunares
 * Implementação de Ruído Simplex 2D e modelagem morfológica de crateras de impacto.
 */

// Tabela de permutação de gradientes para Simplex Noise
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

const p = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];

const perm = new Array(512);
const permMod12 = new Array(512);
for (let i = 0; i < 512; i++) {
  perm[i] = p[i & 255];
  permMod12[i] = perm[i] % 12;
}

/** Ruído Simplex 2D normalizado entre -1 e 1 */
export function simplex2D(xin: number, yin: number): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;

  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;

  let i1 = 0;
  let j1 = 0;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;

  const ii = i & 255;
  const jj = j & 255;
  const gi0 = permMod12[ii + perm[jj]];
  const gi1 = permMod12[ii + i1 + perm[jj + j1]];
  const gi2 = permMod12[ii + 1 + perm[jj + 1]];

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) {
    t0 *= t0;
    n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) {
    t1 *= t1;
    n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) {
    t2 *= t2;
    n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
  }

  return 70.0 * (n0 + n1 + n2);
}

/** Fractal Brownian Motion (fBm) multi-oitavas */
export function fbm2D(x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5): number {
  let total = 0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += simplex2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return total / maxValue;
}

export interface CraterDefinition {
  x: number;
  z: number;
  radius: number;
  depth: number;
  rimHeight: number;
  rimWidth: number;
}

/**
 * Lista de crateras de impacto principais no Polo Sul Lunar
 * Inclui cratera Shackleton próxima, crateras da rota NE e a cratera onde o LRO-Scout pousou
 */
export const LUNAR_CRATERS: CraterDefinition[] = [
  // Borda da Cratera Shackleton ao Sul/Sudoeste
  { x: -500, z: -600, radius: 450, depth: 85, rimHeight: 28, rimWidth: 90 },
  // Cratera intermediária de impacto no trajeto
  { x: 550, z: 420, radius: 180, depth: 32, rimHeight: 11, rimWidth: 45 },
  // Cratera lateral que exige contorno ou direção cautelosa
  { x: 300, z: 850, radius: 240, depth: 42, rimHeight: 14, rimWidth: 55 },
  // Cratera aos ~1300m (início da tempestade aos 500m do alvo)
  { x: 1050, z: 1150, radius: 210, depth: 38, rimHeight: 12, rimWidth: 50 },
  // Cratera do Alvo LRO-Scout (raio 140m, LRO está na borda a ~1414, 1414)
  { x: 1460, z: 1460, radius: 140, depth: 35, rimHeight: 14, rimWidth: 35 },
  // Pequenas crateras secundárias de regolito
  { x: -200, z: 250, radius: 70, depth: 12, rimHeight: 3.5, rimWidth: 18 },
  { x: 800, z: 1600, radius: 110, depth: 20, rimHeight: 6, rimWidth: 25 },
  { x: 1700, z: 1100, radius: 160, depth: 28, rimHeight: 9, rimWidth: 38 }
];

/**
 * Calcula a deformação de altitude causada por uma cratera
 * Modelo morfológico geológico lunar:
 * - Depressão côncava esférica/parabólica no interior (dist < radius)
 * - Borda elevada de material ejetado (rim) em dist ~= radius
 * - Decaimento suave externo de ejecta
 */
export function calculateCraterHeight(x: number, z: number, crater: CraterDefinition): number {
  const dx = x - crater.x;
  const dz = z - crater.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > crater.radius + crater.rimWidth * 2.5) {
    return 0; // Fora do raio de influência do impacto
  }

  // 1. Interior da cratera (depressão parabólica)
  if (dist < crater.radius) {
    const normDist = dist / crater.radius;
    // Borda interna sobe suavemente até o topo da borda
    const floor = -crater.depth * (1.0 - normDist * normDist);
    const rimBlend = Math.pow(normDist, 3) * crater.rimHeight;
    return floor + rimBlend;
  }

  // 2. Borda elevada e manto de ejetos externo
  const distFromRim = dist - crater.radius;
  if (distFromRim < crater.rimWidth) {
    // Pico da borda caindo suavemente
    const t = distFromRim / crater.rimWidth;
    // Curva hermite cúbica suave
    const h = crater.rimHeight * (1.0 - (3 * t * t - 2 * t * t * t));
    return h;
  }

  // 3. Decaimento suave dos ejetos distantes
  const outerDist = distFromRim - crater.rimWidth;
  const outerMax = crater.rimWidth * 1.5;
  if (outerDist < outerMax) {
    const t = 1.0 - (outerDist / outerMax);
    return crater.rimHeight * 0.15 * Math.max(0, t * t);
  }

  return 0;
}

/**
 * Função mestra de altura do relevo lunar em qualquer coordenada (x, z).
 * Garante:
 * - Base Welwitschia em platô plano suave em (0, 0)
 * - Relevo de colinas onduladas do Polo Sul
 * - Crateras reais com bordas elevadas
 */
export function getLunarHeight(x: number, z: number): number {
  // Fator de suavização da Base Welwitschia (raio de 60m plano para os módulos)
  const distFromBase = Math.sqrt(x * x + z * z);
  let basePlateauWeight = 1.0;
  if (distFromBase < 40) {
    basePlateauWeight = 0.0;
  } else if (distFromBase < 90) {
    const t = (distFromBase - 40) / 50;
    basePlateauWeight = t * t * (3 - 2 * t);
  }

  // 1. Relevo de colinas em grande escala (ondulações amplas)
  const macroHills = fbm2D(x * 0.0012, z * 0.0012, 3) * 35.0;

  // 2. Micro-rugosidade do regolito
  const microRegolith = simplex2D(x * 0.015, z * 0.015) * 1.8 + simplex2D(x * 0.05, z * 0.05) * 0.5;

  let totalHeight = (macroHills + microRegolith) * basePlateauWeight;

  // 3. Aplicação das crateras de impacto
  for (let i = 0; i < LUNAR_CRATERS.length; i++) {
    totalHeight += calculateCraterHeight(x, z, LUNAR_CRATERS[i]);
  }

  return totalHeight;
}
