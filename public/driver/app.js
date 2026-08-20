// driver/app.js — منطق تطبيق السائق مع دعم اللغتين

applyLang();
document.getElementById('lang-toggle').addEventListener('click', () => setLang(getLang() === 'ar' ? 'en' : 'ar'));
document.addEventListener('langchange', () => { updateShareButton(); if (typeof loadState === 'function') loadState(); });

const token = localStorage.getItem('bus_driver_token');
const user = JSON.parse(localStorage.getItem('bus_driver_user') || 'null');
if (!token || !user) window.location.href = '/driver/login.html';

document.getElementById('logout').addEventListener('click', () => {
  stopSharing();
  localStorage.removeItem('bus_driver_token');
  localStorage.removeItem('bus_driver_user');
  window.location.href = '/driver/login.html';
});

async function api(path, opts = {}) {
  const res = await fetch('/api/driver' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function showMsg(text, ok = true) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = ok ? 'ok' : 'err';
  setTimeout(() => { el.className = ''; }, 4000);
}

let watchId = null;
let sharing = false;

function startSharing() {
  if (!navigator.geolocation) return showMsg('المتصفح لا يدعم تحديد الموقع', false);
  watchId = navigator.geolocation.watchPosition(
