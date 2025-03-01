// blastar.ts

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.size = Math.random() * 5 + 2;
    this.life = 30;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(255, 165, 0, ${this.life / 30})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Player {
  x: number;
  y: number;
  targetX: number;
  width: number = 30;
  height: number = 20;
  speed: number = 15;
  bullets: Bullet[] = [];

  constructor() {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT - 40;
    this.targetX = this.x;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x - this.width / 2, this.y + this.height);
    ctx.closePath();
    ctx.fill();
  }

  move(direction: "left" | "right") {
    if (direction === "left" && this.targetX - this.width / 2 > 0) {
      this.targetX -= this.speed;
    }
    if (direction === "right" && this.targetX + this.width / 2 < CANVAS_WIDTH) {
      this.targetX += this.speed;
    }
  }

  update() {
    this.x += (this.targetX - this.x) * 0.2;
  }

  shoot() {
    this.bullets.push(new Bullet(this.x, this.y));
    new Audio("https://www.myinstants.com/media/sounds/laser.mp3").play();
  }
}

class Bullet {
  x: number;
  y: number;
  width: number = 2;
  height: number = 10;
  speed: number = 7;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "red";
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
  }

  update() {
    this.y -= this.speed;
  }
}

class Enemy {
  x: number;
  y: number;
  width: number = 20;
  height: number = 20;
  speed: number = 2;

  constructor() {
    this.x = Math.random() * (CANVAS_WIDTH - this.width);
    this.y = -this.height;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    this.y += this.speed;
  }
}

class Blastar {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  lastEnemySpawn: number = 0;
  score: number = 0;
  keys: Set<string> = new Set();
  gameOver: boolean = false;
  restartButton: HTMLButtonElement;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.player = new Player();
    this.restartButton = document.createElement("button");
    this.setupControls();
    this.setupRestartButton();
    this.gameLoop();
  }

  setupControls() {
    document.addEventListener("keydown", (e) => {
      if (!this.gameOver) {
        this.keys.add(e.key);
        if (e.key === " ") {
          this.player.shoot();
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
  }

  setupRestartButton() {
    this.restartButton.textContent = "Restart";
    this.restartButton.style.display = "none";
    this.restartButton.style.position = "absolute";
    this.restartButton.style.top = `${CANVAS_HEIGHT / 2 + 100}px`;
    this.restartButton.style.padding = "10px 20px";
    this.restartButton.style.fontSize = "20px";
    document.body.appendChild(this.restartButton);

    this.restartButton.addEventListener("click", () => {
      this.resetGame();
    });
  }

  spawnEnemy() {
    const now = Date.now();
    if (now - this.lastEnemySpawn > 1000) {
      this.enemies.push(new Enemy());
      this.lastEnemySpawn = now;
    }
  }

  checkBulletCollision(bullet: Bullet, enemy: Enemy): boolean {
    return (
      bullet.x > enemy.x &&
      bullet.x < enemy.x + enemy.width &&
      bullet.y > enemy.y &&
      bullet.y < enemy.y + enemy.height
    );
  }

  checkPlayerCollision(enemy: Enemy): boolean {
    return (
      this.player.x + this.player.width / 2 > enemy.x &&
      this.player.x - this.player.width / 2 < enemy.x + enemy.width &&
      this.player.y < enemy.y + enemy.height &&
      this.player.y + this.player.height > enemy.y
    );
  }

  createExplosion(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x + 10, y + 10));
    }
    new Audio(
      "https://www.myinstants.com/media/sounds/beast-explosion.mp3"
    ).play();
  }

  resetGame() {
    this.player = new Player();
    this.enemies = [];
    this.particles = [];
    this.score = 0;
    this.gameOver = false;
    this.restartButton.style.display = "none";
    this.keys.clear();
  }

  gameLoop() {
    if (!this.gameOver) {
      // Handle movement
      if (this.keys.has("ArrowLeft")) this.player.move("left");
      if (this.keys.has("ArrowRight")) this.player.move("right");

      // Clear canvas
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Spawn enemies
      this.spawnEnemy();

      // Update and draw player
      this.player.update();
      this.player.draw(this.ctx);

      // Update and draw bullets
      this.player.bullets = this.player.bullets.filter((b) => b.y > 0);
      this.player.bullets.forEach((bullet) => {
        bullet.update();
        bullet.draw(this.ctx);
      });

      // Update and draw enemies
      this.enemies = this.enemies.filter((e) => e.y < CANVAS_HEIGHT);
      this.enemies.forEach((enemy) => {
        enemy.update();
        enemy.draw(this.ctx);

        // Check bullet collisions
        this.player.bullets.forEach((bullet, bIndex) => {
          if (this.checkBulletCollision(bullet, enemy)) {
            this.createExplosion(enemy.x, enemy.y);
            this.enemies = this.enemies.filter((e) => e !== enemy);
            this.player.bullets.splice(bIndex, 1);
            this.score += 10;
          }
        });

        // Check player collision
        if (this.checkPlayerCollision(enemy)) {
          this.gameOver = true;
          this.createExplosion(this.player.x, this.player.y);
          new Audio(
            "https://www.myinstants.com/media/sounds/game-over.mp3"
          ).play();
        }
      });

      // Update and draw explosion particles
      this.particles = this.particles.filter((p) => p.life > 0);
      this.particles.forEach((particle) => {
        particle.update();
        particle.draw(this.ctx);
      });

      // Draw score (top center)
      this.ctx.fillStyle = "white";
      this.ctx.font = "20px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`Score: ${this.score}`, CANVAS_WIDTH / 2, 30);
    }

    // Game over screen
    if (this.gameOver) {
      this.ctx.fillStyle = "white";
      this.ctx.font = "48px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20); // Adjusted position
      this.restartButton.style.display = "block";
    }

    requestAnimationFrame(() => this.gameLoop());
  }
}

new Blastar();
