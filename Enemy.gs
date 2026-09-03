// Enemy AI and behavior

function updateEnemy(enemy, deltaTime) {
  const player = gameState.player;
  
  // Calculate distance to player
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distToPlayer = Math.sqrt(dx * dx + dy * dy);
  
  // Update attack cooldown
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaTime);
  
  if (distToPlayer < enemy.visionRange) {
    // Can see player - chase
    const dirToPlayer = Math.atan2(dy, dx);
    
    // Move toward player
    const moveX = Math.cos(dirToPlayer) * enemy.speed * deltaTime;
    const moveY = Math.sin(dirToPlayer) * enemy.speed * deltaTime;
    
    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;
    
    if (!checkWallCollision(newX, newY, 15)) {
      enemy.x = newX;
      enemy.y = newY;
    } else {
      // Simple wall avoidance - try perpendicular movement
      const perpX = Math.cos(dirToPlayer + Math.PI / 2) * enemy.speed * deltaTime;
      const perpY = Math.sin(dirToPlayer + Math.PI / 2) * enemy.speed * deltaTime;
      
      const perpNewX = enemy.x + perpX;
      const perpNewY = enemy.y + perpY;
      
      if (!checkWallCollision(perpNewX, perpNewY, 15)) {
        enemy.x = perpNewX;
        enemy.y = perpNewY;
      }
    }
    
    enemy.angle = Math.atan2(dy, dx);
    
    // Attack if in range
    if (distToPlayer < enemy.attackRange && enemy.attackCooldown <= 0) {
      fireEnemyProjectile(enemy);
      enemy.attackCooldown = 1.5;
    }
  } else {
    // Can't see player - patrol
    if (Math.random() < 0.02) {
      enemy.angle += (Math.random() - 0.5) * 2;
    }
    
    const moveX = Math.cos(enemy.angle) * enemy.speed * deltaTime * 0.5;
    const moveY = Math.sin(enemy.angle) * enemy.speed * deltaTime * 0.5;
    
    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;
    
    if (!checkWallCollision(newX, newY, 15)) {
      enemy.x = newX;
      enemy.y = newY;
    } else {
      // Random new direction on wall collision
      enemy.angle = Math.random() * Math.PI * 2;
    }
  }
}

function fireEnemyProjectile(enemy) {
  const spread = (Math.random() - 0.5) * 0.3;
  const angle = enemy.angle + spread;
  
  gameState.projectiles.push({
    x: enemy.x + Math.cos(angle) * 15,
    y: enemy.y + Math.sin(angle) * 15,
    angle: angle,
    speed: 300,
    damage: enemy.attackDamage,
    life: 5,
    alive: true,
    owner: 'enemy'
  });
}
