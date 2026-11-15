/**
 * Welwitschia Lunar - Gerador de Texturas Procedurais em Canvas
 * 100% Offline-First: Sem necessidade de carregar imagens externas via rede.
 */

import * as THREE from 'three';

/** Gera textura do lado diurno da Terra vista do horizonte do Polo Sul Lunar */
export function createEarthDayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Oceanos azuis profundos e vibrantes
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#0d2b45');
  oceanGrad.addColorStop(0.3, '#104f7a');
  oceanGrad.addColorStop(0.7, '#0b3954');
  oceanGrad.addColorStop(1, '#071f33');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Áreas costeiras mais rasas
  ctx.fillStyle = 'rgba(32, 178, 170, 0.25)';
  const drawShallows = (cx: number, cy: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  drawShallows(520, 260, 105, 130);
  drawShallows(720, 180, 150, 115);
  drawShallows(260, 190, 100, 95);
  drawShallows(330, 350, 80, 120);

  // 2. Continentes procedurais estilizados
  ctx.fillStyle = '#2e5a27';
  const drawContinent = (cx: number, cy: number, w: number, h: number, seed: number) => {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const rOffset = Math.sin(a * 5 + seed) * 18 + Math.cos(a * 9 + seed) * 10;
      const rx = (w / 2 + rOffset) * Math.cos(a);
      const ry = (h / 2 + rOffset) * Math.sin(a);
      const px = cx + rx;
      const py = cy + ry;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  drawContinent(520, 260, 180, 230, 1.2);
  ctx.fillStyle = '#bfa15f';
  drawContinent(515, 210, 130, 80, 2.1);
  drawContinent(535, 330, 55, 60, 1.8);

  ctx.fillStyle = '#355e3b';
  drawContinent(720, 180, 260, 200, 2.7);

  ctx.fillStyle = '#2c532d';
  drawContinent(260, 190, 170, 160, 3.5);
  drawContinent(330, 350, 130, 210, 4.1);

  ctx.fillStyle = '#a0522d';
  drawContinent(840, 370, 100, 75, 5.3);

  // 3. Calotas Polares
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 38);
  ctx.fillRect(0, 474, 1024, 38);

  // 4. Turbilhões e faixas de nuvens
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let y = 50; y < 460; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 25) {
      const ny = y + Math.sin(x * 0.02 + y * 0.05) * 20 + Math.cos(x * 0.045) * 14;
      ctx.lineTo(x, ny);
    }
    ctx.lineTo(1024, y + 22);
    ctx.lineTo(0, y + 22);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Gera textura do lado noturno da Terra */
export function createEarthNightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, 1024, 512);

  const drawCityLights = (cx: number, cy: number, count: number, radius: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const intensity = Math.random() * 0.8 + 0.2;

      ctx.fillStyle = `rgba(255, 214, 120, ${intensity})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  };

  drawCityLights(500, 170, 200, 50);
  drawCityLights(270, 180, 250, 60);
  drawCityLights(780, 210, 280, 70);
  drawCityLights(530, 360, 80, 30);
  drawCityLights(340, 370, 90, 35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Gera mapa de relevo/bump procedural de ALTA FREQUÊNCIA para o regolito lunar */
export function createHighResRegolithBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 1024, 1024);

  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 55;
    const val = Math.min(255, Math.max(0, 128 + grain));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);

  for (let c = 0; c < 450; c++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 1024;
    const cr = 2 + Math.random() * 9;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, '#2b2b2b');
    grad.addColorStop(0.65, '#5c5c5c');
    grad.addColorStop(1, '#b8b8b8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 1;
  for (let l = 0; l < 80; l++) {
    const x1 = Math.random() * 1024;
    const y1 = Math.random() * 1024;
    const len = 4 + Math.random() * 12;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);
  return texture;
}

/** Gera Normal Map procedural de alta resolução (1024x1024) para micro-sombras sob luz a 5° */
export function createHighResRegolithNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Normal padrão voltada para Z (0.5, 0.5, 1.0) -> RGB(128, 128, 255)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);

  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const nx = (Math.random() - 0.5) * 35;
    const ny = (Math.random() - 0.5) * 35;
    data[i] = Math.min(255, Math.max(0, 128 + nx));
    data[i + 1] = Math.min(255, Math.max(0, 128 + ny));
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Micro-crateras com relevo normal vetorial
  for (let c = 0; c < 280; c++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 1024;
    const cr = 3 + Math.random() * 12;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, '#5050ff');
    grad.addColorStop(0.5, '#7070ff');
    grad.addColorStop(0.9, '#a090ff');
    grad.addColorStop(1, '#8080ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);
  return texture;
}

/** Gera Roughness Map procedural para variação de rugosidade no regolito e rochas */
export function createHighResRegolithRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e5e5e5'; // Alta rugosidade geral (~0.9)
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = 220 + (Math.random() - 0.5) * 45;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(80, 80);
  return texture;
}

/** Gera textura de depósito de gelo lunar cristalino nas crateras permanentemente sombreadas */
export function createIceDepositTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#b8dcfe');
  grad.addColorStop(0.5, '#90c5fe');
  grad.addColorStop(1, '#60a5fa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Fraturas de gelo cristalino
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

/** Gera textura para os painéis solares verticais */
export function createSolarPanelTexture(dusty: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = dusty ? '#2e3845' : '#0a1d37';
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = dusty ? '#5a626a' : '#d4af37';
  ctx.lineWidth = 2;

  const rows = 16;
  const cols = 6;
  const rh = 512 / rows;
  const cw = 256 / cols;

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rh);
    ctx.lineTo(256, r * rh);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, 512);
    ctx.stroke();
  }

  if (dusty) {
    ctx.fillStyle = 'rgba(120, 125, 130, 0.65)';
    ctx.fillRect(0, 0, 256, 512);

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 512;
      const r = 20 + Math.random() * 50;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(150, 155, 160, 0.85)');
      grad.addColorStop(1, 'rgba(100, 105, 110, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

/** Gera o emblema iluminado estilizado da planta Welwitschia para a entrada da base */
export function createWelwitschiaEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 236);

  // Silhueta estilizada das duas folhas perenes da Welwitschia
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  // Folha esquerda ondulada
  ctx.moveTo(256, 170);
  ctx.bezierCurveTo(200, 140, 120, 160, 80, 120);
  ctx.bezierCurveTo(110, 100, 180, 110, 240, 150);
  // Folha direita ondulada
  ctx.moveTo(256, 170);
  ctx.bezierCurveTo(312, 140, 392, 160, 432, 120);
  ctx.bezierCurveTo(402, 100, 332, 110, 272, 150);
  ctx.fill();

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText('ESTAÇÃO WELWITSCHIA 2032', 256, 60);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('CRATERA SHACKLETON • POLO SUL', 256, 215);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
