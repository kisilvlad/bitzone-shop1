// frontend/src/utils/classifyProduct.js
// Повертає одну з груп: 'consoles' | 'games' | 'accessories' | null

const CONSOLE_KEYS = [
  'консоль', 'приставка', 'console',
  'ps5', 'ps4', 'ps3', 'ps2', 'ps1', 'playstation',
  'xbox', 'series x', 'series s', 'xbox one', 'xbox 360',
  'nintendo', 'switch', 'wii', 'wii u', 'gamecube', 'n64',
  'steam deck', 'steamdeck', 'ps vita', 'psp'
];

const GAME_KEYS = [
  'гра', 'ігри', 'game', 'games',
  'disc', 'диск', 'blu-ray', 'blu ray',
  'digital', 'цифров', 'код', 'ключ', 'key', 'code',
  'cartridge', 'картридж', 'dlc', 'steam key', 'psn', 'xbox code'
];

const ACCESSORY_KEYS = [
  'аксесуар', 'accessory',
  'геймпад', 'контролер', 'джойстик', 'controller', 'dualsense', 'dualshock', 'joy-con', 'joycon',
  'навушники', 'гарнітура', 'headset', 'headphones', 'мікрофон', 'microphone',
  'кабель', 'cable', 'заряд', 'charger', 'power supply', 'док', 'dock', 'станція', 'станция',
  'картка пам', 'карта пам', 'memory card', 'sd card',
  'чохол', 'case', 'плівка', 'glass', 'наклад', 'grip',
  'клавіатура', 'keyboard', 'миша', 'mouse', 'mouse pad', 'коврик',
  'адаптер', 'adapter', 'перехідник', 'hub', 'stand', 'батарея', 'акумулятор'
];

const includesAny = (hay = '', keys = []) => {
  const s = String(hay).toLowerCase();
  return keys.some(k => s.includes(k));
};

export function classifyProduct(p) {
  const name = p?.name || '';
  const cat = p?.category || '';

  if (includesAny(cat, CONSOLE_KEYS) || includesAny(name, CONSOLE_KEYS)) return 'consoles';
  if (includesAny(cat, GAME_KEYS) || includesAny(name, GAME_KEYS)) return 'games';
  if (includesAny(cat, ACCESSORY_KEYS) || includesAny(name, ACCESSORY_KEYS)) return 'accessories';

  // Fallback: типові комплектуючі кидаємо в аксесуари
  if (/\bssd\b|\bhdd\b|storage|memory|gb/i.test(name)) return 'accessories';
  return null;
}
