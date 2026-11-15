/**
 * Welwitschia Lunar - Iluminação Astronômica Realista, Campo de Estrelas e Terra
 * Polo Sul da Lua: Sol rasante a 5° de elevação, sombras negras absolutas,
 * campo de 3.500 estrelas sem cintilação atmosférica, Terra com fase lunar coerente e halo Fresnel.
 */

import * as THREE from 'three';
import { createEarthDayTexture, createEarthNightTexture } from './ProceduralTextures';

export class SkyAndLighting {
  public scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public earthGroup: THREE.Group;
  public earthMesh: THREE.Mesh;
  public earthAtmosphere: THREE.Mesh;
  public starPoints: THREE.Points;
  public ambientLight: THREE.AmbientLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Espaço negro absoluto (vácuo)
    this.scene.background = new THREE.Color(0x000000);

    // 2. Sol polar rasante (5° de elevação)
    const sunAzimuth = Math.PI * 0.25; // 45° Azimute
    const sunElevation = 5.0 * (Math.PI / 180.0);
    const sunDist = 2000.0;

    const sunX = Math.cos(sunAzimuth) * Math.cos(sunElevation) * sunDist;
    const sunY = Math.sin(sunElevation) * sunDist;
    const sunZ = Math.sin(sunAzimuth) * Math.cos(sunElevation) * sunDist;

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.9);
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.castShadow = true;

    // Sombras nítidas
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 50;
    this.sunLight.shadow.camera.far = 3500;

    const shadowFrustum = 380;
    this.sunLight.shadow.camera.left = -shadowFrustum;
    this.sunLight.shadow.camera.right = shadowFrustum;
    this.sunLight.shadow.camera.top = shadowFrustum;
    this.sunLight.shadow.camera.bottom = -shadowFrustum;
    this.sunLight.shadow.bias = -0.0003;

    this.scene.add(this.sunLight);

    // 3. Luz ambiente mínima (apenas luz secundária refletida pelo regolito)
    this.ambientLight = new THREE.AmbientLight(0x060608, 0.12);
    this.scene.add(this.ambientLight);

    // 4. Campo de 3.500 Estrelas Fixas Sem Cintilação (Points BufferGeometry)
    this.starPoints = this.createRealisticStarfield();
    this.scene.add(this.starPoints);

    // 5. A Terra na Perspectiva Lunar (com fase solar coerente e halo atmosférico)
    const { group, mesh, atmosphere } = this.createEarthSystem(sunX, sunY, sunZ);
    this.earthGroup = group;
    this.earthMesh = mesh;
    this.earthAtmosphere = atmosphere;
    this.scene.add(this.earthGroup);
  }

  /**
   * Cria 3.500 estrelas em BufferGeometry esférico de raio 1800m.
   * Não cintilam (sem atmosfera para perturbar a luz) e possuem cores estelares científicas.
   */
  private createRealisticStarfield(): THREE.Points {
    const starCount = 3500;
    const starRadius = 1800;

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    // Paleta de cores espectrais de estrelas
    const colorWhite = new THREE.Color(0xffffff);
    const colorBlueWhite = new THREE.Color(0xd0e2ff); // Estrelas Classe B/A (quentes)
    const colorPaleYellow = new THREE.Color(0xfff1cf); // Estrelas Classe G/K (como o Sol)
    const colorWarmRed = new THREE.Color(0xffd2be); // Gigantes vermelhas

    for (let i = 0; i < starCount; i++) {
      // Distribuição uniforme na esfera celeste
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const x = starRadius * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(starRadius * Math.cos(phi)) + 15; // Privilegia horizonte e zênite visíveis
      const z = starRadius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Temperatura e magnitude
      const randColor = Math.random();
      let chosenColor = colorWhite;
      if (randColor < 0.25) chosenColor = colorBlueWhite;
      else if (randColor < 0.55) chosenColor = colorWhite;
      else if (randColor < 0.85) chosenColor = colorPaleYellow;
      else chosenColor = colorWarmRed;

      // Magnitude aparente (brilho)
      const brightness = Math.pow(Math.random(), 1.5) * 0.75 + 0.25;
      colors[i * 3] = chosenColor.r * brightness;
      colors[i * 3 + 1] = chosenColor.g * brightness;
      colors[i * 3 + 2] = chosenColor.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: false, // Tamanho aparente constante em pixels na tela
      vertexColors: true,
      transparent: false,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Cria o sistema da Terra vista do Polo Sul Lunar:
   * - Tamanho angular ~4x maior que a Lua vista da Terra
   * - Fase iluminada correspondente à posição do Sol polar
   * - Halo atmosférico com gradiente Fresnel
   */
  private createEarthSystem(sunX: number, sunY: number, sunZ: number): {
    group: THREE.Group;
    mesh: THREE.Mesh;
    atmosphere: THREE.Mesh;
  } {
    const earthGroup = new THREE.Group();

    // Posicionamento: elevação ~8.5° no horizonte sudoeste (~215°)
    const earthDist = 1100.0;
    const earthElevationRad = 8.5 * (Math.PI / 180.0);
    const earthAzimuthRad = Math.PI * 1.2; // 216°

    const earthX = Math.cos(earthAzimuthRad) * Math.cos(earthElevationRad) * earthDist;
    const earthY = Math.sin(earthElevationRad) * earthDist + 35;
    const earthZ = Math.sin(earthAzimuthRad) * Math.cos(earthElevationRad) * earthDist;

    earthGroup.position.set(earthX, earthY, earthZ);

    // Raio da Terra para subtender ~1.9° no campo de visão (aprox. 4x o diâmetro lunar da Terra)
    const earthRadius = 26.0;

    const dayTexture = createEarthDayTexture();
    const nightTexture = createEarthNightTexture();

    // Shader personalizado com transição suave da fase diurna/noturna baseada na direção do Sol
    const sunDir = new THREE.Vector3(sunX - earthX, sunY - earthY, sunZ - earthZ).normalize();

    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 48);

    // Shader da Terra com iluminação diurna, noturna e luz de cidades no terminador
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: sunDir }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 n = normalize(vNormal);
          // Normal do sol no espaço de visualização
          vec3 lightDir = normalize(sunDirection);
          float NdotL = dot(n, lightDir);

          // Transição suave na linha do terminador (crepúsculo)
          float dayWeight = smoothstep(-0.15, 0.25, NdotL);

          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);

          // Ajuste de contraste solar
          vec3 finalColor = mix(nightColor.rgb * 0.9, dayColor.rgb * 1.25, dayWeight);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = 0.41; // Inclinação do eixo axial da Terra (23.44°)
    earthMesh.rotation.y = 1.35;
    earthGroup.add(earthMesh);

    // Halo Atmosférico Azul Sutil (Efeito Fresnel)
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.035, 40, 40);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // Intensidade nas bordas visíveis (Fresnel)
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          vec3 atmoColor = vec3(0.18, 0.58, 0.98); // Azul celeste de Rayleigh
          gl_FragColor = vec4(atmoColor, intensity * 0.75);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });

    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmosphere);

    // Iluminação sutil refletida pela Terra (Earthlight) no terreno lunar
    const earthLight = new THREE.DirectionalLight(0x336699, 0.35);
    earthLight.position.copy(earthGroup.position);
    this.scene.add(earthLight);

    return { group: earthGroup, mesh: earthMesh, atmosphere };
  }

  /** Atualiza o foco das sombras do sol para acompanhar o Rover do jogador */
  public updateSunShadowTarget(roverPosition: THREE.Vector3): void {
    const sunAzimuth = Math.PI * 0.25;
    const sunElevation = 5.0 * (Math.PI / 180.0);
    const sunDist = 2000.0;

    this.sunLight.position.set(
      roverPosition.x + Math.cos(sunAzimuth) * Math.cos(sunElevation) * sunDist,
      roverPosition.y + Math.sin(sunElevation) * sunDist,
      roverPosition.z + Math.sin(sunAzimuth) * Math.cos(sunElevation) * sunDist
    );
    this.sunLight.target.position.copy(roverPosition);
    this.sunLight.target.updateMatrixWorld();
  }

  /** Rotaciona a Terra lentamente em seu eixo diário */
  public updateEarthRotation(delta: number): void {
    if (this.earthMesh) {
      this.earthMesh.rotation.y += delta * 0.012;
    }
  }

  /** Ativa ou remove o nevoeiro volumétrico denso de poeira lunar */
  public setStormFog(active: boolean, density: number = 0.025): void {
    if (active) {
      this.scene.fog = new THREE.FogExp2(0x18181c, density);
    } else {
      this.scene.fog = null;
    }
  }
}
