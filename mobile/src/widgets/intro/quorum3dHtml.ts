/**
 * quorum3dHtml.ts
 * ---------------
 * Generates the self-contained HTML document for the 3D Quorum Intro.
 * Bundles the local Three.js script inline so execution is 100% offline,
 * instant, and does not require any network access.
 *
 * Communicates with React Native via window.ReactNativeWebView.postMessage:
 *   - { type: 'READY' } when Frame 0 is rendered and GPU shaders are warm.
 *   - { type: 'COMPLETE' } when the full cinematic animation finishes.
 *   - { type: 'SKIP' } when the user taps anywhere on the screen.
 */

import { THREE_MIN_JS } from './threeMinJs';

export function getQuorum3dHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Quorum</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{
  height:100%;
  width:100%;
  overflow:hidden;
  background:#000308;
  color:#e8eaf6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  user-select:none;
  -webkit-user-select:none;
  -webkit-touch-callout:none;
}
#intro{position:fixed;inset:0;background:#000308;z-index:100;cursor:pointer}
#intro canvas{display:block;width:100%;height:100%}
#q-label{
  position:fixed;width:100%;text-align:center;
  bottom:22%;
  font-size:clamp(1.1rem, 5.5vw, 1.8rem);
  font-weight:200;letter-spacing:0.55em;padding-left:0.55em;
  color:transparent;pointer-events:none;z-index:102;
  text-shadow:0 0 35px rgba(100,150,255,0.7);
  transition:color 0.2s;
}
#flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:200}
</style>
</head>
<body>

<div id="intro"></div>
<div id="q-label">QUORUM</div>
<div id="flash"></div>

<script>
${THREE_MIN_JS}
</script>
<script>
(function() {
  const eO  = function(t) { return 1 - Math.pow(1 - t, 3); };
  const eI  = function(t) { return t * t; };
  const cl  = function(v,a,b) { return Math.max(a, Math.min(b,v)); };
  const lp  = function(a,b,t) { return a + (b - a) * t; };

  const $intro = document.getElementById('intro');
  const $flash = document.getElementById('flash');
  const $label = document.getElementById('q-label');

  // Reliable message dispatcher with retry queue
  function postToRN(msg) {
    const str = JSON.stringify(msg);
    function trySend() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(str);
        return true;
      }
      return false;
    }
    if (!trySend()) {
      const timer = setInterval(function() {
        if (trySend()) clearInterval(timer);
      }, 25);
    }
  }

  const W = window.innerWidth, H = window.innerHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000308);
  scene.fog = new THREE.FogExp2(0x000308, 0.065);

  const cam = new THREE.PerspectiveCamera(54, W/H, 0.1, 100);
  cam.position.set(0, -0.7, 9.5);

  const rdr = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  rdr.setSize(W, H);
  rdr.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  $intro.appendChild(rdr.domElement);

  const mat = new THREE.MeshPhongMaterial({
    color:    new THREE.Color(0x1a44dd),
    specular: new THREE.Color(0xaaccff),
    shininess: 200,
    emissive:  new THREE.Color(0x04102e),
    emissiveIntensity: 1,
  });

  function makeQ() {
    const g = new THREE.Group();
    const bevel = { bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 16 };

    // Ring (O part)
    const ring = new THREE.Shape();
    ring.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.63, 0, Math.PI * 2, true);
    ring.holes.push(hole);

    const rMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ring, { ...bevel, depth: 0.3, curveSegments: 64 }),
      mat
    );
    rMesh.position.z = -0.15;
    g.add(rMesh);

    // Tail (diagonal slash of Q)
    const tail = new THREE.Shape();
    tail.moveTo(0.26, -0.46);
    tail.lineTo(0.51, -0.46);
    tail.lineTo(0.88, -1.26);
    tail.lineTo(0.62, -1.26);
    tail.closePath();

    const tMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(tail, { ...bevel, depth: 0.3, bevelThickness: 0.04, bevelSize: 0.04, curveSegments: 24 }),
      mat
    );
    tMesh.position.z = -0.15;
    g.add(tMesh);

    g.position.y = 0.1;
    return g;
  }

  // Initial State: Q starts below screen ready for full burst entrance
  const Q = makeQ();
  Q.scale.setScalar(0.01);
  Q.position.set(0, -1.8, 0);
  Q.rotation.y = -Math.PI * 0.78;
  scene.add(Q);

  scene.add(new THREE.AmbientLight(0x0a1040, 0.6));

  const kL = new THREE.PointLight(0x88aaff, 0, 22); kL.position.set( 4,  5,  5);
  const fL = new THREE.PointLight(0x3355ff, 0, 16); fL.position.set(-4,  1,  3);
  const rL = new THREE.PointLight(0xaa33ff, 0, 16); rL.position.set( 1, -4, -2);
  const tL = new THREE.PointLight(0xffffff, 0, 14); tL.position.set( 0,  7,  4);
  [kL, fL, rL, tL].forEach(function(l) { scene.add(l); });

  // Radial canvas glow sprite behind Q
  const gc  = document.createElement('canvas');
  gc.width  = gc.height = 256;
  const gx  = gc.getContext('2d');
  const grd = gx.createRadialGradient(128,128,0, 128,128,128);
  grd.addColorStop(0,   'rgba(80,120,255,.85)');
  grd.addColorStop(.42, 'rgba(50,90,255,.28)');
  grd.addColorStop(1,   'rgba(0,0,0,0)');
  gx.fillStyle = grd; gx.fillRect(0,0,256,256);

  const glowMat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(gc),
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(5);
  glow.position.z = -0.4;
  scene.add(glow);

  // Orbiting dust particles
  const PC   = 500;
  const pPos = new Float32Array(PC * 3);
  for (let i = 0; i < PC; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r  = 2.2 + Math.random() * 2.8;
    pPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pPos[i*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.62;
    pPos[i*3+2] = r * Math.cos(ph);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x5599ff, size: 0.025, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const pts = new THREE.Points(pGeo, pMat);
  scene.add(pts);

  let finished = false;
  function handleSkip() {
    if (finished) return;
    finished = true;
    postToRN({ type: 'SKIP' });
  }

  $intro.addEventListener('click', handleSkip);
  $intro.addEventListener('touchstart', handleSkip, { passive: true });

  const TOTAL = 5.2;
  let t0 = null;
  let reqId = null;
  let readyReported = false;
  let readyTime = 0;
  let animStarted = false;

  function startAnimation() {
    if (animStarted) return;
    animStarted = true;
    t0 = performance.now();
  }

  // React Native message listeners
  window.addEventListener('message', function(ev) {
    try {
      const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (data && (data.type === 'START' || data === 'START')) startAnimation();
    } catch(e) {}
  });
  document.addEventListener('message', function(ev) {
    try {
      const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (data && (data.type === 'START' || data === 'START')) startAnimation();
    } catch(e) {}
  });

  function tick(ts) {
    if (finished) return;

    // Phase 0: Render Frame 0, compile GPU shaders, and notify React Native
    if (!readyReported) {
      cam.lookAt(0, 0, 0);
      rdr.render(scene, cam);
      readyReported = true;
      readyTime = performance.now();
      postToRN({ type: 'READY' });
      reqId = requestAnimationFrame(tick);
      return;
    }

    // Wait until start signal arrives (or auto-start after 180ms delay to let splash fade)
    if (!animStarted) {
      if (performance.now() - readyTime > 180) {
        startAnimation();
      }
      cam.lookAt(0, 0, 0);
      rdr.render(scene, cam);
      reqId = requestAnimationFrame(tick);
      return;
    }

    if (!t0) t0 = ts;
    const e = (ts - t0) / 1000;

    // Phase 1 (0–1.1s): Q bursts in from below, lights fire on!
    if (e < 1.1) {
      const t = eO(e / 1.1);
      Q.scale.setScalar(lp(0.01, 1, t));
      Q.rotation.y   = lp(-Math.PI * 0.78, 0, t);
      Q.position.y   = lp(-1.8, 0.1, t);
      cam.position.z = lp(9.5, 6.2, t);
      cam.position.y = lp(-0.7, 0, t);
      kL.intensity = lp(0, 9,   t);
      tL.intensity = lp(0, 4.5, t);
      fL.intensity = lp(0, 3,   t);
      glowMat.opacity = lp(0, 0.65, t);
    }
    // Phase 2 (1.1–3.4s): Slow orbit, rim ignites, particles bloom
    else if (e < 3.4) {
      const t  = (e - 1.1) / 2.3;
      Q.rotation.y     = lp(0, Math.PI * 0.38, t * 0.5);
      rL.intensity     = lp(0, 7, cl(t * 3, 0, 1));
      pMat.opacity     = lp(0, 0.82, cl(t * 2.5, 0, 1));
      pts.rotation.y   = e * 0.13;
      cam.position.y   = Math.sin(e * 0.65) * 0.09;
      kL.intensity     = 9 + Math.sin(e * 2.3) * 1.4;
      glowMat.opacity  = 0.52 + Math.sin(e * 2.9) * 0.13;
      const lt = cl((t - 0.18) / 0.55, 0, 1);
      $label.style.color = 'rgba(160,195,255,' + (lt * 0.9) + ')';
    }
    // Phase 3 (3.4–4.5s): Q surges at camera, flash builds
    else if (e < 4.5) {
      const t = eI((e - 3.4) / 1.1);
      Q.position.z    = lp(0, 6, t);
      Q.scale.setScalar(lp(1, 2.4, t));
      Q.rotation.y   += 0.022;
      pts.rotation.y += 0.014;
      $flash.style.opacity = String(cl(t * 1.1, 0, 1));
      $label.style.color   = 'rgba(160,195,255,' + lp(0.9, 0, t) + ')';
      glowMat.opacity      = lp(0.54, 0, t);
    }
    // Phase 4 (4.5–5.2s): Pure white hold
    else if (e < TOTAL) {
      $flash.style.opacity = '1';
    }
    // Done: notify React Native
    else {
      finished = true;
      postToRN({ type: 'COMPLETE' });
      return;
    }

    cam.lookAt(0, 0, 0);
    rdr.render(scene, cam);
    reqId = requestAnimationFrame(tick);
  }

  reqId = requestAnimationFrame(tick);

  window.addEventListener('resize', function() {
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
    rdr.setSize(window.innerWidth, window.innerHeight);
  });
})();
</script>
</body>
</html>`;
}
