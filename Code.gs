// Doom-like FPS Game for Google Apps Script
// Main game engine and global state

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const VIEW_DISTANCE = 800;
const PLAYER_SPEED = 150;
const PLAYER_ROTATION_SPEED = 180;
const PLAYER_TURN_SPEED = 3;
const FOV = Math.PI / 3; // 60 degrees

// Game state
let gameState = {
  player: {
    x: 100,
    y: 100,
    angle: 0,
    health: 100,
    maxHealth: 100,
    ammo: 50,
    maxAmmo: 100,
    gun: {
      damage: 25,
      fireRate: 0.1,
      spread: 0.1
    },
    lastFireTime: 0
  },
  enemies: [],
  projectiles: [],
  pickups: [],
  map: null,
  gameTime: 0,
  gameOver: false,
  wave: 1,
  score: 0
};

// Get the HTML template
function getGameHTML() {
  return HtmlService.createTemplateFromFile('index').evaluate().getContent();
}

// Initialize the game
function doGet() {
  gameState.map = createMap();
  gameState.enemies = spawnEnemies(3);
  gameState.pickups = spawnPickups();
  
  let html = HtmlService.createHtmlOutput(getGameHTML())
    .setWidth(GAME_WIDTH)
    .setHeight(GAME_HEIGHT);
  return html;
}

// Main game loop - called by HTML
function gameUpdate(input) {
  if (gameState.gameOver) return gameState;
  
  const deltaTime = 0.016; // ~60 FPS
  gameState.gameTime += deltaTime;
  
  // Update player
  updatePlayer(input, deltaTime);
  
  // Update enemies
  gameState.enemies.forEach(enemy => {
    updateEnemy(enemy, deltaTime);
  });
  
  // Update projectiles
  gameState.projectiles = gameState.projectiles.filter(proj => {
    updateProjectile(proj, deltaTime);
    return proj.alive;
  });
  
  // Check collisions
  checkCollisions();
  
  // Check pickups
  checkPickups();
  
  // Remove dead enemies and spawn new waves
  gameState.enemies = gameState.enemies.filter(e => e.health > 0);
  if (gameState.enemies.length === 0) {
    gameState.wave++;
    gameState.enemies = spawnEnemies(2 + gameState.wave);
  }
  
  // Check game over
  if (gameState.player.health <= 0) {
    gameState.gameOver = true;
  }
  
  return gameState;
}

// Handle player input
function updatePlayer(input, deltaTime) {
  const player = gameState.player;
  
  // Rotation
  if (input.turnLeft) player.angle -= PLAYER_ROTATION_SPEED * deltaTime * Math.PI / 180;
  if (input.turnRight) player.angle += PLAYER_ROTATION_SPEED * deltaTime * Math.PI / 180;
  
  // Movement
  const moveX = (input.moveForward ? Math.cos(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.moveBackward ? -Math.cos(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.strafeLeft ? -Math.sin(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.strafeRight ? Math.sin(player.angle) * PLAYER_SPEED * deltaTime : 0);
  
  const moveY = (input.moveForward ? Math.sin(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.moveBackward ? -Math.sin(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.strafeLeft ? Math.cos(player.angle) * PLAYER_SPEED * deltaTime : 0) +
                (input.strafeRight ? -Math.cos(player.angle) * PLAYER_SPEED * deltaTime : 0);
  
  const newX = player.x + moveX;
  const newY = player.y + moveY;
  
  // Collision with walls
  if (!checkWallCollision(newX, newY, 15)) {
    player.x = newX;
    player.y = newY;
  }
  
  // Firing
  if (input.fire && gameState.gameTime - player.lastFireTime > player.gun.fireRate) {
    fireGun();
    player.lastFireTime = gameState.gameTime;
  }
}

// Fire the gun
function fireGun() {
  const player = gameState.player;
  
  if (player.ammo <= 0) return;
  
  player.ammo--;
  
  // Create projectiles with spread
  for (let i = 0; i < 1; i++) {
    const spread = (Math.random() - 0.5) * player.gun.spread;
    const angle = player.angle + spread;
    
    gameState.projectiles.push({
      x: player.x + Math.cos(angle) * 20,
      y: player.y + Math.sin(angle) * 20,
      angle: angle,
      speed: 500,
      damage: player.gun.damage,
      life: 3,
      alive: true,
      owner: 'player'
    });
  }
}

// Update projectile
function updateProjectile(proj, deltaTime) {
  proj.x += Math.cos(proj.angle) * proj.speed * deltaTime;
  proj.y += Math.sin(proj.angle) * proj.speed * deltaTime;
  proj.life -= deltaTime;
  
  if (proj.life <= 0 || checkWallCollision(proj.x, proj.y, 2)) {
    proj.alive = false;
  }
}

// Check collisions between projectiles and enemies
function checkCollisions() {
  gameState.projectiles.forEach(proj => {
    if (!proj.alive) return;
    
    gameState.enemies.forEach(enemy => {
      const dx = proj.x - enemy.x;
      const dy = proj.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 20) {
        enemy.health -= proj.damage;
        proj.alive = false;
        
        if (enemy.health <= 0) {
          gameState.score += 100;
        }
      }
    });
  });
  
  // Enemy projectiles hitting player
  gameState.projectiles.forEach(proj => {
    if (proj.owner === 'player') return;
    
    const dx = proj.x - gameState.player.x;
    const dy = proj.y - gameState.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 20) {
      gameState.player.health -= proj.damage;
      proj.alive = false;
    }
  });
}

// Check pickup collisions
function checkPickups() {
  gameState.pickups = gameState.pickups.filter(pickup => {
    const dx = gameState.player.x - pickup.x;
    const dy = gameState.player.y - pickup.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 25) {
      if (pickup.type === 'health') {
        gameState.player.health = Math.min(gameState.player.health + pickup.amount, gameState.player.maxHealth);
      } else if (pickup.type === 'ammo') {
        gameState.player.ammo = Math.min(gameState.player.ammo + pickup.amount, gameState.player.maxAmmo);
      }
      return false; // Remove pickup
    }
    return true;
  });
}

// Check wall collision
function checkWallCollision(x, y, radius) {
  const map = gameState.map;
  const gridSize = map.gridSize;
  const mapWidth = map.width;
  const mapHeight = map.height;
  
  const minGridX = Math.max(0, Math.floor((x - radius) / gridSize));
  const maxGridX = Math.min(mapWidth - 1, Math.floor((x + radius) / gridSize));
  const minGridY = Math.max(0, Math.floor((y - radius) / gridSize));
  const maxGridY = Math.min(mapHeight - 1, Math.floor((y + radius) / gridSize));
  
  for (let gx = minGridX; gx <= maxGridX; gx++) {
    for (let gy = minGridY; gy <= maxGridY; gy++) {
      if (map.tiles[gy][gx] === 1) {
        return true;
      }
    }
  }
  return false;
}

// Render the game view
function renderGame() {
  const player = gameState.player;
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  // Draw raycasted view
  drawRaycastedView(ctx);
  
  // Draw HUD
  drawHUD(ctx);
}

// Draw raycasted view
function drawRaycastedView(ctx) {
  const player = gameState.player;
  const map = gameState.map;
  const rayCount = GAME_WIDTH;
  const fovStep = FOV / rayCount;
  
  for (let i = 0; i < rayCount; i++) {
    const rayAngle = player.angle - FOV / 2 + (i / rayCount) * FOV;
    const hit = castRay(player.x, player.y, rayAngle);
    
    if (hit) {
      // Calculate wall height based on distance
      const distance = hit.distance;
      const wallHeight = Math.min((GAME_HEIGHT * 50) / Math.max(distance, 1), GAME_HEIGHT);
      const y = (GAME_HEIGHT - wallHeight) / 2;
      
      // Color based on distance and side hit
      let brightness = Math.max(50, 255 - distance);
      let color;
      
      if (hit.side === 'vertical') {
        color = `rgb(${brightness * 0.8}, ${brightness * 0.8}, ${brightness * 0.8})`;
      } else {
        color = `rgb(${brightness}, ${brightness}, ${brightness})`;
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(i, y, 1, wallHeight);
      
      // Draw sprite at hit location if it's an enemy
      if (hit.enemy) {
        drawEnemySprite(ctx, i, y, wallHeight, hit.enemy, distance);
      }
    }
  }
}

// Cast a ray and find what it hits
function castRay(x, y, angle) {
  const maxDistance = VIEW_DISTANCE;
  const step = 2;
  let distance = 0;
  const map = gameState.map;
  
  let currentX = x;
  let currentY = y;
  let hitEnemy = null;
  
  while (distance < maxDistance) {
    currentX += Math.cos(angle) * step;
    currentY += Math.sin(angle) * step;
    distance += step;
    
    // Check for wall collision
    if (checkWallCollision(currentX, currentY, 2)) {
      const side = (Math.abs(currentX - Math.round(currentX / map.gridSize) * map.gridSize) > 
                   Math.abs(currentY - Math.round(currentY / map.gridSize) * map.gridSize)) ? 'horizontal' : 'vertical';
      return { distance: distance, side: side };
    }
    
    // Check for enemy collision
    for (let enemy of gameState.enemies) {
      const dx = currentX - enemy.x;
      const dy = currentY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 20) {
        return { distance: distance, enemy: enemy };
      }
    }
  }
  
  return null;
}

// Draw enemy sprite
function drawEnemySprite(ctx, x, y, height, enemy, distance) {
  const width = height * 0.6;
  const spriteX = x - width / 2;
  
  // Draw a simple enemy sprite
  ctx.fillStyle = `rgb(255, ${Math.max(0, 200 - distance * 2)}, 0)`;
  ctx.fillRect(spriteX, y, width, height);
  
  // Draw eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(spriteX + width * 0.2, y + height * 0.3, width * 0.12, height * 0.15);
  ctx.fillRect(spriteX + width * 0.68, y + height * 0.3, width * 0.12, height * 0.15);
}

// Draw HUD
function drawHUD(ctx) {
  const player = gameState.player;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Arial';
  
  // Health bar
  ctx.fillText(`HEALTH: ${Math.ceil(player.health)}/${player.maxHealth}`, 10, 30);
  ctx.fillStyle = player.health > 50 ? '#00FF00' : (player.health > 25 ? '#FFFF00' : '#FF0000');
  ctx.fillRect(10, 40, (player.health / player.maxHealth) * 100, 15);
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeRect(10, 40, 100, 15);
  
  // Ammo
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`AMMO: ${player.ammo}/${player.maxAmmo}`, 10, 75);
  ctx.fillStyle = '#FFFF00';
  ctx.fillRect(10, 85, (player.ammo / player.maxAmmo) * 100, 15);
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeRect(10, 85, 100, 15);
  
  // Wave and score
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`WAVE: ${gameState.wave}`, GAME_WIDTH - 150, 30);
  ctx.fillText(`SCORE: ${gameState.score}`, GAME_WIDTH - 150, 60);
  ctx.fillText(`ENEMIES: ${gameState.enemies.length}`, GAME_WIDTH - 150, 90);
  
  // Crosshair
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GAME_WIDTH / 2 - 10, GAME_HEIGHT / 2);
  ctx.lineTo(GAME_WIDTH / 2 + 10, GAME_HEIGHT / 2);
  ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);
  ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
  ctx.stroke();
  
  // Game over screen
  if (gameState.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`FINAL SCORE: ${gameState.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    ctx.fillText(`WAVE REACHED: ${gameState.wave}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
  }
}
