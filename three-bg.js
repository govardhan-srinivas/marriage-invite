(function () {
  const canvas = document.getElementById("three-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 10;

  // ---------- gold sparkle particle field ----------
  const PARTICLE_COUNT = 120;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const speeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    speeds[i] = 0.004 + Math.random() * 0.01;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  function circleSprite() {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,224,150,1)");
    grad.addColorStop(0.4, "rgba(201,160,78,0.9)");
    grad.addColorStop(1, "rgba(201,160,78,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  const particleMat = new THREE.PointsMaterial({
    size: 0.14,
    map: circleSprite(),
    transparent: true,
    depthWrite: false,
    opacity: 0.85
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ---------- flying heart sprite ----------
  const heartMat = new THREE.SpriteMaterial({ transparent: true, opacity: 0 });
  new THREE.TextureLoader().load("assets/images/heart.svg", (tex) => {
    heartMat.map = tex;
    heartMat.needsUpdate = true;
  });
  const heart = new THREE.Sprite(heartMat);
  heart.scale.set(1.6, 1.6, 1);
  scene.add(heart);

  const curves = {
    1: new THREE.CubicBezierCurve3(
      new THREE.Vector3(-5, -1.5, 1),
      new THREE.Vector3(-1.5, 2.5, 1),
      new THREE.Vector3(1.5, 2, 1),
      new THREE.Vector3(5, -1, 1)
    ),
    3: new THREE.CubicBezierCurve3(
      new THREE.Vector3(5, -1, 1),
      new THREE.Vector3(1.5, -3, 1),
      new THREE.Vector3(-1.5, 2.5, 1),
      new THREE.Vector3(-5, 1.5, 1)
    )
  };

  let activeCurve = null;
  let heartT = 0;
  let heartShowTimer = null;

  function setScene(index) {
    clearTimeout(heartShowTimer);
    activeCurve = null;
    heartMat.opacity = 0;
    if (curves[index]) {
      heartShowTimer = setTimeout(() => {
        activeCurve = curves[index];
        heartT = 0;
        heartMat.opacity = 1;
      }, 1500);
    }
  }
  let paused = false;
  window.WeddingBG = {
    setScene,
    pause: () => { paused = true; },
    resume: () => { paused = false; }
  };

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (paused) return;

    // drift sparkles upward, loop
    const posAttr = particleGeo.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let y = posAttr.array[i * 3 + 1] + speeds[i];
      if (y > 6) y = -6;
      posAttr.array[i * 3 + 1] = y;
    }
    posAttr.needsUpdate = true;

    // fly heart along active curve, looping
    if (activeCurve) {
      heartT += dt * 0.18;
      if (heartT > 1) heartT = 0;
      const p = activeCurve.getPoint(heartT);
      heart.position.copy(p);
      const pulse = 1.6 * (0.85 + Math.sin(heartT * Math.PI * 8) * 0.08);
      heart.scale.set(pulse, pulse, 1);
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
})();
