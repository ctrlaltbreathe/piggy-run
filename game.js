(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const startPanel = $('start-panel');
  const gameoverPanel = $('gameover-panel');
  const scoreLabel = $('score');
  const bestLabel = $('best');
  const worldBestLabel = $('world-best');
  const livesLabel = $('lives');
  const rules = window.PiggyRunRules;
  const cardMaker = window.PiggyRunShareCard;
  const API = 'https://piggybankbnb.com/api/piggy-run-score.php';
  const GAME_URL = 'https://piggybankbnb.com/piggy-run/';
  let muted = false;
  let audioContext;
  let best = 0;
  try { best = Number(localStorage.getItem('piggy-run-best-v5')) || 0; } catch (_) {}
  let earlierDeviceBest = 0;
  try { earlierDeviceBest = Math.max(Number(localStorage.getItem('piggy-run-best-v4')) || 0, Number(localStorage.getItem('piggy-run-best-v3')) || 0); } catch (_) {}
  if (earlierDeviceBest > 0) {
    $('old-device-best').hidden = false;
    $('old-device-best').textContent = 'Your earlier-rules device best: ' + earlierDeviceBest;
  }
  bestLabel.textContent = String(best);
  let worldBest = null;
  let player = null;
  let shareScore = null;
  let shareVerified = false;
  let shareFile = null;
  let shareGeneration = 0;
  let canNativeShare = false;
  try {
    const saved = JSON.parse(localStorage.getItem('piggy-run-player') || 'null');
    if (saved && typeof saved.id === 'string' && typeof saved.key === 'string') player = saved;
  } catch (_) {}

  function setPlayer(value) {
    if (!value || typeof value.id !== 'string' || typeof value.name !== 'string') return;
    const key = typeof value.key === 'string' ? value.key : player?.id === value.id ? player.key : null;
    if (!key) return;
    player = { id: value.id, key, name: value.name };
    try { localStorage.setItem('piggy-run-player', JSON.stringify(player)); } catch (_) {}
    $('player-name').textContent = 'You are ' + player.name;
    $('player-name-input').value = player.name.startsWith('Piggy ') ? '' : player.name;
    if (shareScore !== null) prepareShareCard();
  }

  async function prepareShareCard() {
    const generation = ++shareGeneration;
    const button = $('share-card');
    const status = $('share-status');
    shareFile = null;
    button.disabled = true;
    $('save-card').disabled = true;
    button.textContent = 'PREPARING SCORE CARD…';
    status.textContent = 'Making your PiggyBank score image.';
    try {
      if (!cardMaker) throw new Error('Card maker unavailable');
      const blob = await cardMaker.create({ score: shareScore, name: player?.name || 'Piggy Runner', verified: shareVerified });
      if (generation !== shareGeneration) return;
      shareFile = new File([blob], 'piggy-run-' + shareScore + '.png', { type: 'image/png' });
      canNativeShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] });
      button.textContent = canNativeShare ? 'SHARE SCORE CARD ↗' : 'SAVE SCORE CARD ↓';
      button.disabled = false;
      $('save-card').disabled = false;
      status.textContent = canNativeShare ? 'Choose Telegram from your phone’s share menu.' : 'Save the image, then send it in Telegram.';
    } catch (_) {
      if (generation !== shareGeneration) return;
      button.textContent = 'SCORE CARD UNAVAILABLE';
      status.textContent = 'The text link below still works.';
    }
  }

  function downloadShareCard() {
    const url = URL.createObjectURL(shareFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = shareFile.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  $('share-card').addEventListener('click', async () => {
    if (!shareFile) return;
    if (!canNativeShare) {
      downloadShareCard();
      return;
    }
    try {
      await navigator.share({
        files: [shareFile], title: 'Piggy Run score',
        text: 'I scored ' + shareScore + ' in Piggy Run! Can you beat me? ' + GAME_URL
      });
      $('share-status').textContent = 'Score card shared.';
    } catch (error) {
      if (error?.name === 'AbortError') return;
      downloadShareCard();
      $('share-status').textContent = 'Sharing was unavailable. Your score image was saved instead.';
    }
  });
  $('save-card').addEventListener('click', () => {
    if (shareFile) downloadShareCard();
  });

  function setLeaders(rows) {
    if (!Array.isArray(rows)) return;
    const list = $('leaders-list');
    list.textContent = '';
    if (rows.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'Be the first verified runner!';
      list.append(empty);
      return;
    }
    rows.slice(0, 10).forEach((row, index) => {
      const item = document.createElement('li');
      if (row.id === player?.id) item.classList.add('mine');
      for (const [className, value] of [['rank', '#' + (index + 1)], ['name', row.name], ['score', String(row.score)]]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = value;
        item.append(span);
      }
      list.append(item);
    });
  }

  const leadersPanel = $('leaders-panel');
  let leadersOpener = null;
  function openLeaders(event) {
    leadersOpener = event.currentTarget;
    leadersPanel.classList.remove('hidden');
    $('leaders-close').focus();
    request('status').then(result => { setWorldBest(result.best); setPreviousBest(result.previousBest); setLeaders(result.leaders); }).catch(() => {});
  }
  function closeLeaders() {
    leadersPanel.classList.add('hidden');
    leadersOpener?.focus();
  }
  for (const id of ['leaders-button', 'show-leaders-start', 'show-leaders-over']) $(id).addEventListener('click', openLeaders);
  $('leaders-close').addEventListener('click', closeLeaders);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !leadersPanel.classList.contains('hidden')) closeLeaders(); });
  if (player?.name) $('player-name').textContent = 'You are ' + player.name;
  if (player?.name && !player.name.startsWith('Piggy ')) $('player-name-input').value = player.name;
  $('save-player-name').addEventListener('click', async () => {
    if (!player) return;
    const button = $('save-player-name');
    const status = $('name-status');
    button.disabled = true;
    status.textContent = 'Saving name…';
    try {
      const result = await request('rename', { playerId: player.id, playerKey: player.key, name: $('player-name-input').value });
      setPlayer(result.player);
      setLeaders(result.leaders);
      status.textContent = 'Saved! Your score appears as ' + player.name + '.';
    } catch (error) { status.textContent = error.message || 'Could not save name.'; }
    finally { button.disabled = false; }
  });

  async function request(action, data = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(API, {
        method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rulesVersion: 5, ...data }), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Record service unavailable');
      return result;
    } finally { clearTimeout(timer); }
  }

  function setWorldBest(value) {
    if (Number.isSafeInteger(value) && value >= 0) {
      worldBest = value;
      worldBestLabel.textContent = String(value);
      $('record-status').textContent = 'World record is checked by the PiggyBank server. No wallets or rewards.';
    }
  }

  function setPreviousBest(value) {
    if (Number.isSafeInteger(value) && value > 0) {
      $('previous-best').hidden = false;
      $('previous-best').textContent = 'Previous game rules record: ' + value;
      $('record-status').textContent = 'New pace and hazards are live. The earlier record remains archived.';
    }
  }

  request('status').then(result => { setWorldBest(result.best); setPreviousBest(result.previousBest); setLeaders(result.leaders); }).catch(() => {
    $('record-status').textContent = 'Record service unavailable. You can still play for fun.';
    $('leaders-list').textContent = 'Scores are temporarily unavailable.';
  });

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
      this.run = null;
      this.runToken = null;
      this.jumps = [];
      this.accumulator = 0;
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
      // Downward market arrow and a torn rug add distinct crypto hazards.
      g.fillStyle(0xa7193c).fillRoundedRect(8, 5, 18, 35, 4);
      g.fillStyle(0xff5261).fillTriangle(2, 31, 52, 31, 27, 69);
      g.lineStyle(3, 0xffa2a7).lineBetween(17, 12, 17, 28);
      g.generateTexture('dip', 55, 72).clear();
      g.fillStyle(0x472640).fillRoundedRect(4, 31, 59, 31, 5);
      g.fillStyle(0xb24276).fillRoundedRect(4, 24, 59, 31, 4);
      g.lineStyle(4, 0xff9ebd).lineBetween(6, 38, 62, 38);
      for (let x = 9; x < 63; x += 10) g.lineBetween(x, 54, x, 66);
      g.generateTexture('rug', 68, 70).clear();
      // Teal USDT coin.
      g.fillStyle(0x0c755f).fillCircle(31, 31, 29);
      g.fillStyle(0x3ce3a8).fillCircle(29, 28, 27);
      g.lineStyle(3, 0xc8ffdd).strokeCircle(29, 28, 22);
      g.fillStyle(0xeafff2).fillRect(16, 16, 27, 6).fillRect(26, 21, 7, 24).fillEllipse(29, 27, 25, 5);
      g.generateTexture('coin', 62, 62).clear();
      // A larger USDT bag is worth four regular coins.
      g.fillStyle(0x176a59).fillRoundedRect(19, 3, 29, 12, 4);
      g.fillStyle(0x2de3a4).fillTriangle(9, 15, 57, 15, 33, 3);
      g.fillStyle(0x158169).fillRoundedRect(4, 18, 59, 48, 16);
      g.fillStyle(0x46e9ac).fillRoundedRect(8, 19, 50, 43, 14);
      g.lineStyle(3, 0xd0ffdf).strokeRoundedRect(10, 22, 46, 36, 12);
      g.fillStyle(0xeafff2).fillRect(21, 34, 24, 5).fillRect(30, 39, 6, 13).fillEllipse(33, 35, 22, 5);
      g.generateTexture('bag', 68, 70).clear();
      // Flying red candle drone: passing underneath is safe.
      g.lineStyle(4, 0xff8a93).lineBetween(7, 10, 66, 10);
      g.lineStyle(4, 0xff8a93).lineBetween(14, 7, 14, 24).lineBetween(59, 7, 59, 24);
      g.fillStyle(0x792039).fillRoundedRect(8, 20, 59, 34, 10);
      g.fillStyle(0xef4d64).fillRoundedRect(10, 19, 55, 31, 9);
      g.fillStyle(0xffb4b7).fillRect(21, 26, 8, 16);
      g.fillStyle(0xffd3d1).fillTriangle(42, 30, 57, 30, 49, 42);
      g.generateTexture('drone', 76, 62).clear();
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
    }
    createPlayer() {
      this.player = this.add.image(Math.max(85, this.scale.width * .2), this.groundY - 41, 'pig');
      this.player.setDisplaySize(118, 81).setDepth(3);
      this.runTween = this.tweens.add({ targets: this.player, angle: { from: -3, to: 3 }, duration: 130, yoyo: true, repeat: -1, paused: true });
    }
    async startRun() {
      if (this.state === 'starting') return;
      this.state = 'starting';
      shareScore = null;
      shareFile = null;
      shareGeneration++;
      const button = gameoverPanel.classList.contains('hidden') ? $('start') : $('restart');
      button.disabled = true;
      let seed, token = null;
      try {
        const result = await request('start', player ? { playerId: player.id, playerKey: player.key } : {});
        seed = result.seed;
        token = result.token;
        setWorldBest(result.best);
        setPreviousBest(result.previousBest);
        setPlayer(result.player);
        setLeaders(result.leaders);
      } catch (_) {
        seed = crypto.getRandomValues(new Uint32Array(1))[0];
        $('record-status').textContent = 'Record service unavailable. You can still play for fun.';
      }
      button.disabled = false;
      for (const object of this.objects) object.image.destroy();
      this.objects = [];
      this.run = rules.create(seed);
      this.runToken = token;
      this.jumps = [];
      this.accumulator = 0;
      this.renderIndex = 0;
      this.state = 'running';
      leadersPanel.classList.add('hidden');
      $('name-controls').classList.add('hidden');
      this.player.clearTint().setAlpha(1).setAngle(0).setPosition(Math.max(85, this.scale.width * .2), this.groundY - 41);
      this.runTween.resume();
      startPanel.classList.add('hidden');
      gameoverPanel.classList.add('hidden');
      app.classList.add('playing');
      this.updateHud();
      $('tap-hint').textContent = 'TAP TO JUMP ↑ · PACE 1';
      sound(440, .08, 'triangle', 680);
    }
    jump() {
      if (this.state !== 'running' || this.run.y10 !== 0) return;
      const tick = this.run.tick + 1;
      if (this.jumps[this.jumps.length - 1] === tick) return;
      this.jumps.push(tick);
      this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.08, scaleY: this.player.scaleY * .92, duration: 110, yoyo: true });
      sound(450, .16, 'sine', 780);
    }
    renderObjects() {
      const playerX = Math.max(85, this.scale.width * .2);
      const stepDistance = 0.006;
      while (this.renderIndex < this.run.events.length && this.run.events[this.renderIndex].tick * 1000 - this.run.distance1000 <= 70000) {
        const event = this.run.events[this.renderIndex++];
        const coin = event.type.startsWith('coin') || event.type === 'bag';
        const size = event.type === 'bag' ? [53, 55] : coin ? [43, 43] : event.type === 'drone' ? [66, 54] : event.type === 'bear' ? [62, 62] : event.type === 'rug' ? [62, 59] : [49, 59];
        const y = event.type === 'bag' ? this.groundY - 102 : event.type === 'drone' ? this.groundY - 138 : coin ? this.groundY - (event.type === 'coin-high' ? 147 : event.type === 'coin-mid' ? 121 : 95) : this.groundY - size[1] / 2 + 1;
        const image = this.add.image(0, y, event.type.startsWith('coin') ? 'coin' : event.type).setDisplaySize(size[0], size[1]).setDepth(coin ? 2 : 3);
        this.objects.push({ event, image });
      }
      this.objects = this.objects.filter(({ event, image }) => {
        const remaining = event.tick * 1000 - this.run.distance1000;
        if (event.collected) {
          this.tweens.add({ targets: image, y: image.y - 24, alpha: 0, duration: 170, onComplete: () => image.destroy() });
          return false;
        }
        image.x = playerX + remaining * stepDistance;
        if (image.x < -image.displayWidth / 2 - 12) { image.destroy(); return false; }
        if (event.type.startsWith('coin') || event.type === 'bag') image.angle = Math.sin(this.run.tick / 8 + event.tick / 12) * 9;
        if (event.type === 'drone') image.y = this.groundY - 138 + Math.sin(this.run.tick / 5 + event.tick) * 4;
        return true;
      });
    }
    updateHud() {
      const score = this.run ? rules.score(this.run) : 0;
      const lives = this.run ? this.run.lives : 3;
      scoreLabel.textContent = String(score);
      bestLabel.textContent = String(Math.max(best, score));
      livesLabel.textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
      livesLabel.setAttribute('aria-label', lives + (lives === 1 ? ' life' : ' lives'));
    }
    endRun() {
      this.state = 'over';
      this.runTween.pause();
      app.classList.remove('playing');
      this.player.setTint(0xff9a9e);
      const score = rules.score(this.run);
      const record = score > best;
      if (record) {
        best = score;
        try { localStorage.setItem('piggy-run-best-v5', String(best)); } catch (_) {}
      }
      $('final-score').textContent = String(score);
      $('best-message').textContent = record ? 'New personal best! ✨' : 'Best score: ' + best;
      shareScore = score;
      shareVerified = false;
      prepareShareCard();
      const verification = $('verification-status');
      verification.textContent = this.runToken ? 'Checking this run with the server…' : 'Casual run. Record service unavailable.';
      $('name-controls').classList.add('hidden');
      if (this.runToken) {
        request('finish', { token: this.runToken, ticks: this.run.tick, jumps: this.jumps }).then(result => {
          if (result.score !== score) throw new Error('Verified score mismatch');
          setWorldBest(result.best);
          setPreviousBest(result.previousBest);
          setLeaders(result.leaders);
          verification.textContent = result.newBest ? 'Verified new world record! 🏆' : 'Score verified by the PiggyBank server.';
          $('name-controls').classList.remove('hidden');
          shareVerified = true;
          prepareShareCard();
        }).catch(() => { verification.textContent = 'Run could not be verified. Your personal best is saved on this device.'; });
      }
      const url = new URL(GAME_URL);
      url.hash = '';
      url.search = '';
      $('telegram-share').href = 'https://t.me/share/url?url=' + encodeURIComponent(url.href) + '&text=' + encodeURIComponent('I scored ' + score + ' in Piggy Run! Can you beat me? 🐷🪙');
      gameoverPanel.classList.remove('hidden');
      this.updateHud();
    }
    onResize(gameSize) {
      this.drawWorld();
      this.player.x = Math.max(85, gameSize.width * .2);
      this.player.y = this.groundY - 41 + (this.run?.y10 || 0) / 10;
    }
    update(_, delta) {
      if (this.state !== 'running') return;
      this.accumulator += Math.min(delta, 100);
      while (this.accumulator >= rules.STEP_MS && !this.run.over) {
        this.accumulator -= rules.STEP_MS;
        const result = rules.step(this.run, this.jumps[this.jumps.length - 1] === this.run.tick + 1);
        if (result.pickup) {
          sound(result.pickup >= 100 ? 1080 : 850, .12, 'sine', result.pickup >= 100 ? 1500 : 1250);
          const bonus = this.add.text(this.player.x + 12, this.player.y - 48, '+' + result.pickup, {
            fontFamily: 'Arial, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#94ffd3', stroke: '#123c48', strokeThickness: 4
          }).setDepth(8);
          this.tweens.add({ targets: bonus, y: bonus.y - 36, alpha: 0, duration: 700, onComplete: () => bonus.destroy() });
        }
        if (result.levelUp) {
          const pace = rules.level(this.run);
          $('tap-hint').textContent = 'TAP TO JUMP ↑ · PACE ' + pace;
          const notice = this.add.text(this.scale.width / 2, this.groundY - 210, 'PACE ' + pace + ' · MARKET HEATS UP!', {
            fontFamily: 'Arial, sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#ffd35f', stroke: '#172344', strokeThickness: 5
          }).setOrigin(.5).setDepth(9);
          this.tweens.add({ targets: notice, y: notice.y - 35, alpha: 0, duration: 1300, onComplete: () => notice.destroy() });
          sound(530, .18, 'triangle', 930);
        }
        if (result.hit) {
          this.cameras.main.shake(140, .006);
          sound(240, .24, 'sawtooth', 80);
        }
      }
      this.player.y = this.groundY - 41 + this.run.y10 / 10;
      if (this.run.immune > 0) {
        this.player.setTint(0xff6971).setAlpha(Math.floor(this.run.immune / 5) % 2 ? .55 : 1);
      } else this.player.clearTint().setAlpha(1);
      this.renderObjects();
      this.updateHud();
      if (this.run.over || this.run.tick >= rules.MAX_TICKS) this.endRun();
    }
  }

  if (!window.Phaser || !rules) {
    $('start-title').textContent = 'GAME UNAVAILABLE';
    startPanel.querySelector('p:not(.eyebrow)').textContent = 'The game engine could not load. Please refresh when you are online.';
    $('start').hidden = true;
    return;
  }
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game',
    backgroundColor: '#142441',
    scale: { mode: Phaser.Scale.RESIZE, width: app.clientWidth, height: app.clientHeight, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: Runner,
    render: { antialias: true, pixelArt: false }
  });
})();
