/*
  Fondo 3D decorativo del hero (PetPharma).
  100% independiente: no lee ni modifica nada de env.js, config.js, boot.js,
  ui.js ni app.js. Si esta librería (Three.js, cargada por CDN) fallara al
  descargarse (ej. sin internet), el resto del sitio sigue funcionando
  normal — este script simplemente no dibuja nada.
*/
(function () {
  const canvas = document.getElementById('heroCanvas3D');
  if (!canvas || typeof THREE === 'undefined') return;

  let width = canvas.clientWidth || window.innerWidth;
  let height = canvas.clientHeight || 400;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 7);

  const key = new THREE.PointLight(0x34d399, 2.2, 20);
  key.position.set(4, 3, 5);
  scene.add(key);
  const fill = new THREE.PointLight(0xfbbf24, 1.1, 20);
  fill.position.set(-4, -2, 4);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x06231c, 0.7));

  // Cruz veterinaria estilizada + esferas orbitando (perros/gatos/equinos/aves)
  const group = new THREE.Group();
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x0f3b2e, metalness: 0.6, roughness: 0.3, emissive: 0x03120d,
  });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.55), crossMat));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.9, 0.55), crossMat));

  const orbitData = [
    { radius: 1.7, speed: 0.6, size: 0.16, color: 0x34d399 },
    { radius: 2.15, speed: -0.4, size: 0.12, color: 0xfbbf24 },
    { radius: 2.55, speed: 0.35, size: 0.14, color: 0x5eebb6 },
  ];
  const orbitMeshes = orbitData.map((o) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(o.size, 24, 24),
      new THREE.MeshStandardMaterial({
        color: o.color, metalness: 0.4, roughness: 0.35,
        emissive: o.color, emissiveIntensity: 0.15,
      })
    );
    group.add(m);
    return m;
  });

  // Posicionado hacia la derecha para no chocar con el texto del hero
  group.position.x = 2.1;
  scene.add(group);

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || 400;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', resize);

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
  });

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();

    group.rotation.y = t * 0.25;
    group.rotation.x = Math.sin(t * 0.3) * 0.15;
    group.position.y = Math.sin(t * 0.6) * 0.12;

    orbitMeshes.forEach((m, i) => {
      const o = orbitData[i];
      const angle = t * o.speed;
      m.position.x = Math.cos(angle) * o.radius;
      m.position.z = Math.sin(angle) * o.radius;
      m.position.y = Math.sin(angle * 1.4) * 0.35;
    });

    camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03;
    camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
