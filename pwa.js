/*! © 2026 Sumi — cài ứng dụng ra màn hình chính (PWA) */
(function () {
  let deferred = null; const subs = [];
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { } });
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const macSafari = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit(); });
  addEventListener('appinstalled', () => { deferred = null; emit(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  const SHARE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  function guide() {
    let steps;
    if (ios) steps = ['Mở trang này bằng <b>Safari</b>.', 'Bấm nút <b>Chia sẻ</b> ' + SHARE + ' (thanh dưới hoặc trên cùng).', 'Kéo xuống, chọn <b>Thêm vào MH chính</b> (Add to Home Screen).', 'Bấm <b>Thêm</b>. Biểu tượng Hiyo sẽ hiện trên màn hình chính.'];
    else if (android) steps = ['Mở trang này bằng <b>Chrome</b>.', 'Bấm nút <b>⋮</b> ở góc trên bên phải.', 'Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.', 'Bấm <b>Cài đặt</b>.'];
    else if (macSafari) steps = ['Trên thanh menu Safari, chọn <b>Tệp</b> (File).', 'Chọn <b>Thêm vào Dock</b> (Add to Dock).', 'Bấm <b>Thêm</b>. Sumi sẽ mở như một ứng dụng riêng.'];
    else steps = ['Dùng <b>Chrome</b> hoặc <b>Edge</b>.', 'Bấm biểu tượng <b>cài đặt</b> ở cuối thanh địa chỉ, hoặc nút <b>⋮</b> → <b>Cài đặt Sumi…</b> / <b>Lưu và chia sẻ → Cài đặt trang</b>.', 'Bấm <b>Cài đặt</b>.'];
    const ov = document.createElement('div'); ov.className = 'pwa-ov';
    ov.innerHTML = '<div class="pwa-box" role="dialog" aria-modal="true"><div class="pwa-ic"><img src="icon-192.png" alt=""></div><h3>Cài Sumi ra màn hình chính</h3>' +
      '<p class="muted">Mở nhanh bằng một chạm, toàn màn hình như ứng dụng, không cần tải từ App Store.</p><ol>' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
      '<button class="btn primary block" id="pwa-ok">Đã hiểu</button></div>';
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector('#pwa-ok').onclick = close;
  }
  async function install() {
    if (deferred) { const d = deferred; d.prompt(); let r; try { r = await d.userChoice; } catch (e) { } deferred = null; emit(); return r && r.outcome === 'accepted'; }
    guide(); return false;
  }
  window.SEPWA = { installed, canPrompt: () => !!deferred, install, guide, onChange: f => subs.push(f), ios };
})();
