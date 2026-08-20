// i18n.js — قاموس ترجمة موسّع
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
    landingSubtitle: 'منصة تتبع حافلات جامعة الشارقة',
    landingTrackBtn: '🗺️ تتبع الحافلات المباشر',
    landingDriverBtn: '🚌 دخول السائقين',
    landingStaffBtn: '🔐 دخول الموظفين',
    staffLoginTitle: '🔐 دخول الموظفين',
    staffLoginSubtitle: 'نظام تتبع حافلات جامعة الشارقة',
    driverLoginTitle: '🚌 دخول السائقين',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    loginBtn: 'تسجيل الدخول',
    backHome: '⬅ رجوع للصفحة الرئيسية',
    back: '⬅ رجوع',
    loginFailed: 'فشل تسجيل الدخول',
    notDriverAccount: 'هذا الحساب ليس حساب سائق',
    driverAppTitle: 'تطبيق السائق',
    logout: 'خروج',
    chooseBus: 'اختر الحافلة التي ستقودها الآن',
    startTrip: '🚌 بدء الرحلة',
    endTrip: 'إنهاء الرحلة',
    shareLocationStart: '📍 بدء مشاركة الموقع',
    shareLocationStop: '⏸️ إيقاف مشاركة الموقع',
    reportBreakdown: '🔧 عطل',
    reportCongestion: '🚦 ازدحام',
    reportAccident: '⚠️ حادث',
    reportEmergency: '🆘 طارئ',
    outOfServiceBtn: 'إيقاف الحافلة عن الخدمة',
    tripStartedMsg: 'تم بدء الرحلة بنجاح',
    tripEndedMsg: 'تم إنهاء الرحلة',
    outOfServiceMsg: 'تم إيقاف الحافلة عن الخدمة',
    incidentSentMsg: 'تم إرسال البلاغ',
    confirmEndTrip: 'هل تريد إنهاء الرحلة؟',
    noRoute: 'بدون مسار',
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
    landingSubtitle: 'University of Sharjah Live Bus Tracking Platform',
    landingTrackBtn: '🗺️ Live Bus Map',
    landingDriverBtn: '🚌 Driver Login',
    landingStaffBtn: '🔐 Staff Login',
    staffLoginTitle: '🔐 Staff Login',
    staffLoginSubtitle: 'University of Sharjah Bus Tracking System',
    driverLoginTitle: '🚌 Driver Login',
    email: 'Email Address',
    password: 'Password',
    loginBtn: 'Sign In',
    backHome: '⬅ Back to Home',
    back: '⬅ Back',
    loginFailed: 'Login failed',
    notDriverAccount: 'This account is not a driver account',
    driverAppTitle: 'Driver App',
    logout: 'Sign Out',
    chooseBus: 'Choose the bus you are driving now',
    startTrip: '🚌 Start Trip',
    endTrip: 'End Trip',
    shareLocationStart: '📍 Start Sharing Location',
    shareLocationStop: '⏸️ Stop Sharing Location',
    reportBreakdown: '🔧 Breakdown',
    reportCongestion: '🚦 Congestion',
    reportAccident: '⚠️ Accident',
    reportEmergency: '🆘 Emergency',
    outOfServiceBtn: 'Take Bus Out of Service',
    tripStartedMsg: 'Trip started successfully',
    tripEndedMsg: 'Trip ended',
    outOfServiceMsg: 'Bus marked out of service',
    incidentSentMsg: 'Report sent',
    confirmEndTrip: 'Do you want to end the trip?',
    noRoute: 'No route assigned',
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = key.split('.').reduce((o, k) => (o ? o[k] : null), I18N[lang]);
    if (val) el.setAttribute('placeholder', val);
  });
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = lang === 'ar' ? 'EN' : 'AR';
  document.dispatchEvent(new CustomEvent('langchange'));
}
