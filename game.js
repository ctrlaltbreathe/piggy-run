(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const startPanel = $('start-panel');
  const gameoverPanel = $('gameover-panel');
  const scoreLabel = $('score');
  const bestLabel = $('best');
  const livesLabel = $('lives');
  let muted = false;
  let audioContext;
  let best = 0;
  try { best = Number(localStorage.getItem('piggy-run-best')) || 0; } catch (_) {}
  bestLabel.textContent = String(best);

  function sound(frequency, duration, kind = 'sine', endFrequency = frequency) {
    if (muted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      oscillator.type = kind;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (_) {}
  }

  class Runner extends Phaser.Scene {
    constructor() { super('runner'); }
    preload() {
      this.load.image('pig', 'assets/piggy-runner.png');
    }
    create() {
      this.state = 'ready';
      this.score = 0;
      this.lives = 3;
      this.elapsed = 0;
      this.nextObstacle = 1400;
      this.nextCoin = 900;
      this.invulnerable = 0;
      this.objects = [];
      this.makeTextures();
      this.drawWorld();
      this.createPlayer();
      this.input.on('pointerdown', () => this.jump());
      this.input.keyboard.on('keydown-SPACE', (event) => { event.preventDefault(); this.jump(); });
      this.input.keyboard.on('keydown-UP', (event) => { event.preventDefault(); this.jump(); });
      this.scale.on('resize', this.onResize, this);
      this.updateHud();
      $('start').addEventListener('click', () => this.startRun());
      $('restart').addEventListener('click', () => this.startRun());
      $('sound').addEventListener('click', () => {
        muted = !muted;
        $('sound').textContent = muted ? '♪̸' : '♫';
        $('sound').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'running') this.scene.pause();
        else if (!document.hidden && this.scene.isPaused()) this.scene.resume();
      });
    }
    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff).fillRect(0, 0, 2, 2).generateTexture('pixel', 2, 2).clear();
      // Red market candle with a dark wick and gloss.
      g.lineStyle(6, 0x58192c).lineBetween(31, 0, 31, 72);
      g.fillStyle(0x79172e).fillRoundedRect(7, 10, 48, 55, 7);
      g.fillStyle(0xf14255).fillRoundedRect(5, 8, 48, 55, 7);
      g.fillStyle(0xff8990).fillRoundedRect(11, 13, 8, 44, 4);
      g.generateTexture('candle', 64, 76).clear();
      // Bear face obstacle.
      g.fillStyle(0x422738).fillCircle(15, 17, 13).fillCircle(55, 17, 13);
      g.fillStyle(0x8a4d52).fillCircle(35, 40, 31);
      g.fillStyle(0xbd7c72).fillEllipse(35, 54, 32, 23);
      g.fillStyle(0x261e30).fillCircle(24, 36, 4).fillCircle(47, 36, 4).fillCircle(35, 51, 5);
      g.fillStyle(0xff9b9c).fillCircle(15, 17, 6).fillCircle(55, 17, 6);
      g.generateTexture('bear', 72, 74).clear();
      // Teal USDT coin.
      g.fillStyle(0x0c755f).fillCircle(31, 31, 29);
      g.fillStyle(0x3ce3a8).fillCircle(29, 28, 27);
      g.lineStyle(3, 0xc8ffdd).strokeCircle(29, 28, 22);
      g.fillStyle(0xeafff2).fillRect(16, 16, 27, 6).fillRect(26, 21, 7, 24).fillEllipse(29, 27, 25, 5);
      g.generateTexture('coin', 62, 62).clear();
      g.destroy();
    }
    drawWorld() {
      const w = this.scale.width, h = this.scale.height;
      this.groundY = h - Math.max(95, h * 0.18);
      if (this.background) this.background.destroy();
      this.background = this.add.graphics().setDepth(-10);
      const bg = this.background;
      bg.fillGradientStyle(0x102445, 0x102445, 0x4f668b, 0x4f668b).fillRect(0, 0, w, h);
      bg.fillStyle(0xfbc767, 0.26).fillCircle(w * .77, h * .29, Math.min(w, h) * .13);
      bg.fillStyle(0xffdb8a, 0.38).fillCircle(w * .77, h * .29, Math.min(w, h) * .08);
      // Distant price chart and skyline provide movement cues without affecting play.
      bg.lineStyle(3, 0x70cdbf, .18).beginPath().moveTo(0, h * .48);
      for (let x = 0; x <= w; x += 70) bg.lineTo(x, h * (.43 + .055 * Math.sin(x / 69)));
      bg.strokePath();
      bg.fillStyle(0x243a61, .8);
      for (let x = 0; x < w; x += 57) {
        const height = 45 + ((x * 7) % 85);
        bg.fillRect(x, this.groundY - height, 43, height);
      }
      bg.fillStyle(0x1a2a4a).fillRect(0, this.groundY, w, h - this.groundY);
      bg.fillStyle(0x75e2c5).fillRect(0, this.groundY, w, 5);
      bg.fillStyle(0x334763).fillRect(0, this.groundY + 20, w, 4);
      if (this.ground) this.ground.destroy();
      this.ground = this.physics.add.staticImage(w / 2, this.groundY + 14, 'pixel');
      this.ground.setDisplaySize(w, 28).refreshBody().setVisible(false);
    }
    createPlayer() {
      this.player = this.physics.add.sprite(Math.max(85, this.scale.width * .2), this.groundY - 45, 'pig');
      this.player.setDisplaySize(118, 81).setDepth(3);
      this.player.body.setSize(this.player.width * .70, this.player.height * .65);
      this.player.body.setOffset(this.player.width * .16, this.player.height * .25);
      this.player.setGravityY(1500).setCollideWorldBounds(false);
      this.physics.add.collider(this.player, this.ground);
      this.runTween = this.tweens.add({ targets: this.player, angle: { from: -3, to: 3 }, duration: 130, yoyo: true, repeat: -1, paused: true });
    }
    startRun() {
      for (const object of this.objects) object.destroy();
      this.objects = [];
      this.state = 'running';
      this.score = 0;
      this.lives = 3;
      this.elapsed = 0;
      this.nextObstacle = 1250;
      this.nextCoin = 700;
      this.invulnerable = 0;
      this.player.clearTint().setAlpha(1).setAngle(0).setPosition(Math.max(85, this.scale.width * .2), this.groundY - 45);
      this.player.setVelocity(0, 0).setActive(true).setVisible(true);
      this.runTween.resume();
      startPanel.classList.add('hidden');
      gameoverPanel.classList.add('hidden');
      app.classList.add('playing');
      this.updateHud();
      sound(440, .08, 'triangle', 680);
    }
    jump() {
      if (this.state !== 'running') return;
      if (this.player.body.blocked.down || this.player.body.touching.down || (this.player.y >= this.groundY - 50 && this.player.body.velocity.y >= 0)) {
        this.player.setVelocityY(-690);
        this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.08, scaleY: this.player.scaleY * .92, duration: 110, yoyo: true });
        sound(450, .16, 'sine', 780);
      }
    }
    addObject(key, y, size, type) {
      const object = this.physics.add.image(this.scale.width + 45, y, key).setDisplaySize(size[0], size[1]).setDepth(type === 'coin' ? 2 : 3);
      object.body.setAllowGravity(false);
      object.body.setImmovable(true);
      object.body.setSize(object.width * .78, object.height * .78);
      object.body.setOffset(object.width * .11, object.height * .11);
      object.kind = type;
      object.used = false;
      this.objects.push(object);
      this.physics.add.overlap(this.player, object, () => {
        if (object.used || this.state !== 'running') return;
        object.used = true;
        if (type === 'coin') {
          this.score += 25;
          this.updateHud();
          sound(850, .12, 'sine', 1250);
          this.tweens.add({ targets: object, y: object.y - 25, alpha: 0, duration: 180, onComplete: () => object.destroy() });
        } else if (this.invulnerable <= 0) {
          this.lives--;
          this.invulnerable = 1350;
          this.player.setTint(0xff6971);
          this.cameras.main.shake(140, .006);
          sound(240, .24, 'sawtooth', 80);
          this.updateHud();
          if (this.lives <= 0) this.endRun();
        }
      });
      return object;
    }
    spawnObstacle() {
      const bear = Math.random() < .36;
      const height = bear ? 62 : 59;
      this.addObject(bear ? 'bear' : 'candle', this.groundY - height / 2 + 1, bear ? [62, 62] : [49, 59], bear ? 'bear' : 'candle');
    }
    spawnCoin() {
      const high = Math.random() < .45;
      this.addObject('coin', this.groundY - (high ? 147 : 95), [43, 43], 'coin');
    }
    updateHud() {
      scoreLabel.textContent = String(Math.floor(this.score));
      bestLabel.textContent = String(Math.max(best, Math.floor(this.score)));
      livesLabel.textContent = Array.from({ length: 3 }, (_, i) => i < this.lives ? '♥' : '♡').join(' ');
      livesLabel.setAttribute('aria-label', this.lives + (this.lives === 1 ? ' life' : ' lives'));
    }
    endRun() {
      this.state = 'over';
      this.runTween.pause();
      app.classList.remove('playing');
      this.player.setTint(0xff9a9e);
      const score = Math.floor(this.score);
      const record = score > best;
      if (record) {
        best = score;
        try { localStorage.setItem('piggy-run-best', String(best)); } catch (_) {}
      }
      $('final-score').textContent = String(score);
      $('best-message').textContent = record ? 'New personal best! ✨' : 'Best score: ' + best;
      const url = new URL(location.href);
      url.hash = '';
      url.search = '';
      $('telegram-share').href = 'https://t.me/share/url?url=' + encodeURIComponent(url.href) + '&text=' + encodeURIComponent('I scored ' + score + ' in Piggy Run! Can you beat me? 🐷🪙');
      gameoverPanel.classList.remove('hidden');
      this.updateHud();
    }
    onResize(gameSize) {
      this.drawWorld();
      this.physics.add.collider(this.player, this.ground);
      this.player.x = Math.max(85, gameSize.width * .2);
      if (this.state !== 'running') this.player.y = this.groundY - 45;
    }
    update(_, delta) {
      if (this.state !== 'running') return;
      const dt = Math.min(delta, 50);
      this.elapsed += dt;
      this.score += dt * .009;
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      if (this.invulnerable <= 0) this.player.clearTint().setAlpha(1);
      else this.player.setAlpha(Math.floor(this.invulnerable / 110) % 2 ? .45 : 1);
      const seconds = this.elapsed / 1000;
      const speed = Math.min(this.scale.width < 500 ? 360 : 460, (this.scale.width < 500 ? 205 : 255) + seconds * 3.6);
      this.nextObstacle -= dt;
      this.nextCoin -= dt;
      if (this.nextObstacle <= 0) {
        this.spawnObstacle();
        this.nextObstacle = Math.max(1050, 1750 - seconds * 11) + Math.random() * 230;
      }
      if (this.nextCoin <= 0) {
        this.spawnCoin();
        this.nextCoin = 1250 + Math.random() * 700;
      }
      for (const object of this.objects) {
        if (!object.active || object.used) continue;
        object.setVelocityX(-speed);
        if (object.kind === 'coin') object.angle = Math.sin(this.elapsed / 160 + object.x / 45) * 9;
        if (object.x < -90) object.destroy();
      }
      this.objects = this.objects.filter(object => object.active);
      if (this.player.y > this.scale.height + 100) this.endRun();
      this.updateHud();
    }
  }

  if (!window.Phaser) {
    $('start-title').textContent = 'GAME UNAVAILABLE';
    startPanel.querySelector('p:not(.eyebrow)').textContent = 'The game engine could not load. Please refresh when you are online.';
    $('start').hidden = true;
    return;
  }
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#142441',
    scale: { mode: Phaser.Scale.RESIZE, width: app.clientWidth, height: app.clientHeight, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: Runner,
    render: { antialias: true, pixelArt: false }
  });
})();