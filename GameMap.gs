// Map generation and management

function createMap() {
  const gridSize = 50;
  const mapWidth = 16;
  const mapHeight = 12;
  
  // Create map with walls
  const tiles = [];
  for (let y = 0; y < mapHeight; y++) {
    tiles[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      // Border walls
      if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
        tiles[y][x] = 1;
      }
      // Interior walls
      else if ((x === 4 || x === 11) && (y > 2 && y < 9)) {
        tiles[y][x] = 1;
      }
      else if ((y === 4 || y === 7) && (x > 2 && x < 13)) {
        tiles[y][x] = 1;
      }
      else if (x === 7 && (y === 2 || y === 9)) {
        tiles[y][x] = 1;
      }
      else {
        tiles[y][x] = 0;
      }
    }
  }
  
  return {
    tiles: tiles,
    gridSize: gridSize,
    width: mapWidth,
    height: mapHeight,
    pixelWidth: mapWidth * gridSize,
    pixelHeight: mapHeight * gridSize
  };
}

function spawnEnemies(count) {
  const enemies = [];
  const map = gameState.map;
  
  for (let i = 0; i < count; i++) {
    let x, y;
    let validSpawn = false;
    
    // Find valid spawn location
    while (!validSpawn) {
      x = Math.random() * (map.pixelWidth - 100) + 50;
      y = Math.random() * (map.pixelHeight - 100) + 50;
      
      // Check distance from player
      const dx = x - gameState.player.x;
      const dy = y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 150 && !checkWallCollision(x, y, 20)) {
        validSpawn = true;
      }
    }
    
    enemies.push({
      x: x,
      y: y,
      angle: Math.random() * Math.PI * 2,
      health: 30,
      maxHealth: 30,
      speed: 80,
      visionRange: 300,
      attackRange: 200,
      attackCooldown: 0,
      attackDamage: 10,
      type: 'basic'
    });
  }
  
  return enemies;
}

function spawnPickups() {
  const pickups = [];
  const map = gameState.map;
  
  // Spawn health pickups
  for (let i = 0; i < 6; i++) {
    let x, y;
    let validSpawn = false;
    
    while (!validSpawn) {
      x = Math.random() * (map.pixelWidth - 100) + 50;
      y = Math.random() * (map.pixelHeight - 100) + 50;
      
      if (!checkWallCollision(x, y, 20)) {
        validSpawn = true;
      }
    }
    
    pickups.push({
      x: x,
      y: y,
      type: 'health',
      amount: 25,
      respawnTime: 30
    });
  }
  
  // Spawn ammo pickups
  for (let i = 0; i < 8; i++) {
    let x, y;
    let validSpawn = false;
    
    while (!validSpawn) {
      x = Math.random() * (map.pixelWidth - 100) + 50;
      y = Math.random() * (map.pixelHeight - 100) + 50;
      
      if (!checkWallCollision(x, y, 20)) {
        validSpawn = true;
      }
    }
    
    pickups.push({
      x: x,
      y: y,
      type: 'ammo',
      amount: 15,
      respawnTime: 20
    });
  }
  
  return pickups;
}
