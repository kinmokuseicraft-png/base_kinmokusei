/**
 * 金杢犀 — ローディング用 4種動物 SVG（和モダン・シルエット）
 * キツネ・トカゲ・リス・オオカミ。viewBox 0 0 200 100 統一（横移動アニメ用）。
 */
(function (global) {
  'use strict';

  // キツネ：横顔・大きな尾・すっとした鼻先
  var SVG_FOX = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" fill="#1a1a1a" class="loading-animal-svg"><path d="M28 68 Q35 58 48 62 L62 58 Q78 52 92 58 L105 55 Q118 48 132 55 L148 58 Q162 52 175 58 L182 65 L175 72 Q168 82 155 78 L138 82 L118 78 L95 82 L72 78 L48 82 L32 78 L25 72 Z"/><ellipse cx="42" cy="58" rx="6" ry="5"/><path d="M168 58 L178 48 Q182 52 178 58" fill="none" stroke="#1a1a1a" stroke-width="1"/></svg>';

  // トカゲ：長い胴・小さな四肢・尾
  var SVG_LIZARD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" fill="#1a1a1a" class="loading-animal-svg"><path d="M22 58 L38 56 L55 58 L72 56 L90 58 L108 56 L125 58 L142 56 L160 58 L178 56 L172 64 L158 62 L142 66 L125 62 L108 66 L90 62 L72 66 L55 62 L38 66 L25 62 Z"/><ellipse cx="28" cy="58" rx="4" ry="3"/><path d="M178 56 L185 52 L182 58" fill="#1a1a1a"/></svg>';

  // リス：丸み・ふさふさの尾・耳
  var SVG_SQUIRREL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" fill="#1a1a1a" class="loading-animal-svg"><path d="M35 65 Q45 52 58 58 L75 54 Q92 48 108 55 L125 52 Q142 48 158 55 L172 60 L168 70 Q160 85 142 82 L125 78 L108 82 L88 78 L68 82 L45 78 L32 72 Z"/><path d="M158 55 L165 42 Q172 48 162 58" fill="#1a1a1a"/><ellipse cx="48" cy="56" rx="5" ry="4"/><path d="M142 52 L138 72 L152 68 L162 72 L168 65" fill="#1a1a1a"/></svg>';

  // オオカミ：横顔・とがった耳・風格のある尾
  var SVG_WOLF = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" fill="#1a1a1a" class="loading-animal-svg"><path d="M25 65 L38 58 L55 60 L72 58 L90 60 L108 58 L125 60 L142 58 L158 60 L172 58 L182 62 L175 72 L162 68 L145 72 L125 68 L108 72 L88 68 L68 72 L48 68 L32 72 L22 68 Z"/><path d="M182 58 L192 48 L188 58" fill="#1a1a1a"/><path d="M38 58 L32 48 L42 52" fill="#1a1a1a"/><ellipse cx="52" cy="58" rx="5" ry="4"/></svg>';

  var ANIMALS = {
    fox: SVG_FOX,
    lizard: SVG_LIZARD,
    squirrel: SVG_SQUIRREL,
    wolf: SVG_WOLF
  };

  var KEYS = ['fox', 'lizard', 'squirrel', 'wolf'];

  function getRandomAnimalKey() {
    return KEYS[Math.floor(Math.random() * KEYS.length)];
  }

  function getAnimalSvg(key) {
    return ANIMALS[key] || ANIMALS.fox;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ANIMALS, KEYS, getRandomAnimalKey, getAnimalSvg };
  } else {
    global.KinmokuseiAnimals = { ANIMALS, KEYS, getRandomAnimalKey, getAnimalSvg };
  }
})(typeof window !== 'undefined' ? window : this);
