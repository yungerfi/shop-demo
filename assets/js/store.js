/* Customer-facing store: hash-routed single page (works on any static host). */
(function () {
  'use strict';

  const S = window.Shop;
  const app = document.getElementById('app');

  document.getElementById('brandMark').innerHTML = S.icon('bag');
  document.getElementById('cartIcon').innerHTML = S.icon('cart');

  function renderChrome() {
    const settings = S.getSettings();
    document.getElementById('brandName').textContent = settings.storeName;
    document.getElementById('footerName').textContent = settings.storeName;
    const count = S.cartCount();
    const badge = document.getElementById('cartBadge');
    badge.textContent = S.fa(count);
    badge.hidden = count === 0;
    document.getElementById('cartBtn').setAttribute('aria-label', 'سبد خرید، ' + S.fa(count) + ' کالا');
  }

  function setTitle(part) {
    const name = S.getSettings().storeName;
    document.title = part ? part + ' | ' + name : name;
  }

  function backLink(href, label) {
    return `<a class="back-link" href="${href}">${S.icon('back')}${label}</a>`;
  }

  function emptyState(iconName, title, text, withButton = true) {
    return `
      <div class="empty">
        ${S.icon(iconName)}
        <h2>${title}</h2>
        <p>${text}</p>
        ${withButton ? '<a class="btn btn-primary btn-lg" href="#/">رفتن به فروشگاه</a>' : ''}
      </div>`;
  }

  /* ---------- Home ---------- */
  function renderHome() {
    const settings = S.getSettings();
    const products = S.getProducts();
    setTitle('');
    const cards = products.map(p => `
      <a class="card" href="#/p/${encodeURIComponent(p.id)}">
        <div class="card-img"><img src="${S.productImage(p)}" alt="${S.esc(p.name)}" loading="lazy" width="400" height="500"></div>
        <div class="card-body">
          <h3 class="card-name">${S.esc(p.name)}</h3>
          <div class="card-price">${S.formatPrice(p.price)}</div>
        </div>
      </a>`).join('');
    // The first product in the admin list is featured at the top.
    const f = products[0];
    const feature = f ? `
      <section class="feature" aria-labelledby="featureName">
        <div class="feature-img"><img src="${S.productImage(f)}" alt="" width="400" height="500"></div>
        <div class="feature-body">
          <span class="feature-tag">پیشنهاد ما</span>
          <h2 id="featureName">${S.esc(f.name)}</h2>
          <div class="feature-price">${S.formatPrice(f.price)}</div>
          <p class="feature-desc">${S.esc(f.description)}</p>
          <a class="btn" href="#/p/${encodeURIComponent(f.id)}">مشاهده و خرید</a>
        </div>
      </section>` : '';
    app.innerHTML = `
      <h1 class="tagline">${S.esc(settings.tagline || settings.storeName)}</h1>
      ${feature}
      <h2 class="section-title">همه محصولات</h2>
      ${products.length ? `<div class="grid">${cards}</div>` : emptyState('box', 'هنوز محصولی ثبت نشده', 'به‌زودی محصولات جدید اضافه می‌شوند.', false)}`;
  }

  /* ---------- Product ---------- */
  function renderProduct(id) {
    const p = S.getProduct(id);
    if (!p) {
      setTitle('یافت نشد');
      app.innerHTML = emptyState('box', 'این محصول پیدا نشد', 'ممکن است این محصول دیگر موجود نباشد.');
      return;
    }
    setTitle(p.name);
    let qty = 1;
    app.innerHTML = `
      ${backLink('#/', 'بازگشت به محصولات')}
      <article class="product">
        <div class="product-img"><img src="${S.productImage(p)}" alt="${S.esc(p.name)}" width="400" height="500"></div>
        <div class="product-info">
          <h1>${S.esc(p.name)}</h1>
          <div class="product-price">${S.formatPrice(p.price)}</div>
          <p class="product-desc">${S.esc(p.description)}</p>
          <div class="buy-box" id="buyBox">
            <div>
              <div class="qty-label" id="qtyLabel">تعداد:</div>
              <div class="stepper" role="group" aria-labelledby="qtyLabel">
                <button type="button" data-q="1" aria-label="یکی بیشتر">${S.icon('plus')}</button>
                <output id="qty" aria-live="polite">${S.fa(1)}</output>
                <button type="button" data-q="-1" aria-label="یکی کمتر" disabled>${S.icon('minus')}</button>
              </div>
            </div>
            <button class="btn btn-primary btn-lg btn-block" id="addBtn">${S.icon('cart')}افزودن به سبد</button>
          </div>
        </div>
      </article>`;

    const out = app.querySelector('#qty');
    const minus = app.querySelector('[data-q="-1"]');
    const plus = app.querySelector('[data-q="1"]');
    app.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(99, qty + Number(b.dataset.q)));
      out.textContent = S.fa(qty);
      minus.disabled = qty <= 1;
      plus.disabled = qty >= 99;
    }));

    app.querySelector('#addBtn').addEventListener('click', () => {
      if (!S.addToCart(p.id, qty)) { S.toast('خطا در ذخیره سبد خرید', 'error'); return; }
      renderChrome();
      S.toast(S.fa(qty) + ' عدد به سبد خرید اضافه شد');
      app.querySelector('#buyBox').innerHTML = `
        <div class="added-box">
          <div class="added-msg">${S.icon('check')}به سبد خرید اضافه شد</div>
          <a class="btn btn-primary btn-lg btn-block" href="#/cart">${S.icon('cart')}رفتن به سبد خرید</a>
          <a class="btn btn-ghost btn-block" href="#/">ادامه خرید</a>
        </div>`;
      app.querySelector('.added-box .btn').focus();
    });
  }

  /* ---------- Cart ---------- */
  function renderCart() {
    setTitle('سبد خرید');
    const lines = S.getCartLines();
    if (!lines.length) {
      app.innerHTML = `<h1 class="page-title">سبد خرید</h1>` +
        emptyState('cart', 'سبد خرید شما خالی است', 'محصول مورد نظرتان را انتخاب کنید و دکمه «افزودن به سبد» را بزنید.');
      return;
    }
    const items = lines.map(l => `
      <div class="cart-item" data-id="${S.esc(l.product.id)}">
        <a href="#/p/${encodeURIComponent(l.product.id)}"><img src="${S.productImage(l.product)}" alt="" width="88" height="110"></a>
        <div>
          <a class="cart-item-name" href="#/p/${encodeURIComponent(l.product.id)}">${S.esc(l.product.name)}</a>
          <div class="cart-item-unit">قیمت هر عدد: ${S.formatPrice(l.product.price)}</div>
          <div class="line-total">${S.formatPrice(l.total)}</div>
        </div>
        <div class="cart-item-row">
          <div class="stepper stepper-sm" role="group" aria-label="تعداد ${S.esc(l.product.name)}">
            <button type="button" data-act="inc" aria-label="یکی بیشتر" ${l.qty >= 99 ? 'disabled' : ''}>${S.icon('plus')}</button>
            <output>${S.fa(l.qty)}</output>
            <button type="button" data-act="dec" aria-label="یکی کمتر" ${l.qty <= 1 ? 'disabled' : ''}>${S.icon('minus')}</button>
          </div>
          <button type="button" class="remove-btn" data-act="remove">${S.icon('trash')}حذف</button>
        </div>
      </div>`).join('');

    app.innerHTML = `
      <h1 class="page-title">سبد خرید</h1>
      <div class="cart-layout">
        <div class="cart-list">${items}</div>
        <div class="summary">
          <div class="summary-row"><span>تعداد کالا</span><span>${S.fa(S.cartCount())} عدد</span></div>
          <div class="summary-row"><span>جمع کل</span><b>${S.formatPrice(S.cartTotal())}</b></div>
          <a class="btn btn-primary btn-lg btn-block" href="#/checkout">ثبت سفارش ${S.icon('next')}</a>
          <a class="btn btn-ghost btn-block" href="#/">ادامه خرید</a>
        </div>
      </div>`;

    app.querySelectorAll('.cart-item').forEach(row => {
      const id = row.dataset.id;
      row.addEventListener('click', async e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const line = S.getCart().find(i => i.id === id);
        if (!line) return;
        if (btn.dataset.act === 'inc') S.setCartQty(id, line.qty + 1);
        else if (btn.dataset.act === 'dec') S.setCartQty(id, line.qty - 1);
        else if (btn.dataset.act === 'remove') {
          const name = row.querySelector('.cart-item-name').textContent;
          if (!(await S.confirmDialog('«' + name + '» از سبد خرید حذف شود؟', 'بله، حذف شود', true))) return;
          S.removeFromCart(id);
          S.toast('از سبد خرید حذف شد');
        }
        renderChrome();
        renderCart();
        const again = app.querySelector(`.cart-item[data-id="${CSS.escape(id)}"] [data-act="${btn.dataset.act}"]`);
        if (again && !again.disabled) again.focus();
      });
    });
  }

  /* ---------- Checkout ---------- */
  function renderCheckout() {
    setTitle('ثبت سفارش');
    const lines = S.getCartLines();
    if (!lines.length) { location.replace('#/cart'); return; }
    const mini = lines.map(l => `<div><span>${S.esc(l.product.name)} × ${S.fa(l.qty)}</span><span>${S.formatPrice(l.total)}</span></div>`).join('');

    app.innerHTML = `
      ${backLink('#/cart', 'بازگشت به سبد خرید')}
      <h1 class="page-title">ثبت سفارش</h1>
      <div class="checkout-wrap">
        <form class="form-card" id="checkoutForm" novalidate>
          <p style="margin:0">فقط نام و شماره موبایل خود را بنویسید تا سفارش ثبت شود.</p>
          <div class="field" id="fName">
            <label for="name">نام و نام خانوادگی</label>
            <input class="input" id="name" name="name" autocomplete="name" placeholder="مثلاً: مریم احمدی" required>
            <div class="field-error" id="nameErr">لطفاً نام خود را بنویسید.</div>
          </div>
          <div class="field" id="fPhone">
            <label for="phone">شماره موبایل</label>
            <input class="input ltr" id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" maxlength="16" required>
            <div class="hint">۱۱ رقم، با ۰۹ شروع می‌شود</div>
            <div class="field-error" id="phoneErr">شماره موبایل درست نیست. مثال درست: ۰۹۱۲۳۴۵۶۷۸۹</div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${S.icon('check')}ثبت نهایی سفارش</button>
        </form>
        <div class="summary">
          <b>خلاصه سفارش</b>
          <div class="mini-lines">${mini}</div>
          <div class="summary-row"><span>جمع کل</span><b>${S.formatPrice(S.cartTotal())}</b></div>
        </div>
      </div>`;

    const form = app.querySelector('#checkoutForm');
    const nameEl = form.querySelector('#name');
    const phoneEl = form.querySelector('#phone');
    nameEl.setAttribute('aria-describedby', 'nameErr');
    phoneEl.setAttribute('aria-describedby', 'phoneErr');

    // Show Persian digits as the user types.
    phoneEl.addEventListener('input', () => {
      const pos = phoneEl.selectionStart;
      phoneEl.value = S.fa(S.toEn(phoneEl.value).replace(/[^\d+\s]/g, ''));
      phoneEl.setSelectionRange(pos, pos);
      if (document.getElementById('fPhone').classList.contains('invalid') && S.normalizePhone(phoneEl.value)) {
        document.getElementById('fPhone').classList.remove('invalid');
      }
    });
    nameEl.addEventListener('input', () => {
      if (nameEl.value.trim().length >= 2) document.getElementById('fName').classList.remove('invalid');
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = nameEl.value.trim().replace(/\s+/g, ' ');
      const phone = S.normalizePhone(phoneEl.value);
      const nameOk = name.length >= 2;
      document.getElementById('fName').classList.toggle('invalid', !nameOk);
      document.getElementById('fPhone').classList.toggle('invalid', !phone);
      nameEl.setAttribute('aria-invalid', String(!nameOk));
      phoneEl.setAttribute('aria-invalid', String(!phone));
      if (!nameOk) { nameEl.focus(); return; }
      if (!phone) { phoneEl.focus(); return; }
      const order = S.placeOrder({ name, phone });
      if (!order) { S.toast('ثبت سفارش انجام نشد. دوباره تلاش کنید.', 'error'); return; }
      renderChrome();
      location.replace('#/receipt/' + order.no);
    });
  }

  /* ---------- Receipt ---------- */
  function renderReceipt(no) {
    const order = S.getOrder(no);
    if (!order) {
      setTitle('رسید');
      app.innerHTML = emptyState('receipt', 'رسید پیدا نشد', 'این سفارش در این دستگاه ثبت نشده است.');
      return;
    }
    const settings = S.getSettings();
    setTitle('رسید سفارش ' + S.fa(order.no));
    app.innerHTML = `
      <div class="receipt-wrap">
        <div class="success-banner">
          ${S.icon('check')}
          <div>
            <h1>سفارش شما ثبت شد</h1>
            <p>شماره سفارش: <b>${S.fa(order.no)}</b></p>
          </div>
        </div>
        ${S.receiptHTML(order, settings)}
        <div class="receipt-actions">
          <p class="receipt-hint">برای نهایی شدن سفارش، رسید را در تلگرام برای ما بفرستید.</p>
          <a class="btn btn-primary btn-lg btn-block" id="tgBtn" href="${S.telegramUrl(settings)}" target="_blank" rel="noopener">${S.icon('telegram')}ادامه در تلگرام</a>
          <button class="btn btn-secondary btn-lg btn-block" id="dlBtn" type="button">${S.icon('download')}دانلود رسید</button>
          <a class="btn btn-ghost btn-block" href="#/">بازگشت به فروشگاه</a>
        </div>
      </div>`;

    // Warm up html2canvas so the download feels instant.
    S.loadScript(S.ASSETS + 'js/html2canvas.min.js').catch(() => {});

    app.querySelector('#tgBtn').addEventListener('click', () => {
      S.copyText(S.receiptText(order, settings));
      S.toast('رسید کپی شد، در تلگرام ارسال کنید');
    });

    const dl = app.querySelector('#dlBtn');
    dl.addEventListener('click', async () => {
      const label = dl.innerHTML;
      dl.disabled = true;
      dl.textContent = 'در حال آماده‌سازی…';
      try {
        await S.downloadReceipt(app.querySelector('#receipt'), order);
        S.toast('رسید دانلود شد');
      } catch (e) {
        S.toast('دانلود انجام نشد. دوباره تلاش کنید.', 'error');
      } finally {
        dl.disabled = false;
        dl.innerHTML = label;
      }
    });
  }

  /* ---------- Router ---------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    switch (parts[0]) {
      case 'p': renderProduct(parts[1]); break;
      case 'cart': renderCart(); break;
      case 'checkout': renderCheckout(); break;
      case 'receipt': renderReceipt(parts[1]); break;
      default: renderHome();
    }
    renderChrome();
  }

  window.addEventListener('hashchange', () => {
    route();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  });

  // Reflect admin changes made in another tab immediately.
  window.addEventListener('storage', e => {
    if (!e.key || e.key.startsWith('shop_')) {
      const onReceipt = location.hash.startsWith('#/receipt');
      if (!onReceipt) route(); else renderChrome();
    }
  });

  route();
})();
