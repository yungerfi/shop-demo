/* Shared data layer and helpers for the store and the admin panel.
   Everything lives in localStorage — there is no backend. */
(function () {
  'use strict';

  const KEYS = {
    settings: 'shop_settings',
    products: 'shop_products',
    cart: 'shop_cart',
    orders: 'shop_orders',
    seq: 'shop_order_seq'
  };

  // Folder of /assets/, resolved from this script's URL so store and admin pages both work.
  const ASSETS = (document.currentScript && document.currentScript.src || '').replace(/js\/common\.js.*$/, '');

  const DEFAULT_SETTINGS = {
    storeName: 'فروشگاه نمونه',
    tagline: 'پوشاک باکیفیت با قیمت مناسب، ارسال به سراسر ایران',
    telegram: 'STORE_TELEGRAM_USERNAME'
  };

  const SEED_PRODUCTS = [
    { id: 'p1', name: 'تی‌شرت نخی مردانه', price: 450000, image: 'ph:tshirt:0',
      description: 'تی‌شرت یقه‌گرد از پارچه ۱۰۰٪ نخ پنبه. خنک، نرم و مناسب استفاده روزانه. بعد از شستشو آب نمی‌رود و رنگ ثابت دارد.' },
    { id: 'p2', name: 'پیراهن چهارخانه مردانه', price: 890000, image: 'ph:shirt:1',
      description: 'پیراهن آستین‌بلند با طرح چهارخانه کلاسیک. مناسب محل کار و مهمانی. پارچه نخ و پلی‌استر، کم‌چروک.' },
    { id: 'p3', name: 'شلوار جین زنانه', price: 1250000, image: 'ph:pants:5',
      description: 'شلوار جین راسته با کش ملایم برای راحتی بیشتر. دوخت محکم و رنگ ثابت. در سایزهای ۳۶ تا ۴۶ موجود است.' },
    { id: 'p4', name: 'مانتو تابستانی زنانه', price: 1650000, image: 'ph:manto:3',
      description: 'مانتو بلند جلوباز از پارچه لینن سبک و خنک. مناسب فصل گرم، همراه با کمربند پارچه‌ای. قد ۱۰۵ سانتی‌متر.' },
    { id: 'p5', name: 'هودی گرم یونیسکس', price: 1180000, image: 'ph:hoodie:7',
      description: 'هودی کلاه‌دار با آستر داخلی نرم و گرم. مناسب آقایان و خانم‌ها. دارای جیب جلو و بند تنظیم کلاه.' },
    { id: 'p6', name: 'کاپشن زمستانی', price: 2850000, image: 'ph:jacket:2',
      description: 'کاپشن پفی سبک با لایه عایق حرارتی و پارچه ضدآب. زیپ محکم و یقه ایستاده برای روزهای سرد زمستان.' },
    { id: 'p7', name: 'شال نخی ساده', price: 320000, image: 'ph:scarf:6',
      description: 'شال نخی با بافت نرم و سبک، مناسب همه فصل‌ها. در رنگ‌های متنوع. ابعاد ۷۰ در ۱۸۰ سانتی‌متر.' },
    { id: 'p8', name: 'کفش کتانی راحتی', price: 1490000, image: 'ph:shoe:4',
      description: 'کفش کتانی سبک با کفی طبی و زیره ضدلغزش. مناسب پیاده‌روی و استفاده روزانه. سایز ۳۷ تا ۴۵.' }
  ];

  /* ---------- Numbers & text ---------- */

  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  function fa(value) {
    return String(value).replace(/\d/g, d => FA_DIGITS[d]);
  }
  function toEn(value) {
    return String(value)
      .replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d))
      .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
  }
  function formatNumber(n) {
    return fa(Math.round(Number(n) || 0).toLocaleString('en-US'));
  }
  function formatPrice(n) {
    return formatNumber(n) + ' تومان';
  }
  function parseNumber(s) {
    const digits = toEn(s).replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Live-format a price <input>: Persian digits with thousands separators, caret kept in place.
  function bindPriceInput(input, onChange) {
    function format() {
      const caret = input.selectionStart || 0;
      const digitsBefore = toEn(input.value.slice(0, caret)).replace(/\D/g, '').length;
      const digits = toEn(input.value).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
      const formatted = digits ? formatNumber(Number(digits)) : '';
      input.value = formatted;
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) {
        if (FA_DIGITS.includes(formatted[pos])) seen++;
        pos++;
      }
      if (document.activeElement === input) input.setSelectionRange(pos, pos);
      if (onChange) onChange(digits ? Number(digits) : 0);
    }
    input.addEventListener('input', format);
    if (input.value) format();
  }

  /* ---------- Jalali (Shamsi) dates ---------- */

  const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  function toJalali(date) {
    let gy = date.getFullYear();
    const gm = date.getMonth() + 1, gd = date.getDate();
    const gDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
      Math.floor((gy2 + 399) / 400) - 80 + gd + gDays[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    jy += Math.floor((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return { y: jy, m: jm, d: jd };
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function formatDate(iso) {
    const j = toJalali(new Date(iso));
    return fa(j.d) + ' ' + J_MONTHS[j.m - 1] + ' ' + fa(j.y);
  }
  function formatDateShort(iso) {
    const j = toJalali(new Date(iso));
    return fa(j.y + '/' + pad2(j.m) + '/' + pad2(j.d));
  }
  function formatTime(iso) {
    const d = new Date(iso);
    return fa(pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
  }

  /* ---------- Storage ---------- */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureSeed() {
    if (read(KEYS.products, null) === null) write(KEYS.products, SEED_PRODUCTS);
    if (read(KEYS.settings, null) === null) write(KEYS.settings, DEFAULT_SETTINGS);
  }
  function resetDemo() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    ensureSeed();
  }

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, read(KEYS.settings, {}));
  }
  function saveSettings(s) { return write(KEYS.settings, s); }

  function getProducts() { return read(KEYS.products, []); }
  function saveProducts(list) { return write(KEYS.products, list); }
  function getProduct(id) { return getProducts().find(p => p.id === id) || null; }
  function newProductId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  /* ---------- Cart ---------- */

  function getCart() { return read(KEYS.cart, []); }
  function saveCart(cart) { return write(KEYS.cart, cart); }

  // Cart joined with current product data; products deleted by the admin drop out.
  function getCartLines() {
    const products = getProducts();
    return getCart()
      .map(item => {
        const p = products.find(x => x.id === item.id);
        return p ? { product: p, qty: item.qty, total: p.price * item.qty } : null;
      })
      .filter(Boolean);
  }
  function cartCount() { return getCartLines().reduce((n, l) => n + l.qty, 0); }
  function cartTotal() { return getCartLines().reduce((n, l) => n + l.total, 0); }

  function addToCart(id, qty) {
    const cart = getCart();
    const line = cart.find(i => i.id === id);
    if (line) line.qty = Math.min(99, line.qty + qty);
    else cart.push({ id, qty: Math.min(99, qty) });
    return saveCart(cart);
  }
  function setCartQty(id, qty) {
    const cart = getCart().map(i => i.id === id ? { id, qty: Math.max(1, Math.min(99, qty)) } : i);
    return saveCart(cart);
  }
  function removeFromCart(id) { return saveCart(getCart().filter(i => i.id !== id)); }

  /* ---------- Orders ---------- */

  function getOrders() { return read(KEYS.orders, []); }
  function getOrder(no) { return getOrders().find(o => String(o.no) === String(no)) || null; }

  function placeOrder(customer) {
    const lines = getCartLines();
    if (!lines.length) return null;
    const no = (read(KEYS.seq, 1000) || 1000) + 1;
    const order = {
      no,
      date: new Date().toISOString(),
      name: customer.name,
      phone: customer.phone,
      items: lines.map(l => ({ id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty })),
      total: lines.reduce((n, l) => n + l.total, 0)
    };
    const orders = getOrders();
    orders.unshift(order);
    if (!write(KEYS.orders, orders)) return null;
    write(KEYS.seq, no);
    saveCart([]);
    return order;
  }

  // Accepts 09…, +989…, 989…, with Persian digits and spaces; returns 09xxxxxxxxx or null.
  function normalizePhone(raw) {
    let p = toEn(raw).replace(/[\s\-()]/g, '');
    if (p.startsWith('+98')) p = '0' + p.slice(3);
    else if (p.startsWith('0098')) p = '0' + p.slice(4);
    else if (p.startsWith('98') && p.length === 12) p = '0' + p.slice(2);
    return /^09\d{9}$/.test(p) ? p : null;
  }

  /* ---------- Placeholder product art (generated SVG, no external images) ---------- */

  const PALETTES = [
    ['#F7D2B8', '#E0896A'], ['#CFDAF2', '#7C97CF'], ['#D9E8CC', '#86AE73'], ['#F4D7E3', '#CC85A8'],
    ['#ECDDC8', '#B8976C'], ['#D8D4F0', '#8B84C9'], ['#F6E3B4', '#D8A848'], ['#CCE7E3', '#62A69F']
  ];

  const SHAPES = {
    tshirt: {
      body: 'M155 125 Q200 160 245 125 L310 152 L345 215 L300 238 L282 205 L282 395 L118 395 L118 205 L100 238 L55 215 L90 152 Z',
      detail: 'M155 125 Q200 160 245 125 M118 205 L118 225 M282 205 L282 225 M150 370 L250 370'
    },
    shirt: {
      body: 'M160 118 L200 140 L240 118 L300 143 L332 330 L295 338 L276 218 L276 400 L124 400 L124 218 L105 338 L68 330 L100 143 Z',
      detail: 'M160 118 L182 168 L200 140 L218 168 L240 118 M200 150 L200 400 M100 250 L300 250 M112 300 L288 300 M150 143 L150 400 M250 143 L250 400',
      dots: [[200, 190], [200, 240], [200, 290], [200, 340]]
    },
    pants: {
      body: 'M132 112 L268 112 L284 402 L216 402 L200 205 L184 402 L116 402 Z',
      detail: 'M132 138 L268 138 M200 138 L200 205 M150 138 Q155 170 182 172 M250 138 Q245 170 218 172 M140 380 L180 380 M220 380 L262 380'
    },
    manto: {
      body: 'M165 108 L200 132 L235 108 L287 132 L322 300 L290 308 L272 205 L296 410 L104 410 L128 205 L110 308 L78 300 L113 132 Z',
      detail: 'M165 108 L188 160 L200 132 L212 160 L235 108 M200 132 L200 410 M130 232 L270 232 M126 300 L170 300 L170 330 M274 300 L230 300 L230 330'
    },
    hoodie: {
      body: 'M150 128 Q160 72 200 70 Q240 72 250 128 L300 150 L336 330 L298 338 L278 225 L278 396 L122 396 L122 225 L102 338 L64 330 L100 150 Z',
      detail: 'M170 128 Q200 98 230 128 Q200 152 170 128 M190 145 L186 200 M210 145 L214 200 M148 305 L252 305 L264 365 L136 365 Z M122 380 L278 380'
    },
    jacket: {
      body: 'M158 100 L242 100 L246 118 L300 140 L336 322 L298 332 L280 222 L280 388 L120 388 L120 222 L102 332 L64 322 L100 140 L154 118 Z',
      detail: 'M154 118 L246 118 M200 118 L200 388 M120 175 L280 175 M120 230 L280 230 M120 285 L280 285 M120 340 L280 340 M84 210 L112 205 M316 210 L288 205 M80 265 L110 260 M320 265 L290 260'
    },
    scarf: {
      body: 'M128 110 Q200 88 272 110 L272 162 Q200 140 128 162 Z M150 150 L196 150 L186 382 L138 382 Z M206 150 L252 150 L264 360 L216 360 Z',
      detail: 'M128 136 Q200 114 272 136 M143 220 L192 220 M141 260 L190 260 M140 300 L188 300 M212 220 L256 220 M213 260 L259 260 M214 300 L261 300 M144 384 L144 404 M156 384 L156 404 M168 384 L168 404 M180 384 L180 404 M222 362 L222 382 M234 362 L234 382 M246 362 L246 382 M258 362 L258 382'
    },
    shoe: {
      body: 'M62 330 Q66 252 118 246 L172 240 Q192 200 230 204 L262 214 Q300 268 342 282 Q366 292 360 330 Z M58 330 L364 330 Q366 358 340 362 L82 362 Q56 358 58 330 Z',
      detail: 'M58 332 L364 332 M182 238 L212 260 M196 226 L226 248 M210 214 L240 236 M96 300 Q200 296 330 300',
      floor: 380
    },
    bag: {
      body: 'M110 170 L290 170 L306 400 L94 400 Z',
      detail: 'M160 170 L160 140 Q160 100 200 100 Q240 100 240 140 L240 170 M160 200 L160 210 M240 200 L240 210'
    }
  };

  const phCache = new Map();
  function placeholder(kind, paletteIndex) {
    const key = kind + paletteIndex;
    if (phCache.has(key)) return phCache.get(key);
    const [, c2] = PALETTES[(paletteIndex || 0) % PALETTES.length];
    const s = SHAPES[kind] || SHAPES.bag;
    const floor = s.floor || 418;
    const dots = (s.dots || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff" opacity=".7"/>`).join('');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">` +
      `<rect width="400" height="500" fill="#E7E8E3"/>` +
      `<ellipse cx="200" cy="${floor}" rx="140" ry="14" fill="#1A2033" opacity=".1"/>` +
      `<path d="${s.body}" fill="${c2}"/>` +
      `<path d="${s.detail}" fill="none" stroke="#1A2033" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".22"/>` +
      dots + `</svg>`;
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    phCache.set(key, uri);
    return uri;
  }

  function productImage(p) {
    const img = p && p.image;
    if (img && img.startsWith('data:')) return img;
    const [, kind, idx] = String(img || 'ph:bag:0').split(':');
    return placeholder(kind, Number(idx) || 0);
  }

  // Resize an uploaded photo to max 1000px and compress to JPEG.
  function resizeImage(file, max = 1000, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  /* ---------- Icons ---------- */

  const ICONS = {
    cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="17" cy="20.5" r="1.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    back: '<path d="M9 6l6 6-6 6"/>',
    next: '<path d="M15 6l-6 6 6 6"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    telegram: '<path d="M21 4.5 3 11.4c-.9.4-.9 1.6.1 1.9l4.4 1.4 1.7 5.3c.3.8 1.3 1 1.9.4l2.5-2.4 4.5 3.3c.7.5 1.6.1 1.8-.7L23 5.9c.2-1-.9-1.8-2-1.4zM8 14.5l9-6.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8-10-10z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    store: '<path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  };
  function icon(name, cls) {
    return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ---------- UI helpers ---------- */

  let toastTimer;
  function toast(message, type) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.className = 'toast ' + (type || 'success');
    el.innerHTML = icon(type === 'error' ? 'minus' : 'check') + '<span>' + esc(message) + '</span>';
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // Promise-based confirm dialog with big buttons.
  function confirmDialog(message, okLabel, danger) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML =
        `<div class="modal-box" role="dialog" aria-modal="true">
          <p class="modal-text">${esc(message)}</p>
          <div class="modal-actions">
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okLabel || 'بله')}</button>
            <button class="btn btn-ghost" data-cancel>انصراف</button>
          </div>
        </div>`;
      const close = v => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') close(false); };
      wrap.addEventListener('click', e => {
        if (e.target === wrap || e.target.closest('[data-cancel]')) close(false);
        else if (e.target.closest('[data-ok]')) close(true);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-ok]').focus();
    });
  }

  function copyText(text) {
    // Synchronous copy first (works inside the click on every browser), then the async API.
    let ok = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
      ta.remove();
    } catch (e) { /* ignore */ }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {});
      ok = true;
    }
    return ok;
  }

  const scriptPromises = {};
  function loadScript(src) {
    if (!scriptPromises[src]) {
      scriptPromises[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { delete scriptPromises[src]; reject(new Error('load failed')); };
        document.head.appendChild(s);
      });
    }
    return scriptPromises[src];
  }

  /* ---------- Receipt ---------- */

  function receiptHTML(order, settings) {
    const items = order.items.map(i => `
      <div class="rc-item">
        <div class="rc-item-name">
          <b>${esc(i.name)}</b>
          <span>${fa(i.qty)} عدد × ${formatPrice(i.price)}</span>
        </div>
        <div class="rc-item-total">${formatPrice(i.price * i.qty)}</div>
      </div>`).join('');
    return `
      <div class="receipt" id="receipt">
        <div class="rc-head">
          <div class="rc-logo">${icon('bag')}</div>
          <h2 class="rc-store">${esc(settings.storeName)}</h2>
          <p class="rc-title">رسید سفارش</p>
        </div>
        <div class="rc-meta">
          <div><span>شماره سفارش</span><b>${fa(order.no)}</b></div>
          <div><span>تاریخ</span><b>${formatDate(order.date)}</b></div>
          <div><span>ساعت</span><b>${formatTime(order.date)}</b></div>
          <div><span>نام مشتری</span><b>${esc(order.name)}</b></div>
          <div><span>شماره تماس</span><b>${fa(order.phone)}</b></div>
        </div>
        <div class="rc-items">
          <div class="rc-items-head"><span>کالا</span><span>مبلغ</span></div>
          ${items}
        </div>
        <div class="rc-total"><span>جمع کل</span><b>${formatPrice(order.total)}</b></div>
        <p class="rc-foot">از خرید شما سپاسگزاریم</p>
      </div>`;
  }

  function receiptText(order, settings) {
    const sep = '──────────────';
    const lines = [
      '🧾 رسید سفارش — ' + settings.storeName,
      'شماره سفارش: ' + fa(order.no),
      'تاریخ: ' + formatDate(order.date) + ' — ساعت ' + formatTime(order.date),
      'نام: ' + order.name,
      'تلفن: ' + fa(order.phone),
      sep
    ];
    order.items.forEach(i => {
      lines.push('▫️ ' + i.name + ' — ' + fa(i.qty) + ' عدد × ' + formatPrice(i.price) + ' = ' + formatPrice(i.price * i.qty));
    });
    lines.push(sep, '💰 جمع کل: ' + formatPrice(order.total));
    return lines.join('\n');
  }

  async function downloadReceipt(el, order) {
    await loadScript(ASSETS + 'js/html2canvas.min.js');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await window.html2canvas(el, {
      scale: Math.max(2, window.devicePixelRatio || 1),
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });
    const filename = 'receipt-' + order.no + '.png';
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return canvas;
  }

  function telegramUrl(settings) {
    const user = String(settings.telegram || '').trim().replace(/^@/, '').replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '');
    return 'https://t.me/' + encodeURIComponent(user);
  }

  ensureSeed();

  window.Shop = {
    KEYS, ASSETS,
    fa, toEn, esc, formatNumber, formatPrice, parseNumber, bindPriceInput,
    toJalali, formatDate, formatDateShort, formatTime,
    getSettings, saveSettings, resetDemo,
    getProducts, saveProducts, getProduct, newProductId, productImage, resizeImage,
    getCart, getCartLines, cartCount, cartTotal, addToCart, setCartQty, removeFromCart,
    getOrders, getOrder, placeOrder, normalizePhone,
    icon, toast, confirmDialog, copyText, loadScript,
    receiptHTML, receiptText, downloadReceipt, telegramUrl
  };
})();
