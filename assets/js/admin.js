/* Admin panel: demo password gate, products, quick price update, orders, settings. */
(function () {
  'use strict';

  const S = window.Shop;
  const root = document.getElementById('root');
  const PASSWORD = '1234'; // demo only
  const AUTH_KEY = 'shop_admin_auth';

  const isAuthed = () => sessionStorage.getItem(AUTH_KEY) === '1';

  /* ---------- Login ---------- */
  function renderLogin() {
    document.title = 'ورود به پنل مدیریت';
    root.innerHTML = `
      <main class="container login">
        <form class="form-card" id="loginForm" novalidate>
          <span class="brand-mark">${S.icon('bag')}</span>
          <h1 class="page-title" style="margin:0">ورود به پنل مدیریت</h1>
          <div class="demo-note">رمز نسخه نمایشی: ${S.fa(PASSWORD)}</div>
          <div class="field" id="fPass">
            <label for="pass">رمز عبور</label>
            <input class="input" id="pass" type="password" inputmode="numeric" autocomplete="current-password" aria-describedby="passErr">
            <div class="error" id="passErr">رمز اشتباه است.</div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">ورود</button>
          <a class="btn btn-ghost btn-block" href="../">${S.icon('store')}بازگشت به فروشگاه</a>
        </form>
      </main>`;
    const pass = root.querySelector('#pass');
    pass.focus();
    root.querySelector('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      if (S.toEn(pass.value.trim()) === PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, '1');
        if (!location.hash || location.hash === '#/') location.hash = '#/prices';
        route();
      } else {
        root.querySelector('#fPass').classList.add('invalid');
        pass.select();
      }
    });
  }

  /* ---------- Shell ---------- */
  const TABS = [
    { id: 'prices', label: 'قیمت‌ها', icon: 'tag' },
    { id: 'products', label: 'محصولات', icon: 'box' },
    { id: 'orders', label: 'سفارش‌ها', icon: 'list' },
    { id: 'settings', label: 'تنظیمات', icon: 'sliders' }
  ];

  function renderShell(active) {
    if (!root.querySelector('.admin-top')) {
      root.innerHTML = `
        <header class="admin-top">
          <div class="container">
            <span class="title" id="adminTitle"></span>
            <a href="../" target="_blank" rel="noopener">${S.icon('store')}<span>فروشگاه</span></a>
            <button type="button" id="logoutBtn">${S.icon('logout')}<span>خروج</span></button>
          </div>
        </header>
        <nav class="admin-nav" aria-label="بخش‌های مدیریت">
          <div class="container">
            ${TABS.map(t => `<a href="#/${t.id}" data-tab="${t.id}">${S.icon(t.icon)}<span>${t.label}</span></a>`).join('')}
          </div>
        </nav>
        <main class="container" id="view" tabindex="-1"></main>`;
      root.querySelector('#logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem(AUTH_KEY);
        location.hash = '';
        renderLogin();
      });
    }
    root.querySelector('#adminTitle').textContent = 'پنل مدیریت';
    root.querySelectorAll('.admin-nav a').forEach(a => {
      const on = a.dataset.tab === active;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    return root.querySelector('#view');
  }

  /* ---------- Quick price update ---------- */
  function renderPrices(view) {
    document.title = 'به‌روزرسانی سریع قیمت‌ها';
    const products = S.getProducts();
    const edits = new Map();

    view.innerHTML = `
      <div class="toolbar"><h1 class="page-title">به‌روزرسانی سریع قیمت‌ها</h1></div>
      <p style="margin-top:-8px;color:var(--muted)">قیمت‌های جدید را بنویسید و در پایان یک‌بار دکمه «ذخیره» را بزنید.</p>
      ${products.length > 6 ? `<div class="search">${S.icon('search')}<input class="input" id="q" type="search" placeholder="جستجوی نام محصول…" aria-label="جستجوی نام محصول"></div>` : ''}
      <div class="price-list">
        ${products.map(p => `
          <div class="price-row" data-id="${S.esc(p.id)}" data-name="${S.esc(p.name)}">
            <img src="${S.productImage(p)}" alt="" width="52" height="64">
            <label class="name" for="pr-${S.esc(p.id)}">${S.esc(p.name)}</label>
            <div class="price-input-wrap">
              <input class="input ltr" id="pr-${S.esc(p.id)}" inputmode="numeric" autocomplete="off" value="${S.formatNumber(p.price)}" enterkeyhint="next">
              <span class="unit">تومان</span>
            </div>
            <div class="old" hidden>قیمت قبلی: ${S.formatPrice(p.price)}</div>
          </div>`).join('') || '<div class="empty"><h2>محصولی وجود ندارد</h2></div>'}
      </div>
      <div class="save-bar">
        <div class="container">
          <button class="btn btn-primary btn-lg" id="saveAll" disabled>${S.icon('check')}ذخیره قیمت‌ها</button>
          <span class="count" id="changeCount">بدون تغییر</span>
        </div>
      </div>`;

    const saveBtn = view.querySelector('#saveAll');
    const countEl = view.querySelector('#changeCount');
    const inputs = [...view.querySelectorAll('.price-row input')];

    function updateBar() {
      saveBtn.disabled = edits.size === 0;
      countEl.textContent = edits.size ? S.fa(edits.size) + ' تغییر' : 'بدون تغییر';
    }

    inputs.forEach((input, i) => {
      const row = input.closest('.price-row');
      const p = products.find(x => x.id === row.dataset.id);
      S.bindPriceInput(input, value => {
        const changed = value > 0 && value !== p.price;
        if (changed) edits.set(p.id, value); else edits.delete(p.id);
        row.classList.toggle('changed', changed);
        row.querySelector('.old').hidden = !changed;
        updateBar();
      });
      input.addEventListener('focus', () => input.select());
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const next = inputs.slice(i + 1).find(x => x.closest('.price-row').style.display !== 'none');
        if (next) next.focus(); else input.blur();
      });
    });

    const q = view.querySelector('#q');
    if (q) q.addEventListener('input', () => {
      const term = q.value.trim();
      view.querySelectorAll('.price-row').forEach(r => {
        r.style.display = !term || r.dataset.name.includes(term) ? '' : 'none';
      });
    });

    saveBtn.addEventListener('click', () => {
      const list = S.getProducts().map(p => edits.has(p.id) ? Object.assign({}, p, { price: edits.get(p.id) }) : p);
      if (!S.saveProducts(list)) { S.toast('ذخیره انجام نشد', 'error'); return; }
      S.toast('قیمت ' + S.fa(edits.size) + ' محصول به‌روز شد');
      renderPrices(view);
    });
    updateBar();
  }

  /* ---------- Products ---------- */
  function renderProducts(view) {
    document.title = 'محصولات';
    const products = S.getProducts();
    view.innerHTML = `
      <div class="toolbar">
        <h1 class="page-title">محصولات (${S.fa(products.length)})</h1>
        <a class="btn btn-primary" href="#/products/new">${S.icon('plus')}افزودن محصول جدید</a>
      </div>
      <div class="admin-list">
        ${products.map(p => `
          <div class="admin-row" data-id="${S.esc(p.id)}">
            <img src="${S.productImage(p)}" alt="" width="72" height="88">
            <div>
              <div class="admin-row-name">${S.esc(p.name)}</div>
              <div class="admin-row-price">${S.formatPrice(p.price)}</div>
            </div>
            <div class="admin-row-actions">
              <a class="btn btn-secondary btn-sm" href="#/products/edit/${encodeURIComponent(p.id)}">${S.icon('edit')}ویرایش</a>
              <button class="btn btn-danger-outline btn-sm" type="button" data-del>${S.icon('trash')}حذف</button>
            </div>
          </div>`).join('') || `<div class="empty">${S.icon('box')}<h2>هنوز محصولی ندارید</h2><p>با دکمه «افزودن محصول جدید» اولین محصول را ثبت کنید.</p></div>`}
      </div>`;

    view.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.closest('.admin-row').dataset.id;
      const p = S.getProduct(id);
      if (!p) return;
      if (!(await S.confirmDialog('محصول «' + p.name + '» حذف شود؟', 'بله، حذف شود', true))) return;
      S.saveProducts(S.getProducts().filter(x => x.id !== id));
      S.toast('محصول حذف شد');
      renderProducts(view);
    }));
  }

  function renderProductForm(view, id) {
    const editing = id ? S.getProduct(id) : null;
    if (id && !editing) { location.replace('#/products'); return; }
    document.title = editing ? 'ویرایش محصول' : 'افزودن محصول';
    let image = editing ? editing.image : null;

    view.innerHTML = `
      <a class="back-link" href="#/products">${S.icon('back')}بازگشت به محصولات</a>
      <h1 class="page-title">${editing ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h1>
      <form class="form-card" id="productForm" novalidate>
        <div class="field">
          <span style="font-weight:700">عکس محصول</span>
          <label class="photo-pick" id="photoPick">
            <input type="file" accept="image/*" id="photo" aria-label="انتخاب عکس محصول">
            <span id="photoInner"></span>
          </label>
        </div>
        <div class="field" id="fName">
          <label for="name">نام محصول</label>
          <input class="input" id="name" value="${editing ? S.esc(editing.name) : ''}" placeholder="مثلاً: پیراهن مردانه" autocomplete="off">
          <div class="error">نام محصول را بنویسید.</div>
        </div>
        <div class="field" id="fPrice">
          <label for="price">قیمت (تومان)</label>
          <input class="input ltr" id="price" inputmode="numeric" autocomplete="off" value="${editing ? S.formatNumber(editing.price) : ''}" placeholder="۰">
          <div class="error">قیمت را درست وارد کنید.</div>
        </div>
        <div class="field">
          <label for="desc">توضیحات</label>
          <textarea class="input" id="desc" placeholder="توضیح کوتاه درباره جنس، سایز و ویژگی‌ها">${editing ? S.esc(editing.description) : ''}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-lg" type="submit">${S.icon('check')}${editing ? 'ذخیره تغییرات' : 'ثبت محصول'}</button>
          <a class="btn btn-ghost btn-lg" href="#/products">انصراف</a>
        </div>
      </form>`;

    const inner = view.querySelector('#photoInner');
    function showPhoto() {
      inner.innerHTML = image
        ? `<img src="${S.productImage({ image })}" alt="پیش‌نمایش عکس"><span>برای تغییر عکس، اینجا بزنید</span>`
        : `${S.icon('image')}<span>برای انتخاب عکس اینجا بزنید</span><span style="font-weight:400;font-size:.9rem">از گالری یا دوربین گوشی</span>`;
    }
    showPhoto();

    view.querySelector('#photo').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      inner.innerHTML = '<span>در حال آماده‌سازی عکس…</span>';
      try {
        image = await S.resizeImage(file, 1000);
      } catch (err) {
        S.toast('این فایل عکس قابل استفاده نیست', 'error');
      }
      showPhoto();
    });

    const priceEl = view.querySelector('#price');
    S.bindPriceInput(priceEl);

    view.querySelector('#productForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = view.querySelector('#name').value.trim();
      const price = S.parseNumber(priceEl.value);
      const description = view.querySelector('#desc').value.trim();
      view.querySelector('#fName').classList.toggle('invalid', !name);
      view.querySelector('#fPrice').classList.toggle('invalid', !(price > 0));
      if (!name) { view.querySelector('#name').focus(); return; }
      if (!(price > 0)) { priceEl.focus(); return; }

      const products = S.getProducts();
      const finalImage = image || 'ph:bag:' + (products.length % 8);
      let list;
      if (editing) {
        list = products.map(p => p.id === editing.id ? Object.assign({}, p, { name, price, description, image: finalImage }) : p);
      } else {
        list = [{ id: S.newProductId(), name, price, description, image: finalImage }].concat(products);
      }
      if (!S.saveProducts(list)) {
        S.toast('حافظه پر است؛ عکس کوچک‌تری انتخاب کنید', 'error');
        return;
      }
      S.toast(editing ? 'تغییرات ذخیره شد' : 'محصول جدید ثبت شد');
      location.hash = '#/products';
    });
  }

  /* ---------- Orders ---------- */
  function renderOrders(view) {
    document.title = 'سفارش‌ها';
    const orders = S.getOrders();
    view.innerHTML = `
      <div class="toolbar"><h1 class="page-title">سفارش‌های دریافتی (${S.fa(orders.length)})</h1></div>
      <div class="admin-list">
        ${orders.map(o => `
          <a class="order-row" href="#/orders/${o.no}">
            <div class="top"><span>سفارش ${S.fa(o.no)}</span><span class="total">${S.formatPrice(o.total)}</span></div>
            <div>${S.esc(o.name)} · <span dir="ltr">${S.fa(o.phone)}</span></div>
            <div class="meta">${S.formatDate(o.date)} · ساعت ${S.formatTime(o.date)} · ${S.fa(o.items.reduce((n, i) => n + i.qty, 0))} کالا</div>
          </a>`).join('') || `<div class="empty">${S.icon('receipt')}<h2>هنوز سفارشی ثبت نشده</h2><p>سفارش‌هایی که مشتریان ثبت می‌کنند اینجا نمایش داده می‌شوند.</p></div>`}
      </div>`;
  }

  function renderOrder(view, no) {
    const order = S.getOrder(no);
    if (!order) { location.replace('#/orders'); return; }
    document.title = 'سفارش ' + S.fa(order.no);
    view.innerHTML = `
      <a class="back-link" href="#/orders">${S.icon('back')}بازگشت به سفارش‌ها</a>
      <div class="receipt-wrap">
        ${S.receiptHTML(order, S.getSettings())}
        <div class="receipt-actions">
          <button class="btn btn-primary btn-lg btn-block" id="dlBtn" type="button">${S.icon('download')}دانلود رسید</button>
          <a class="btn btn-secondary btn-block" href="tel:${S.esc(order.phone)}">تماس با مشتری</a>
        </div>
      </div>`;
    const dl = view.querySelector('#dlBtn');
    dl.addEventListener('click', async () => {
      const label = dl.innerHTML;
      dl.disabled = true;
      dl.textContent = 'در حال آماده‌سازی…';
      try {
        await S.downloadReceipt(view.querySelector('#receipt'), order);
        S.toast('رسید دانلود شد');
      } catch (e) {
        S.toast('دانلود انجام نشد', 'error');
      } finally {
        dl.disabled = false;
        dl.innerHTML = label;
      }
    });
  }

  /* ---------- Settings ---------- */
  function renderSettings(view) {
    document.title = 'تنظیمات';
    const s = S.getSettings();
    view.innerHTML = `
      <h1 class="page-title">تنظیمات فروشگاه</h1>
      <form class="form-card" id="settingsForm" novalidate>
        <div class="field" id="fStore">
          <label for="storeName">نام فروشگاه</label>
          <input class="input" id="storeName" value="${S.esc(s.storeName)}">
          <div class="error">نام فروشگاه را بنویسید.</div>
        </div>
        <div class="field">
          <label for="tagline">شعار کوتاه</label>
          <input class="input" id="tagline" value="${S.esc(s.tagline)}">
          <div class="hint">زیر نام فروشگاه در صفحه اصلی نمایش داده می‌شود.</div>
        </div>
        <div class="field" id="fTg">
          <label for="telegram">نام کاربری تلگرام</label>
          <div class="at-prefix"><input class="input ltr" id="telegram" dir="ltr" value="${S.esc(s.telegram)}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
          <div class="hint">مشتری بعد از ثبت سفارش، رسید را به این آیدی می‌فرستد.</div>
          <div class="error">فقط حروف انگلیسی، عدد و _ (حداقل ۵ حرف).</div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${S.icon('check')}ذخیره تنظیمات</button>
      </form>
      <div class="form-card settings-danger">
        <b>بازگشت به حالت نمونه</b>
        <p style="margin:0">همه محصولات، سفارش‌ها و تنظیمات به حالت اولیه نسخه نمایشی برمی‌گردند.</p>
        <button class="btn btn-danger-outline btn-block" type="button" id="resetBtn">${S.icon('trash')}بازنشانی داده‌های نمونه</button>
      </div>`;

    view.querySelector('#settingsForm').addEventListener('submit', e => {
      e.preventDefault();
      const storeName = view.querySelector('#storeName').value.trim();
      const tagline = view.querySelector('#tagline').value.trim();
      const telegram = view.querySelector('#telegram').value.trim()
        .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/^@/, '');
      const tgOk = /^[A-Za-z0-9_]{5,32}$/.test(telegram);
      view.querySelector('#fStore').classList.toggle('invalid', !storeName);
      view.querySelector('#fTg').classList.toggle('invalid', !tgOk);
      if (!storeName || !tgOk) return;
      S.saveSettings({ storeName, tagline, telegram });
      view.querySelector('#telegram').value = telegram;
      renderShell('settings');
      S.toast('تنظیمات ذخیره شد');
    });

    view.querySelector('#resetBtn').addEventListener('click', async () => {
      if (!(await S.confirmDialog('همه داده‌ها به حالت نمونه برگردد؟ این کار قابل بازگشت نیست.', 'بله، بازنشانی شود', true))) return;
      S.resetDemo();
      S.toast('داده‌های نمونه بازگردانی شد');
      renderSettings(renderShell('settings'));
    });
  }

  /* ---------- Router ---------- */
  function route() {
    if (!isAuthed()) { renderLogin(); return; }
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const tab = TABS.some(t => t.id === parts[0]) ? parts[0] : 'prices';
    const view = renderShell(tab);
    if (tab === 'prices') renderPrices(view);
    else if (tab === 'products') {
      if (parts[1] === 'new') renderProductForm(view);
      else if (parts[1] === 'edit') renderProductForm(view, parts[2]);
      else renderProducts(view);
    } else if (tab === 'orders') {
      if (parts[1]) renderOrder(view, parts[1]); else renderOrders(view);
    } else renderSettings(view);
  }

  window.addEventListener('hashchange', () => {
    route();
    window.scrollTo(0, 0);
  });
  route();
})();
