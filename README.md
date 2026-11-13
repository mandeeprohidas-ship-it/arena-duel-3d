const socket = io();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#07131f');
scene.fog = new THREE.Fog('#07131f', 18, 52);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 9, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight('#c7d3ff', 1.2);
scene.add(ambient);

const sun = new THREE.DirectionalLight('#ffffff', 1.3);
sun.position.set(12, 18, 10);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.CylinderGeometry(18, 18, 1.2, 64),
  new THREE.MeshStandardMaterial({ color: '#0d1f2f', metalness: 0.24, roughness: 0.9 })
);
floor.position.y = -0.7;
scene.add(floor);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(15.7, 0.28, 16, 100),
  new THREE.MeshStandardMaterial({ color: '#5ac8fa', emissive: '#0e4a73', emissiveIntensity: 0.9 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.12;
scene.add(ring);

for (let i = 0; i < 10; i++) {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 4.5, 12),
    new THREE.MeshStandardMaterial({ color: '#1b354a', emissive: '#0d1e2a', emissiveIntensity: 0.4 })
  );
  const angle = (i / 10) * Math.PI * 2;
  pillar.position.set(Math.cos(angle) * 15.8, 1.9, Math.sin(angle) * 15.8);
  scene.add(pillar);
}

const particles = [];
for (let i = 0; i < 50; i++) {
  const particle = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: '#9fe7ff' })
  );
  particle.position.set(
    (Math.random() - 0.5) * 24,
    0.3 + Math.random() * 4,
    (Math.random() - 0.5) * 24
  );
  scene.add(particle);
  particles.push(particle);
}

const players = new Map();
let localId = null;
let localPlayer = null;
let statusTimeout = null;

function createPlayerMesh(id, color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.4, 5, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.2 })
  );
  body.position.y = 1.2;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 18, 18),
    new THREE.MeshStandardMaterial({ color: '#f4efe7' })
  );
  head.position.y = 2.35;
  group.add(head);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.4, 0.18),
    new THREE.MeshStandardMaterial({ color: '#dfe7ee', metalness: 0.85, roughness: 0.2 })
  );
  blade.position.set(0.95, 1.3, 0.1);
  blade.rotation.z = 0.7;
  group.add(blade);

  const healthBarBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.18, 0.08),
    new THREE.MeshBasicMaterial({ color: '#222' })
  );
  healthBarBg.position.set(0, 3.2, 0);
  group.add(healthBarBg);

  const healthBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.12, 0.06),
    new THREE.MeshBasicMaterial({ color: '#ff5a5a' })
  );
  healthBar.position.set(-0.85, 3.2, 0.04);
  group.add(healthBar);

  group.userData = { body, healthBar, healthBarBg, health: 100 };
  scene.add(group);
  players.set(id, group);
  return group;
}

function updatePlayerVisual(id, state) {
  let mesh = players.get(id);
  if (!mesh) {
    mesh = createPlayerMesh(id, state.color || '#ffffff');
  }

  mesh.position.set(state.x, 0, state.z);
  mesh.rotation.y = state.rotation || 0;
  mesh.visible = state.alive !== false;

  if (state.health !== undefined) {
    const ratio = Math.max(0, Math.min(1, state.health / 100));
    mesh.userData.health = state.health;
    mesh.userData.healthBar.scale.x = ratio;
    mesh.userData.healthBar.position.x = (-0.85 + (1 - ratio) * 0.85);
  }

  if (localId && id === localId) {
    localPlayer = mesh;
  }
}

function setStatus(message, delay = 1800) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    if (localId) {
      statusEl.textContent = `Connected as ${localId.slice(0, 6)}`;
    } else {
      statusEl.textContent = 'Connecting...';
    }
  }, delay);
}

function refreshScoreboard() {
  const scoreboard = document.getElementById('scoreboard');
  const entries = Array.from(players.values()).map((mesh) => {
    const id = mesh.uuid || 'unknown';
    const label = mesh.userData?.label || 'Fighter';
    return { id, label, score: mesh.userData?.score || 0, health: mesh.userData?.health || 100 };
  });

  entries.sort((a, b) => b.score - a.score || b.health - a.health);

  scoreboard.innerHTML = entries.length
    ? entries
        .map((entry) => `
          <div class="score-entry">
            <span>${entry.label}</span>
            <strong>${entry.score}</strong>
          </div>
        `)
        .join('')
    : '<div class="score-entry"><span>No players</span></div>';
}

const keyState = { up: false, down: false, left: false, right: false, attack: false, sprint: false };

function emitInput() {
  socket.emit('input', keyState);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') keyState.up = true;
  if (key === 's' || key === 'arrowdown') keyState.down = true;
  if (key === 'a' || key === 'arrowleft') keyState.left = true;
  if (key === 'd' || key === 'arrowright') keyState.right = true;
  if (key === ' ' || key === 'j') keyState.attack = true;
  if (key === 'shift') keyState.sprint = true;
  if (key === 'r') socket.emit('respawn');
  emitInput();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') keyState.up = false;
  if (key === 's' || key === 'arrowdown') keyState.down = false;
  if (key === 'a' || key === 'arrowleft') keyState.left = false;
  if (key === 'd' || key === 'arrowright') keyState.right = false;
  if (key === ' ' || key === 'j') keyState.attack = false;
  if (key === 'shift') keyState.sprint = false;
  emitInput();
});

socket.on('welcome', ({ id, name, arenaHalf }) => {
  localId = id;
  document.getElementById('status').textContent = `Connected as ${name}`;
  emitInput();
});

socket.on('playerList', (list) => {
  for (const player of list) {
    const mesh = players.get(player.id) || createPlayerMesh(player.id, player.color);
    mesh.userData.label = player.name;
    mesh.userData.health = player.health;
    mesh.userData.score = player.score;
    updatePlayerVisual(player.id, player);
  }
  refreshScoreboard();
});

socket.on('state', (list) => {
  for (const player of list) {
    const mesh = players.get(player.id) || createPlayerMesh(player.id, player.color);
    mesh.userData.label = player.name;
    mesh.userData.score = player.score;
    updatePlayerVisual(player.id, player);
  }
  refreshScoreboard();
});

socket.on('hit', ({ attackerId, targetId, damage, targetAlive }) => {
  if (attackerId === localId) {
    setStatus(`Hit for ${damage} damage!`, 900);
  }
  const targetMesh = players.get(targetId);
  if (targetMesh) {
    targetMesh.userData.health = targetAlive ? 100 : 0;
  }
});

socket.on('systemMessage', (message) => {
  setStatus(message, 1800);
});

function animate() {
  requestAnimationFrame(animate);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.position.y = 0.8 + (Math.sin(performance.now() * 0.0015 + i) + 1) * 1.2;
  }

  if (localPlayer) {
    const targetPos = localPlayer.position.clone().add(new THREE.Vector3(0, 8.8, 12));
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(localPlayer.position.x, 1.1, localPlayer.position.z);
  } else {
    camera.position.lerp(new THREE.Vector3(0, 10, 14), 0.05);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setStatus('Connecting...', 1500);
