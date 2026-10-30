(function (root) {
  'use strict';

  const STEP_MS = 20;
  const MAX_TICKS = 30000;

  function events(seed) {
    let value = seed >>> 0;
    const random = () => (value = (Math.imul(value, 1664525) + 1013904223) >>> 0);
    const list = [];
    let obstacle = 65;
    let coin = 42;
    while (obstacle <= MAX_TICKS || coin <= MAX_TICKS) {
      if (coin <= obstacle && coin <= MAX_TICKS) {
        list.push({ tick: coin, type: random() % 2 ? 'coin-high' : 'coin-low' });
        coin += 55 + random() % 25;
      } else if (obstacle <= MAX_TICKS) {
        list.push({ tick: obstacle, type: random() % 3 ? 'candle' : 'bear' });
        obstacle += Math.max(50, 80 - Math.floor(obstacle / 200)) + random() % 20;
      } else {
        break;
      }
    }
    return list;
  }

  function create(seed) {
    return { tick: 0, y10: 0, vy10: 0, lives: 3, immune: 0, coins: 0, over: false,
      events: events(seed), eventIndex: 0 };
  }

  function score(state) {
    return Math.floor(state.tick * 9 / 50) + state.coins * 25;
  }

  function step(state, jump) {
    if (state.over || state.tick >= MAX_TICKS) return { hit: false, coin: false, over: state.over };
    state.tick++;
    if (jump && state.y10 === 0) state.vy10 = -138;
    state.y10 += state.vy10;
    state.vy10 += 6;
    if (state.y10 >= 0) { state.y10 = 0; state.vy10 = 0; }
    if (state.immune > 0) state.immune--;
    let hit = false, coin = false;
    while (state.eventIndex < state.events.length && state.events[state.eventIndex].tick === state.tick) {
      const type = state.events[state.eventIndex++].type;
      if (type === 'coin-low' && state.y10 <= -500 && state.y10 >= -1500) {
        state.coins++; coin = true;
      } else if (type === 'coin-high' && state.y10 <= -1050 && state.y10 >= -1900) {
        state.coins++; coin = true;
      } else if ((type === 'candle' || type === 'bear') && state.y10 > (type === 'bear' ? -620 : -550) && state.immune === 0) {
        state.lives--;
        state.immune = 68;
        hit = true;
        if (state.lives === 0) state.over = true;
      }
    }
    return { hit, coin, over: state.over };
  }

  const api = { STEP_MS, MAX_TICKS, events, create, score, step };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PiggyRunRules = api;
})(typeof globalThis === 'object' ? globalThis : this);
