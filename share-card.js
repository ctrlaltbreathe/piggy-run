(function (root) {
  'use strict';

  const SIZE = 1080;
  const GAME_URL = 'piggybankbnb.com/piggy-run/';

  function rounded(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function mascot() {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'assets/piggy-runner.png';
    });
  }

  async function create({ score, name, verified }) {
    if (!Number.isSafeInteger(score) || score < 0) throw new Error('Invalid score');
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    const sky = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    sky.addColorStop(0, '#0e1937');
    sky.addColorStop(.55, '#1a3158');
    sky.addColorStop(1, '#102d44');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(255, 211, 79, .1)';
    ctx.beginPath();
    ctx.arc(844, 320, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 211, 79, .18)';
    ctx.beginPath();
    ctx.arc(844, 320, 115, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 228, 198, .2)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 685);
    for (let x = 0; x <= SIZE; x += 60) ctx.lineTo(x, 675 + Math.sin(x / 95) * 48);
    ctx.stroke();

    rounded(ctx, 42, 42, 996, 996, 56);
    ctx.fillStyle = 'rgba(12, 28, 56, .58)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(195, 231, 244, .35)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#68e6c6';
    ctx.fillText('PIGGYBANK ARCADE', 540, 126);
    ctx.font = 'bold 108px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#ffd34f';
    ctx.fillText('PIGGY RUN', 540, 236, 900);
    ctx.font = 'bold 42px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#e9f5ff';
    ctx.fillText('I SCORED', 540, 351);

    const digits = String(score).length;
    ctx.font = `bold ${digits > 6 ? 174 : digits > 4 ? 208 : 250}px Trebuchet MS, Arial, sans-serif`;
    ctx.shadowColor = 'rgba(253, 174, 54, .45)';
    ctx.shadowBlur = 36;
    ctx.fillStyle = '#ffcf49';
    ctx.fillText(score.toLocaleString('en-US'), 540, 495, 900);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 39px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#c9e6f4';
    ctx.fillText('POINTS', 540, 625);

    ctx.textAlign = 'left';
    ctx.font = 'bold 34px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#80e8cb';
    ctx.fillText(verified ? 'SERVER-VERIFIED RUN' : 'PERSONAL RUN', 100, 721, 580);
    ctx.font = 'bold 53px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name || 'Piggy Runner', 100, 787, 560);
    ctx.font = 'bold 43px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#ffd34f';
    ctx.fillText('CAN YOU BEAT ME?', 100, 866, 620);

    const pig = await mascot();
    if (pig) {
      ctx.shadowColor = 'rgba(255, 186, 39, .45)';
      ctx.shadowBlur = 32;
      ctx.drawImage(pig, 655, 704, 335, 221);
      ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = 'rgba(104, 230, 198, .6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(100, 945);
    ctx.lineTo(980, 945);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 33px Trebuchet MS, Arial, sans-serif';
    ctx.fillStyle = '#b9f9e4';
    ctx.fillText(GAME_URL, 540, 987);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png');
    });
  }

  const api = { create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PiggyRunShareCard = api;
})(typeof globalThis === 'object' ? globalThis : this);
