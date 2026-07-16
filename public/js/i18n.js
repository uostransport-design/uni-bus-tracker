// i18n.js — قاموس ترجمة بسيط + دالة تبديل اللغة (عربي RTL / إنجليزي LTR)
const I18N = {
  ar: {
    dir: 'rtl', lang: 'ar',
    title: 'تتبع حافلات جامعة الشارقة',
    activeBuses: 'الحافلات النشطة',
    allStations: 'كل المحطات',
    selectStation: 'اختر محطة',
    arrivingIn: 'الوصول خلال',
    minutes: 'دقيقة',
    lessThanMinute: 'أقل من دقيقة',
    currentStation: 'المحطة الحالية',
    nextStation: 'المحطة القادمة',
    status: { in_service: 'في الخدمة', approaching: 'تقترب', at_station: 'عند المحطة', delayed: 'متأخرة', out_of_service: 'خارج الخدمة', emergency: 'حالة طارئة' },
    staffLogin: 'دخول الموظفين',
    driverLogin: 'دخول السائقين',
    trackBuses: 'تتبع الحافلات',
    noBuses: 'لا توجد حافلات قادمة إلى هذه المحطة حاليًا',
    offline: 'غير متصلة',
  },
  en: {
    dir: 'ltr', lang: 'en',
    title: 'University of Sharjah — Live Bus Tracking',
    activeBuses: 'Active Buses',
    allStations: 'All Stations',
    selectStation: 'Select a station',
    arrivingIn: 'Arriving in',
    minutes: 'min',
    lessThanMinute: 'less than a minute',
    currentStation: 'Current Station',
    nextStation: 'Next Station',
    status: { in_service: 'In Service', approaching: 'Approaching', at_station: 'At Station', delayed: 'Delayed', out_of_service: 'Out of Service', emergency: 'Emergency' },
    staffLogin: 'Staff Login',
    driverLogin: 'Driver Login',
    trackBuses: 'Track Buses',
    noBuses: 'No buses currently arriving at this station',
    offline: 'Offline',
  },
};

function getLang() { return localStorage.getItem('bus_lang') || 'ar'; }
function setLang(lang) { localStorage.setItem('bus_lang', lang); applyLang(); }
function t() { return I18N[getLang()]; }

function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = I18N[lang].dir;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = key.split('.').reduce((o, k) => (o ? o[k] : null), I18N[lang]);
    if (val) el.textContent = val;
  });
  document.dispatchEvent(new CustomEvent('langchange'));
}
