(function (root) {
  'use strict';

  const STEP_MS = 20;
  const MAX_TICKS = 30000;
  const OVERLAP_TICKS = 10;
  const MAX_DISTANCE_TICKS = 45000;

  function events(seed) {
    let value = (seed >>> 0) || 0x6d2b79f5;
    const random = () => {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return value >>> 0;
    };
    const list = [];
    let obstacle = 58 + random() % 30;
    let coin = 32 + random() % 24;
    while (obstacle <= MAX_DISTANCE_TICKS || coin <= MAX_DISTANCE_TICKS) {
      if (coin <= obstacle && coin <= MAX_DISTANCE_TICKS) {
        const arc = coin >= 100 && coin + 38 < obstacle && coin + 32 <= MAX_DISTANCE_TICKS && random() % 5 === 0;
        if (arc) {
          for (const [offset, type] of [[0, 'coin-low'], [8, 'coin-mid'], [16, 'coin-high'], [24, 'coin-mid'], [32, 'coin-low']]) {
            list.push({ tick: coin + offset, type });
          }
          coin += 32;
        } else {
          const bag = coin >= 200 && coin + 18 < obstacle && random() % 8 === 0;
          list.push({ tick: coin, type: bag ? 'bag' : random() % 2 ? 'coin-high' : 'coin-low' });
        }
        coin += Math.max(44, 62 - Math.floor(coin / 2200)) + random() % 20;
      } else if (obstacle <= MAX_DISTANCE_TICKS) {
        list.push({ tick: obstacle, type: obstacle >= 200 ? ['candle', 'bear', 'dip', 'rug', 'drone'][random() % 5] : ['candle', 'bear', 'dip', 'rug'][random() % 4] });
        obstacle += 82 + random() % 21;
      } else {
        break;
      }
    }
    return list;
  }

  function create(seed) {
    return { tick: 0, distance1000: 0, y10: 0, vy10: 0, lives: 3, immune: 0, coins: 0, bagBonus: 0, over: false,
      events: events(seed), eventIndex: 0 };
  }

  function score(state) {
    return Math.floor(state.tick * 9 / 50) + state.coins * 25 + state.bagBonus + (state.stompBonus || 0);
  }

  function level(state) {
    return 1 + Math.min(8, Math.floor(score(state) / 2000));
  }

  function step(state, jump) {
    if (state.over || state.tick >= MAX_TICKS) return { hit: false, coin: false, over: state.over };
    const oldLevel = level(state);
    state.tick++;
    state.distance1000 += 1000 + (oldLevel - 1) * 60;
    if (jump && state.y10 === 0) state.vy10 = -138;
    const previousY10 = state.y10;
    state.y10 += state.vy10;
    state.vy10 += 6;
    if (state.y10 >= 0) { state.y10 = 0; state.vy10 = 0; }
    if (state.immune > 0) state.immune--;
    let hit = false, pickup = 0, stomp = false;
    while (state.eventIndex < state.events.length && (state.events[state.eventIndex].tick + OVERLAP_TICKS) * 1000 < state.distance1000) state.eventIndex++;
    for (let i = state.eventIndex; i < state.events.length && (state.events[i].tick - OVERLAP_TICKS) * 1000 <= state.distance1000; i++) {
      const event = state.events[i];
      if (event.used) continue;
      if (event.type === 'coin-low' && state.y10 <= -100 && state.y10 >= -980) {
        event.used = true; event.collected = true; state.coins++; pickup += 25;
      } else if (event.type === 'coin-mid' && state.y10 <= -350 && state.y10 >= -1260) {
        event.used = true; event.collected = true; state.coins++; pickup += 25;
      } else if (event.type === 'coin-high' && state.y10 <= -620 && state.y10 >= -1500) {
        event.used = true; event.collected = true; state.coins++; pickup += 25;
      } else if (event.type === 'bag' && state.y10 <= -100 && state.y10 >= -1200) {
        event.used = true; event.collected = true; state.coins++; state.bagBonus += 75; pickup += 100;
      } else if (event.type === 'bear' && state.vy10 > 0 && previousY10 <= -620 && state.y10 >= -620) {
        event.used = true; event.stomped = true;
        state.stompBonus = (state.stompBonus || 0) + 50;
        state.y10 = -620; state.vy10 = -90; stomp = true;
      } else if (!event.type.startsWith('coin') && event.type !== 'bag' && (event.type === 'drone' ? state.y10 <= -350 && state.y10 >= -1550 : state.y10 > (event.type === 'bear' ? -620 : -590))) {
        event.used = true;
        if (state.immune === 0) {
          state.lives--;
          state.immune = 68;
          hit = true;
          if (state.lives === 0) { state.over = true; break; }
        }
      }
    }
    return { hit, pickup, stomp, levelUp: level(state) > oldLevel, over: state.over };
  }

  const api = { STEP_MS, MAX_TICKS, OVERLAP_TICKS, events, create, score, level, step };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PiggyRunRules = api;
})(typeof globalThis === 'object' ? globalThis : this);
