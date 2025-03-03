// blastar.js

const CANVAS_MARGIN = 100;
const CANVAS_WIDTH = window.innerWidth - 2 * CANVAS_MARGIN;
const CANVAS_HEIGHT = window.innerHeight - 2 * CANVAS_MARGIN;
const GRAVITY = 0.05;

// Preload sounds from MyInstants
const laserSound = new Audio(
  "https://www.myinstants.com/media/sounds/blaster.mp3"
);
const explosionSound = new Audio(
  "https://www.myinstants.com/media/sounds/impact_explosion_03.mp3"
);
const gameOverSound = new Audio(
  "https://www.myinstants.com/media/sounds/game-over.mp3"
);
const mothershipExplosionSound = new Audio(
  "https://www.myinstants.com/media/sounds/explosion-6055.mp3"
);

// Debug audio loading
[laserSound, explosionSound, gameOverSound, mothershipExplosionSound].forEach(
  (sound) => {
    sound.onerror = () => console.error(`Failed to load sound: ${sound.src}`);
  }
);

function createParticle(x, y, isSmall, color = null) {
  const particle = {
    x,
    y,
    vx: (Math.random() - 0.5) * (isSmall ? 7 : 12),
    vy: (Math.random() - 0.5) * (isSmall ? 7 : 12),
    size: isSmall ? Math.random() * 4 + 1 : Math.random() * 8 + 2,
    life: isSmall ? 35 : 50,
    active: true,
    color:
      color ||
      ["#FF4500", "#FF0000", "#FFFF00", "#FF69B4", "#00FFFF", "#FFA500"][
        Math.floor(Math.random() * 6)
      ],
    rotation: Math.random() * Math.PI * 2,
    hasTrail: Math.random() < 0.3,
    trailLength: Math.floor(Math.random() * 3) + 2,
    trailPositions: [],
  };

  particle.update = function () {
    if (!this.active) return;

    if (this.hasTrail) {
      this.trailPositions.unshift({
        x: this.x,
        y: this.y,
        size: this.size * 0.7,
      });
      if (this.trailPositions.length > this.trailLength) {
        this.trailPositions.pop();
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.life--;
    this.rotation += 0.1;
    if (this.life <= 0) this.active = false;
  };

  particle.draw = function (ctx) {
    if (!this.active) return;

    if (this.hasTrail && this.trailPositions.length > 0) {
      this.trailPositions.forEach((pos, index) => {
        const alpha = (this.trailLength - index) / (this.trailLength * 2);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = `${this.color}${Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(0, 0, pos.size * (index / this.trailLength), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    const alpha = this.life / (this.size <= 4 ? 35 : 50);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = `${this.color}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;

    if (Math.random() < 0.7) {
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        this.size * (1 + Math.sin(Date.now() * 0.02) * 0.3),
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      const spikes = 5;
      const outerRadius = this.size;
      const innerRadius = this.size / 2;

      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * 2 * i) / (spikes * 2);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  particle.reset = function (x, y, isSmall, color = null) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * (isSmall ? 7 : 12);
    this.vy = (Math.random() - 0.5) * (isSmall ? 7 : 12);
    this.size = isSmall ? Math.random() * 4 + 1 : Math.random() * 8 + 2;
    this.life = isSmall ? 35 : 50;
    this.active = true;
    this.color =
      color ||
      ["#FF4500", "#FF0000", "#FFFF00", "#FF69B4", "#00FFFF", "#FFA500"][
        Math.floor(Math.random() * 6)
      ];
    this.rotation = Math.random() * Math.PI * 2;
    this.hasTrail = Math.random() < 0.3;
    this.trailLength = Math.floor(Math.random() * 3) + 2;
    this.trailPositions = [];
  };

  return particle;
}

function createBullet(x, y, isEnemy, angle) {
  const bullet = {
    x,
    y,
    isEnemy,
    radius: isEnemy ? 6 : 4,
    speed: isEnemy ? 3 : -10,
    vx: Math.sin(angle) * (isEnemy ? 0 : 8),
    vy: isEnemy ? 3 : -10,
    trail: [],
    gravity: isEnemy ? GRAVITY : 0,
    pulse: 0,
    accel: 0.02,
  };

  bullet.update = function () {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.vy += this.gravity + (this.isEnemy ? this.accel : -this.accel);
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += 0.15;
  };

  bullet.draw = function (ctx) {
    this.trail.forEach((pos, index) => {
      ctx.fillStyle = `white`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * (index / 8 + 0.3), 0, Math.PI * 2);
      ctx.fill();
    });

    const pulseSize = this.radius * (1 + Math.sin(this.pulse) * 0.5);
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      pulseSize / 2,
      this.x,
      this.y,
      pulseSize
    );
    gradient.addColorStop(0, this.isEnemy ? "#FF4500" : "#00FF00");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${this.isEnemy ? "255, 69, 0" : "0, 255, 0"}, 0.3)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, pulseSize + 2, 0, Math.PI * 2);
    ctx.fill();
  };

  return bullet;
}

function createPlayer() {
  const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    targetX: CANVAS_WIDTH / 2,
    width: 50,
    height: 50,
    speed: 5,
    bullets: [],
    lastShot: 0,
    shotCount: 1,
    shield: false,
    speedBoost: 1,
    invincible: false,
    rapidFire: false,
    powerUpTimeouts: [],
    activePowerUps: [],
    powerUpAnimation: { scale: 1, alpha: 0 },
    lastHit: 0,
    invulnerabilityTime: 1000,
  };

  player.draw = function (ctx) {
    if (this.powerUpAnimation.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.powerUpAnimation.alpha;
      ctx.translate(this.x, this.y + this.height / 2);
      ctx.scale(this.powerUpAnimation.scale, this.powerUpAnimation.scale);
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
      ctx.fill();
      ctx.restore();
      this.powerUpAnimation.scale += 0.05;
      this.powerUpAnimation.alpha -= 0.02;
    }

    if (this.invincible) {
      ctx.strokeStyle = "gold";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        this.x,
        this.y + this.height / 2,
        this.width * 1.2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    if (this.speedBoost > 1) {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.x - this.width / 2 - 2,
        this.y - 2,
        this.width + 4,
        this.height + 4
      );
    }
    if (this.shield) {
      ctx.beginPath();
      ctx.arc(this.x, this.y + this.height / 2, this.width, 0, Math.PI * 2);
      ctx.strokeStyle = "green";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (this.shotCount > 1) {
      ctx.fillStyle = this.shotCount === 3 ? "purple" : "cyan";
      ctx.beginPath();
      ctx.arc(this.x - 20, this.y + 15, 4, 0, Math.PI * 2);
      ctx.arc(this.x + 20, this.y + 15, 4, 0, Math.PI * 2);
      if (this.shotCount === 5) {
        ctx.arc(this.x, this.y + 10, 4, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    const gradient = ctx.createLinearGradient(
      this.x - this.width / 2,
      this.y,
      this.x + this.width / 2,
      this.y + this.height
    );
    gradient.addColorStop(0, this.rapidFire ? "orange" : "white");
    gradient.addColorStop(1, "gray");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + 30, this.y + 60);
    ctx.lineTo(this.x + 15, this.y + 45);
    ctx.lineTo(this.x - 15, this.y + 45);
    ctx.lineTo(this.x - 30, this.y + 60);
    ctx.closePath();
    ctx.fill();
  };

  player.move = function (direction) {
    if (direction === "left" && this.targetX - this.width / 2 > 0) {
      this.targetX -= this.speed * this.speedBoost;
    }
    if (direction === "right" && this.targetX + this.width / 2 < CANVAS_WIDTH) {
      this.targetX += this.speed * this.speedBoost;
    }
  };

  player.update = function () {
    this.x += (this.targetX - this.x) * 0.3;
  };

  player.shoot = function (muted) {
    const now = Date.now();
    const fireRate = this.rapidFire ? 100 : 200;
    if (now - this.lastShot > fireRate) {
      let angles;
      if (this.shotCount === 1) angles = [0];
      else if (this.shotCount === 3) angles = [0, -0.2, 0.2];
      else angles = [0, -0.2, 0.2, -0.4, 0.4];
      angles.forEach((angle) => {
        this.bullets.push(createBullet(this.x, this.y, false, angle));
      });
      if (!muted)
        laserSound.cloneNode().play({
          volume: 0.5,
        });
      this.lastShot = now;
    }
  };

  player.applyPowerUp = function (type, muted) {
    this.powerUpAnimation = { scale: 1, alpha: 1 };
    switch (type) {
      case "triple":
        if (this.shotCount === 1) {
          this.shotCount = 3;
          this.activePowerUps.push("Triple Shot");
        }
        break;
      case "quintuple":
        if (this.shotCount === 3) {
          this.shotCount = 5;
          this.shield = true;
          this.activePowerUps = this.activePowerUps.filter(
            (p) => p !== "Triple Shot"
          );
          this.activePowerUps.push("Quintuple Shot + Shield");
          this.powerUpTimeouts.push(
            setTimeout(() => {
              this.shotCount = 3;
              this.activePowerUps = this.activePowerUps.filter(
                (p) => p !== "Quintuple Shot + Shield"
              );
              this.activePowerUps.push("Triple Shot");
            }, 10000)
          );
        }
        break;
      case "speed":
        if (this.speedBoost === 1) {
          this.speedBoost = 2;
          this.activePowerUps.push("Speed Boost");
          this.powerUpTimeouts.push(
            setTimeout(() => {
              this.speedBoost = 1;
              this.activePowerUps = this.activePowerUps.filter(
                (p) => p !== "Speed Boost"
              );
            }, 10000)
          );
        }
        break;
      case "shield":
        if (!this.shield) {
          this.shield = true;
          this.activePowerUps.push("Shield");
        }
        break;
      case "invincible":
        if (!this.invincible) {
          this.invincible = true;
          this.activePowerUps.push("Invincibility");
          this.powerUpTimeouts.push(
            setTimeout(() => {
              this.invincible = false;
              this.activePowerUps = this.activePowerUps.filter(
                (p) => p !== "Invincibility"
              );
            }, 5000)
          );
        }
        break;
      case "rapidFire":
        if (!this.rapidFire) {
          this.rapidFire = true;
          this.activePowerUps.push("Rapid Fire");
          this.powerUpTimeouts.push(
            setTimeout(() => {
              this.rapidFire = false;
              this.activePowerUps = this.activePowerUps.filter(
                (p) => p !== "Rapid Fire"
              );
            }, 5000)
          );
        }
        break;
    }
  };

  return player;
}

function createEnemy(x, y, type, width = 50, height = 50) {
  const enemy = {
    x,
    y,
    width,
    height,
    baseSpeed: type === "fast" ? 2 : type === "heavy" ? 1 : 1.5,
    health: 1,
    speed: type === "fast" ? 2 : type === "heavy" ? 1 : 1.5,
    vx: (Math.random() - 0.5) * 2,
    vy: type === "fast" ? 1 : type === "heavy" ? 0.5 : 0.75,
    lastShot: 0,
    type,
    wiggle: Math.random() * 0.15,
    toRemove: false,
  };

  enemy.draw = function (ctx) {
    const gradient = ctx.createLinearGradient(
      this.x - this.width / 2,
      this.y,
      this.x + this.width / 2,
      this.y + this.height
    );
    gradient.addColorStop(
      0,
      this.type === "fast"
        ? "#FF00FF"
        : this.type === "heavy"
        ? "#8A2BE2"
        : "#00CED1"
    );
    gradient.addColorStop(1, "white");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x + this.width / 4, this.y + this.height * 0.75);
    ctx.lineTo(this.x - this.width / 4, this.y + this.height * 0.75);
    ctx.lineTo(this.x - this.width / 2, this.y + this.height);
    ctx.closePath();
    ctx.fill();
  };

  enemy.update = function (score) {
    const speedMultiplier =
      score < 500
        ? 1
        : score < 1000
        ? 1.5
        : 1.5 + Math.min((score - 1000) / 2000, 0.5);
    this.speed = this.baseSpeed * speedMultiplier;
    this.vy += GRAVITY * 0.5;
    this.y += this.vy;
    this.x += this.vx + Math.sin(this.y * this.wiggle);
    this.vx *= 0.98;
    if (this.x < 0 || this.x > CANVAS_WIDTH) this.vx *= -1;
  };

  enemy.shoot = function (muted, score) {
    const now = Date.now();
    let shootChance = score < 500 ? 0.01 : score < 1000 ? 0.015 : 0.02;
    if (Math.random() < shootChance && now - this.lastShot > 2000) {
      this.lastShot = now;
      if (!muted)
        laserSound.cloneNode().play({
          volume: 0.5,
        });
      const bullets = [];
      const bulletCount = this.type === "heavy" && score >= 1000 ? 1 : 2;
      for (let i = 0; i < bulletCount; i++) {
        const offset = (i - (bulletCount - 1) / 2) * 10;
        bullets.push(
          createBullet(this.x + offset, this.y + this.height, true, 0)
        );
      }
      return bullets;
    }
    return null;
  };

  return enemy;
}

function createMothership(position = "left", color = "darkred") {
  const isLeft = position === "left";
  const mothership = {
    x: isLeft ? CANVAS_WIDTH / 4 : (CANVAS_WIDTH * 3) / 4,
    y: 50,
    width: 120,
    height: 80,
    health: 100,
    speed: isLeft ? 2 : 3,
    direction: isLeft ? 1 : -1,
    lastSpawn: 0,
    color: color,
    position: position,
  };

  mothership.draw = function (ctx) {
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      20,
      this.x,
      this.y,
      this.width / 2
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, "white");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x + this.width / 4, this.y + this.height * 0.75);
    ctx.lineTo(this.x - this.width / 4, this.y + this.height * 0.75);
    ctx.lineTo(this.x - this.width / 2, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    // Health bar
    const healthBarWidth = 80;
    const healthBarHeight = 8;
    const healthPercent = this.health / 100;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(
      this.x - healthBarWidth / 2,
      this.y - 20,
      healthBarWidth,
      healthBarHeight
    );

    const healthColor =
      this.health > 70 ? "#00FF00" : this.health > 30 ? "#FFFF00" : "#FF0000";
    ctx.fillStyle = healthColor;
    ctx.fillRect(
      this.x - healthBarWidth / 2,
      this.y - 20,
      healthBarWidth * healthPercent,
      healthBarHeight
    );

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.health.toString(), this.x, this.y + this.height / 2);
  };

  mothership.update = function (state) {
    this.x += this.speed * this.direction;
    if (
      this.x + this.width / 2 >= CANVAS_WIDTH - 20 ||
      this.x - this.width / 2 <= 20
    ) {
      this.direction *= -1;
    }

    const now = Date.now();
    const spawnRate =
      state.score < 500
        ? 2000
        : state.score < 1000
        ? 1500
        : Math.max(1000 - Math.floor((state.score - 1000) / 100), 800);

    // Random chance to spawn enemies
    if (
      now - this.lastSpawn > spawnRate &&
      state.enemies.length < state.maxEnemies &&
      Math.random() < 0.3 // 30% chance to spawn
    ) {
      this.spawnEnemy(state);
      this.lastSpawn = now;
    }
  };

  mothership.spawnEnemy = function (state) {
    const type =
      Math.random() < 0.3 ? "heavy" : Math.random() < 0.5 ? "fast" : "normal";
    const spawnX = this.x + (Math.random() - 0.5) * this.width;
    const spawnY = this.y + this.height / 2 + Math.random() * 20;
    const enemyWidth = this.width * 0.4;
    const enemyHeight = this.height * 0.4;
    const enemy = createEnemy(spawnX, spawnY, type, enemyWidth, enemyHeight);
    state.enemies.push(enemy);
  };

  mothership.onHit = function (state) {
    this.health--;
    createExplosion(state, this.x, this.y, true, "#FF4500");

    // Spawn enemies when hit
    if (Math.random() < 0.3) {
      for (let i = 0; i < 4 && state.enemies.length < state.maxEnemies; i++) {
        this.spawnEnemy(state);
      }
    }

    if (this.health <= 0) {
      createMassiveExplosion(state, this.x, this.y);
      if (!state.muted)
        mothershipExplosionSound.cloneNode().play({
          volume: 0.5,
        });

      // Check if both motherships are destroyed
      if (state.motherships.every((m) => m.health <= 0)) {
        state.gameOver = true;
      }
    }
  };

  return mothership;
}

function createStar(x, y) {
  const star = {
    x,
    y,
    size: Math.random() * 2 + 1,
    baseOpacity: 0.5,
    twinkleSpeed: Math.random() * 0.05 + 0.02,
    twinklePhase: Math.random() * Math.PI * 2,
  };

  star.draw = function (ctx) {
    const twinkle = Math.sin(
      Date.now() * this.twinkleSpeed + this.twinklePhase
    );
    const opacity = twinkle > 0.9 ? 1 : this.baseOpacity;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  };

  return star;
}

function createBlastar() {
  const state = {
    canvas: document.createElement("canvas"),
    ctx: null,
    player: createPlayer(),
    motherships: [createMothership("right", "darkblue")],
    enemies: [],
    particles: Array(300)
      .fill(null)
      .map(() => createParticle(0, 0, false)),
    enemyBullets: [],
    stars: Array.from({ length: 50 }, () =>
      createStar(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT)
    ),
    lastEnemySpawn: 0,
    score: 0,
    lives: 10,
    enemiesDestroyed: 0,
    bonusInterval: 100,
    keys: new Set(),
    gameOver: false,
    restartButton: document.createElement("button"),
    startButton: document.createElement("button"),
    muteButton: document.createElement("button"),
    muted: false,
    powerUpsActivated: {
      triple: false,
      quintuple: false,
      speed: false,
      shield: false,
      invincible: false,
      rapidFire: false,
    },
    screenShake: 0,
    maxEnemies: 5,
    lastMaxEnemiesUpdate: Date.now(),
    gameStarted: false,
  };

  try {
    state.canvas.width = CANVAS_WIDTH;
    state.canvas.height = CANVAS_HEIGHT;
    document.body.appendChild(state.canvas);
    const ctx = state.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    state.ctx = ctx;

    setupControls(state);
    setupUI(state);
    console.log("Game initialized successfully");
    gameLoop(state);
  } catch (e) {
    console.error("Game initialization failed:", e);
  }
}

function setupControls(state) {
  document.addEventListener("keydown", (e) => {
    if (!state.gameOver && state.gameStarted) {
      state.keys.add(e.key);
    } else if (e.key === "Enter") {
      if (state.gameOver) {
        // If game is over, restart the game
        showStartScreen(state);
      } else if (!state.gameStarted) {
        // If game hasn't started yet, start the game
        state.gameStarted = true;
        state.startButton.style.display = "none";
        resetGame(state);
      }
    }
  });

  document.addEventListener("keyup", (e) => state.keys.delete(e.key));
}

function setupUI(state) {
  state.restartButton.textContent = "Restart";
  state.restartButton.style.display = "none";
  state.restartButton.style.position = "absolute";
  state.restartButton.style.bottom = "120px";
  state.restartButton.style.padding = "10px 20px";
  state.restartButton.style.fontSize = "20px";
  state.restartButton.style.backgroundColor = "white";
  state.restartButton.style.color = "black";
  state.restartButton.style.border = "none";
  state.restartButton.style.cursor = "pointer";
  state.restartButton.addEventListener("click", () => showStartScreen(state));
  document.body.appendChild(state.restartButton);

  state.startButton.textContent = "Start";
  state.startButton.style.position = "absolute";
  state.startButton.style.bottom = "120px";
  state.startButton.style.padding = "10px 20px";
  state.startButton.style.fontSize = "20px";
  state.startButton.style.backgroundColor = "white";
  state.startButton.style.color = "black";
  state.startButton.style.border = "none";
  state.startButton.style.cursor = "pointer";
  state.startButton.addEventListener("click", () => {
    state.gameStarted = true;
    state.startButton.style.display = "none";
    resetGame(state);
  });
  document.body.appendChild(state.startButton);

  state.muteButton.textContent = "Mute";
  state.muteButton.style.position = "absolute";
  state.muteButton.style.right = "10px";
  state.muteButton.style.bottom = "10px";
  state.muteButton.style.padding = "5px 10px";
  document.body.appendChild(state.muteButton);
  state.muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    state.muteButton.textContent = state.muted ? "Unmute" : "Mute";
  });

  showStartScreen(state);
}

function showStartScreen(state) {
  state.gameOver = false;
  state.gameStarted = false;
  state.startButton.style.display = "block";
  state.restartButton.style.display = "none";
  state.enemies = [];
  state.enemyBullets = [];
  state.player.bullets = [];
  state.particles.forEach((p) => (p.active = false));
}

function resetGame(state) {
  state.player = createPlayer();
  state.motherships = [createMothership("right", "darkblue")];
  state.enemies = [];
  state.particles.forEach((p) => (p.active = false));
  state.enemyBullets = [];
  state.score = 0;
  state.lives = 100;
  state.enemiesDestroyed = 0;
  state.bonusInterval = 100;
  state.gameOver = false;
  state.keys.clear();
  state.powerUpsActivated = {
    triple: false,
    quintuple: false,
    speed: false,
    shield: false,
    invincible: false,
    rapidFire: false,
  };
  state.screenShake = 0;
  state.maxEnemies = 5;
  state.lastMaxEnemiesUpdate = Date.now();
}

function gameLoop(state) {
  state.ctx.fillStyle = "black";
  state.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  state.stars.forEach((star) => star.draw(state.ctx));

  if (!state.gameStarted) {
    state.ctx.fillStyle = "white";
    state.ctx.font = "32px Arial";
    state.ctx.textAlign = "center";
    state.ctx.fillText(
      "Defend Earth!",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 60
    );
    state.ctx.font = "24px Arial";
    state.ctx.fillText(
      "Save Earth from the alien invasion!",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 20
    );
    state.ctx.fillText(
      "Press Start to begin",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20
    );
  } else if (!state.gameOver) {
    if (state.keys.has("ArrowLeft")) state.player.move("left");
    if (state.keys.has("ArrowRight")) state.player.move("right");
    if (state.keys.has(" ")) state.player.shoot(state.muted);

    state.ctx.save();
    if (state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * state.screenShake;
      const dy = (Math.random() - 0.5) * state.screenShake;
      state.ctx.translate(dx, dy);
      state.screenShake -= 0.5;
    }

    const earthGradient = state.ctx.createLinearGradient(
      0,
      CANVAS_HEIGHT - 20,
      0,
      CANVAS_HEIGHT
    );
    earthGradient.addColorStop(0, "#006400");
    earthGradient.addColorStop(1, "#228B22");
    state.ctx.fillStyle = earthGradient;
    state.ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    state.ctx.fillStyle = "white";
    state.ctx.font = "12px Arial";
    state.ctx.textAlign = "left";
    state.ctx.fillText("< Move Left", 10, CANVAS_HEIGHT - 50);
    state.ctx.fillText("> Move Right", 10, CANVAS_HEIGHT - 30);
    state.ctx.fillText("Space: Shoot", 10, CANVAS_HEIGHT - 10);
    state.ctx.fillText(
      "Enter: Restart (when game over)",
      10,
      CANVAS_HEIGHT - 70
    );

    state.ctx.fillStyle = "white";
    state.ctx.font = "16px Arial";
    state.ctx.textAlign = "left";
    state.player.activePowerUps.forEach((powerUp, index) => {
      state.ctx.fillText(powerUp, 10, 60 + index * 20);
    });

    state.ctx.fillStyle = "yellow";
    state.ctx.font = "12px Arial";
    state.ctx.textAlign = "left";
    let nextMessageY = 60 + state.player.activePowerUps.length * 20;
    if (!state.powerUpsActivated.triple) {
      state.ctx.fillText("Score 100 to activate Triple Shot", 10, nextMessageY);
    } else if (!state.powerUpsActivated.quintuple) {
      state.ctx.fillText(
        "Score 500 to activate Quintuple Shot + Shield",
        10,
        nextMessageY
      );
    } else if (!state.powerUpsActivated.speed) {
      state.ctx.fillText(
        "Score 1000 to activate Speed Boost",
        10,
        nextMessageY
      );
    } else if (!state.powerUpsActivated.shield) {
      state.ctx.fillText("Score 1500 to activate Shield", 10, nextMessageY);
    } else if (!state.powerUpsActivated.invincible) {
      state.ctx.fillText(
        "Score 2000 to activate Invincibility",
        10,
        nextMessageY
      );
    } else if (!state.powerUpsActivated.rapidFire) {
      state.ctx.fillText("Score 2500 to activate Rapid Fire", 10, nextMessageY);
    }

    // Update and draw both motherships
    state.motherships.forEach((mothership) => {
      mothership.update(state);
      mothership.draw(state.ctx);
    });

    spawnEnemy(state);
    activatePowerUps(state);

    state.player.update();
    state.player.draw(state.ctx);

    const bulletsToRemove = [];
    const enemiesToRemove = [];
    const activeBullets = state.player.bullets.filter(
      (b) => b.y > 0 && b.x > 0 && b.x < CANVAS_WIDTH
    );
    state.player.bullets = activeBullets;
    activeBullets.forEach((bullet, bIndex) => {
      bullet.update();
      bullet.draw(state.ctx);
      state.enemies.forEach((enemy, eIndex) => {
        if (checkBulletCollision(bullet, enemy)) {
          enemy.health--;
          if (enemy.health <= 0) {
            createExplosion(state, enemy.x, enemy.y, false);
            enemiesToRemove.push(eIndex);
            state.score +=
              enemy.type === "fast" ? 10 : enemy.type === "heavy" ? 15 : 5;
            state.enemiesDestroyed++;
            if (state.enemiesDestroyed % 5 === 0) state.score += 25;
          }
          bulletsToRemove.push(bIndex);
        }
      });

      // Check collision with both motherships
      state.motherships.forEach((mothership) => {
        if (checkBulletCollision(bullet, mothership)) {
          mothership.onHit(state);
          bulletsToRemove.push(bIndex);
        }
      });
    });
    const uniqueBulletsToRemove = [...new Set(bulletsToRemove)].sort(
      (a, b) => b - a
    );
    const uniqueEnemiesToRemove = [...new Set(enemiesToRemove)].sort(
      (a, b) => b - a
    );
    uniqueBulletsToRemove.forEach((index) =>
      state.player.bullets.splice(index, 1)
    );
    uniqueEnemiesToRemove.forEach((index) => state.enemies.splice(index, 1));

    const enemyBulletsToRemove = [];
    const activeEnemies = state.enemies.filter((e) => e.y < CANVAS_HEIGHT);
    state.enemies = activeEnemies;
    activeEnemies.forEach((enemy) => {
      enemy.update(state.score);
      enemy.draw(state.ctx);

      const enemyBullets = enemy.shoot(state.muted, state.score);
      if (enemyBullets) state.enemyBullets.push(...enemyBullets);

      if (checkPlayerCollision(enemy, state.player)) {
        if (state.player.shield) {
          state.player.shield = false;
          state.player.activePowerUps = state.player.activePowerUps.filter(
            (p) => p !== "Shield" && p !== "Quintuple Shot + Shield"
          );
          if (
            state.player.activePowerUps.indexOf("Quintuple Shot + Shield") !==
            -1
          ) {
            state.player.activePowerUps = state.player.activePowerUps.filter(
              (p) => p !== "Quintuple Shot + Shield"
            );
            state.player.activePowerUps.push("Triple Shot");
          }
          createExplosion(state, enemy.x, enemy.y, false);
          state.enemies = state.enemies.filter((e) => e !== enemy);
        } else {
          state.lives--;
          createExplosion(state, enemy.x, enemy.y, false);
          state.enemies = state.enemies.filter((e) => e !== enemy);
          if (state.lives <= 0) {
            state.gameOver = true;
            createExplosion(state, state.player.x, state.player.y, false);
            if (!state.muted)
              gameOverSound.cloneNode().play({
                volume: 0.5,
              });
          }
        }
      } else if (enemy.y >= CANVAS_HEIGHT) {
        state.lives--;
        state.enemies = state.enemies.filter((e) => e !== enemy);
        console.log(`Enemy reached Earth - Lives: ${state.lives}`);
        if (state.lives <= 0) {
          state.gameOver = true;
          if (!state.muted)
            gameOverSound.cloneNode().play({
              volume: 0.5,
            });
        }
      }
    });

    const activeEnemyBullets = state.enemyBullets.filter(
      (b) => b.y < CANVAS_HEIGHT
    );
    state.enemyBullets = activeEnemyBullets;
    activeEnemyBullets.forEach((bullet, ebIndex) => {
      bullet.update();
      bullet.draw(state.ctx);
      if (checkPlayerBulletCollision(bullet, state.player)) {
        if (state.player.shield) {
          state.player.shield = false;
          state.player.activePowerUps = state.player.activePowerUps.filter(
            (p) => p !== "Shield" && p !== "Quintuple Shot + Shield"
          );
          if (
            state.player.activePowerUps.indexOf("Quintuple Shot + Shield") !==
            -1
          ) {
            state.player.activePowerUps = state.player.activePowerUps.filter(
              (p) => p !== "Quintuple Shot + Shield"
            );
            state.player.activePowerUps.push("Triple Shot");
          }
          enemyBulletsToRemove.push(ebIndex);
          createExplosion(state, bullet.x, bullet.y, true, "#00FFFF");
        } else {
          state.lives--;
          state.player.lastHit = Date.now();
          enemyBulletsToRemove.push(ebIndex);
          createExplosion(state, bullet.x, bullet.y, true, "#FF0000");
          createExplosion(
            state,
            state.player.x,
            state.player.y,
            true,
            "#FF8C00"
          );
          console.log(`Bullet hit player - Lives: ${state.lives}`);
          if (state.lives <= 0) {
            state.gameOver = true;
            createExplosion(state, state.player.x, state.player.y, false);
            if (!state.muted)
              gameOverSound.cloneNode().play({
                volume: 0.5,
              });
          }
        }
      }

      // Check for bullet-to-bullet collisions with enhanced visual effects
      activeBullets.forEach((pBullet, pbIndex) => {
        if (checkBulletCollision(pBullet, bullet)) {
          // Create a more impressive explosion when bullets collide
          createExplosion(state, bullet.x, bullet.y, true, "#FFFF00", 1.5);

          // Add a secondary explosion effect for more visual impact
          setTimeout(() => {
            if (state.ctx) {
              // Make sure the context still exists
              createExplosion(
                state,
                bullet.x + (Math.random() - 0.5) * 10,
                bullet.y + (Math.random() - 0.5) * 10,
                true,
                "#00FFFF",
                0.7
              );
            }
          }, 50);

          enemyBulletsToRemove.push(ebIndex);
          bulletsToRemove.push(pbIndex);
          state.score += 5;
        }
      });
    });
    const uniqueEnemyBulletsToRemove = [...new Set(enemyBulletsToRemove)].sort(
      (a, b) => b - a
    );
    uniqueEnemyBulletsToRemove.forEach((index) =>
      state.enemyBullets.splice(index, 1)
    );
    const uniqueBulletsToRemoveAgain = [...new Set(bulletsToRemove)].sort(
      (a, b) => b - a
    );
    uniqueBulletsToRemoveAgain.forEach((index) =>
      state.player.bullets.splice(index, 1)
    );

    state.particles.forEach((particle) => {
      if (particle.active) {
        particle.update();
        particle.draw(state.ctx);
      }
    });

    state.ctx.fillStyle = "white";
    state.ctx.font = "20px Arial";
    state.ctx.textAlign = "left";
    state.ctx.fillText(`Score: ${state.score}`, 10, 30);
    state.ctx.fillStyle = "white";
    state.ctx.fillText(`Lives: ${state.lives}`, CANVAS_WIDTH - 80, 30);

    if (state.score >= state.bonusInterval) {
      state.score += 50;
      state.bonusInterval += 100;
    }
  } else {
    // Game over screen
    const allMotherShipsDestroyed = state.motherships.every(
      (m) => m.health <= 0
    );
    state.ctx.fillStyle = allMotherShipsDestroyed ? "green" : "white";
    state.ctx.font = "48px Arial";
    state.ctx.textAlign = "center";
    state.ctx.fillText(
      allMotherShipsDestroyed ? "YOU SAVED EARTH!" : "GAME OVER",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 20
    );
    state.restartButton.style.display = "block";
  }

  state.ctx.restore();
  requestAnimationFrame(() => gameLoop(state));
}

function spawnEnemy(state) {
  const now = Date.now();
  if (now - state.lastMaxEnemiesUpdate > 5000) {
    state.maxEnemies = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    state.lastMaxEnemiesUpdate = now;
    console.log(`Max enemies updated to ${state.maxEnemies}`);
  }
}

function activatePowerUps(state) {
  if (state.score >= 100 && !state.powerUpsActivated.triple) {
    state.player.applyPowerUp("triple", state.muted);
    state.powerUpsActivated.triple = true;
  }
  if (state.score >= 500 && !state.powerUpsActivated.quintuple) {
    state.player.applyPowerUp("quintuple", state.muted);
    state.powerUpsActivated.quintuple = true;
  }
  if (state.score >= 1000 && !state.powerUpsActivated.speed) {
    state.player.applyPowerUp("speed", state.muted);
    state.powerUpsActivated.speed = true;
  }
  if (state.score >= 1500 && !state.powerUpsActivated.shield) {
    state.player.applyPowerUp("shield", state.muted);
    state.powerUpsActivated.shield = true;
  }
  if (state.score >= 2000 && !state.powerUpsActivated.invincible) {
    state.player.applyPowerUp("invincible", state.muted);
    state.powerUpsActivated.invincible = true;
  }
  if (state.score >= 2500 && !state.powerUpsActivated.rapidFire) {
    state.player.applyPowerUp("rapidFire", state.muted);
    state.powerUpsActivated.rapidFire = true;
  }
}

function checkBulletCollision(bullet, target) {
  const dx = bullet.x - target.x;
  const dy = bullet.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return (
    distance <
    bullet.radius + (target.radius ? target.radius : target.width / 2)
  );
}

function checkPlayerCollision(enemy, player) {
  if (player.invincible) return false;
  return (
    player.x + player.width / 2 > enemy.x - enemy.width / 2 &&
    player.x - player.width / 2 < enemy.x + enemy.width / 2 &&
    player.y < enemy.y + enemy.height &&
    player.y + player.height > enemy.y
  );
}

function checkPlayerBulletCollision(bullet, player) {
  if (Date.now() - player.lastHit < player.invulnerabilityTime) {
    return false;
  }

  const dx = bullet.x - player.x;
  const dy = bullet.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < bullet.radius + player.width / 2;
}

function createExplosion(
  state,
  x,
  y,
  isSmall,
  color = null,
  sizeMultiplier = 1
) {
  // Increase particle count for more impressive explosions
  const particleCount = isSmall ? 35 : 75;
  let spawned = 0;

  // Set random explosion color if not specified
  if (!color) {
    color = ["#FF4500", "#FF0000", "#FFFF00", "#FF69B4"][
      Math.floor(Math.random() * 4)
    ];
  }

  for (let i = 0; i < state.particles.length && spawned < particleCount; i++) {
    if (!state.particles[i].active) {
      state.particles[i].reset(x, y, isSmall, color);
      spawned++;
    }
  }

  if (!state.muted) {
    explosionSound.cloneNode().play({
      volume: 0.5,
    });
    // Increase screen shake for more impact
    state.screenShake = isSmall ? 8 : 15 * sizeMultiplier;
  }

  // Create explosion flash
  state.ctx.save();
  state.ctx.globalAlpha = 0.8; // Increased opacity for more visible flash

  // Create gradient for more realistic explosion
  const explosionRadius = (isSmall ? 30 : 60) * sizeMultiplier; // Larger radius
  const gradient = state.ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    explosionRadius
  );
  gradient.addColorStop(0, "white");
  gradient.addColorStop(0.3, color); // Adjusted color stop
  gradient.addColorStop(1, "transparent");

  state.ctx.fillStyle = gradient;
  state.ctx.beginPath();
  state.ctx.arc(x, y, explosionRadius, 0, Math.PI * 2);
  state.ctx.fill();

  // Add a second, smaller flash for more depth
  const innerGradient = state.ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    explosionRadius * 0.6
  );
  innerGradient.addColorStop(0, "white");
  innerGradient.addColorStop(0.5, "yellow");
  innerGradient.addColorStop(1, "transparent");

  state.ctx.globalAlpha = 0.7;
  state.ctx.fillStyle = innerGradient;
  state.ctx.beginPath();
  state.ctx.arc(x, y, explosionRadius * 0.6, 0, Math.PI * 2);
  state.ctx.fill();

  state.ctx.restore();
}

// Create a massive explosion effect for mothership destruction
function createMassiveExplosion(state, x, y) {
  // Create multiple explosions in a pattern
  for (let i = 0; i < 8; i++) {
    // Increased from 5 to 8 explosions
    const offsetX = (Math.random() - 0.5) * 150; // Increased spread
    const offsetY = (Math.random() - 0.5) * 150;
    const delay = i * 150; // Faster sequence
    const colors = ["#FF0000", "#FF4500", "#FFFF00", "#FF69B4"]; // Different colors

    setTimeout(() => {
      createExplosion(
        state,
        x + offsetX,
        y + offsetY,
        false,
        colors[i % colors.length],
        1 + Math.random() * 0.5 // Random size variation
      );
      state.screenShake = 15;
    }, delay);
  }

  // Create a final large explosion
  setTimeout(() => {
    createExplosion(state, x, y, false, "#FFFFFF", 3.0); // Larger, white explosion
    state.screenShake = 30; // More intense screen shake

    // Add debris particles flying outward
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 70;
      const debrisX = x + Math.cos(angle) * distance;
      const debrisY = y + Math.sin(angle) * distance;

      setTimeout(() => {
        createExplosion(state, debrisX, debrisY, true, "#FF4500", 0.5);
      }, 200 + Math.random() * 800);
    }
  }, 1000);
}

// Start the game
createBlastar();
