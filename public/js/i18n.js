// i18n.js — قاموس ترجمة شامل: شاشة العرض + الصفحة الرئيسية + صفحات الدخول + تطبيق السائق + لوحة الإدارة
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
    kiosk: {
      idleTitle: 'تتبع حافلات الجامعة', idleSubtitle: 'خدمة النقل الداخلي — جامعة الشارقة',
      tapPrompt: 'المس الشاشة لمعرفة موعد حافلتك', chooseDest: 'وين تبي توصل؟', chooseDestSub: 'اختر المبنى أو الكلية',
      backToDest: 'رجوع لاختيار وجهة ثانية', arrivingTo: 'الحافلات القادمة إلى',
    },
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

    admin: {
      nav: {
        overview: 'نظرة عامة', map: 'الخريطة الحية', vehicles: 'المركبات', stations: 'المحطات',
        routes: 'المسارات', drivers: 'السائقون', alerts: 'التنبيهات', announcements: 'الإعلانات',
        incidents: 'البلاغات', reports: 'التقارير', users: 'المستخدمون', audit: 'سجل التدقيق',
      },
      roleLabels: { super_admin: 'مدير عام', transport_manager: 'مدير النقل', dispatcher: 'موظف تشغيل', viewer: 'مشاهدة فقط', driver: 'سائق' },
      changePassword: 'تغيير كلمة المرور',
      logout: 'تسجيل الخروج',
      common: {
        add: '+ إضافة', edit: 'تعديل', delete: 'حذف', save: 'حفظ التعديلات', cancel: 'إلغاء',
        actions: '', name: 'الاسم', status: 'الحالة', active: 'نشط', inactive: 'موقوف',
        confirmDelete: 'هل أنت متأكد من الحذف؟', none: '— بدون —', yourAccount: 'حسابك',
      },
      overview: {
        title: 'نظرة عامة',
        total: 'إجمالي الحافلات', inService: 'في الخدمة', approaching: 'تقترب من محطة', atStation: 'عند المحطة',
        delayed: 'متأخرة', emergency: 'حالات طارئة', outOfService: 'خارج الخدمة', offline: 'غير متصلة',
        activeTrips: 'رحلات نشطة الآن', arrivalsLast7: 'وصولات آخر 7 أيام',
      },
      vehicles: {
        title: 'المركبات (الحافلات)', addBtn: '+ إضافة حافلة',
        name: 'الاسم', plate: 'اللوحة', type: 'النوع', seats: 'السعة', route: 'المسار', driver: 'السائق',
        status: 'الحالة', connectivity: 'الاتصال', deviceKey: 'مفتاح الجهاز',
        online: 'متصل', offlineStatus: 'غير متصل', empty: 'لا توجد حافلات مضافة بعد',
        formName: 'اسم الحافلة', formPlate: 'رقم اللوحة', formType: 'نوع الحافلة', formSeats: 'عدد المقاعد',
        formPhoto: 'رابط صورة الحافلة (اختياري)', formRoute: 'المسار', formDriver: 'السائق',
        formStatus: 'حالة المركبة', formDeviceKey: 'مفتاح جهاز GPS (فريد)',
        addTitle: 'إضافة الحافلة', editTitle: 'حفظ التعديلات',
        statusActive: 'نشطة', statusMaintenance: 'صيانة', statusInactive: 'متوقفة',
        busStatusActive: 'نشطة', busStatusEmergency: 'طارئة', busStatusMaintenance: 'خارج الخدمة',
      },
      stations: {
        title: 'المحطات', addBtn: '+ إضافة محطة',
        code: 'الرمز', nameAr: 'الاسم (عربي)', nameEn: 'الاسم (إنجليزي)', lat: 'خط العرض', lng: 'خط الطول',
        empty: 'لا توجد محطات بعد',
        formCode: 'الرمز', formNameAr: 'الاسم بالعربية', formNameEn: 'الاسم بالإنجليزية',
        formLat: 'خط العرض (Latitude)', formLng: 'خط الطول (Longitude)', formStatus: 'الحالة',
        addTitle: 'إضافة المحطة',
        statusActive: 'نشطة', statusInactive: 'موقوفة',
      },
      routes: {
        title: 'المسارات', addBtn: '+ إضافة مسار', addStation: '+ إضافة محطة', manualDraw: '🖊️ رسم يدوي',
        deleteRoute: 'حذف المسار', editBtn: '✏️ تعديل', remove: 'إزالة', sequence: '#', station: 'المحطة',
        empty: 'لا توجد مسارات بعد', emptyStations: 'لا توجد محطات في هذا المسار',
        formNameAr: 'الاسم بالعربية', formNameEn: 'الاسم بالإنجليزية', formColor: 'اللون',
        formStart: 'وقت البدء', formEnd: 'وقت الانتهاء', formStatus: 'الحالة',
        addTitle: 'إضافة المسار',
        promptStationList: 'اختر رقم المحطة من القائمة:', promptSequence: 'ترتيب المحطة في المسار:',
      },
      drivers: {
        title: 'السائقون', addBtn: '+ إضافة سائق',
        phone: 'الهاتف', license: 'رقم الرخصة', status: 'الحالة', empty: 'لا يوجد سائقون بعد',
        formName: 'اسم السائق', formPhone: 'رقم الهاتف', formLicense: 'رقم رخصة القيادة', formStatus: 'الحالة',
        addTitle: 'إضافة السائق',
        statusActive: 'نشط', statusInactive: 'موقوف',
      },
      alerts: {
        title: 'التنبيهات',
        bus: 'الحافلة', type: 'النوع', message: 'الرسالة', severity: 'الخطورة', time: 'الوقت',
        resolve: 'تمييز كمعالج', resolved: '✅ معالج', pending: '⏳', empty: 'لا توجد تنبيهات',
      },
      announcements: {
        title: 'الإعلانات (تظهر في شاشات المحطات)', addBtn: '+ إعلان جديد',
        ar: 'عربي', en: 'إنجليزي', scope: 'النطاق', allStations: 'كل المحطات', created: 'الإنشاء',
        empty: 'لا توجد إعلانات',
        formMessageAr: 'النص بالعربية', formMessageEn: 'النص بالإنجليزية',
        formExpires: 'ينتهي بعد (دقائق، اتركه فارغًا لعدم الانتهاء)',
        addTitle: 'نشر الإعلان',
      },
      incidents: {
        title: 'بلاغات السائقين',
        bus: 'الحافلة', driver: 'السائق', type: 'النوع', notes: 'الملاحظات', time: 'الوقت',
        resolve: 'معالجة', empty: 'لا توجد بلاغات',
        types: { breakdown: 'عطل', congestion: 'ازدحام', accident: 'حادث', emergency: 'طارئ' },
      },
      reports: {
        title: 'التقارير', exportCsv: '⬇ تصدير CSV / Excel',
        summaryTitle: 'ملخص آخر 7 أيام', arrivalsTitle: 'سجل الوصول للمحطات',
        bus: 'الحافلة', plate: 'اللوحة', arrivalsToday: 'الوصولات (اليوم)', arrivals7: 'الوصولات (7 أيام)',
        route: 'المسار', station: 'المحطة', time: 'الوقت', empty: 'لا يوجد سجل بعد',
      },
      users: {
        title: 'حسابات المستخدمين', addBtn: '+ إضافة مستخدم',
        name: 'الاسم', email: 'البريد', role: 'الدور',
        formName: 'الاسم', formEmail: 'البريد الإلكتروني', formPassword: 'كلمة المرور',
        formPasswordEdit: 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)', formRole: 'الدور',
        addTitle: 'إضافة المستخدم',
      },
      audit: {
        title: 'سجل التدقيق (Audit Log)',
        user: 'المستخدم', action: 'الإجراء', entity: 'العنصر', time: 'الوقت',
      },
    },
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
        kiosk: {
      idleTitle: 'University Bus Tracking', idleSubtitle: 'Internal Transport Service — University of Sharjah',
      tapPrompt: 'Tap the screen to check your bus arrival', chooseDest: 'Where do you want to go?', chooseDestSub: 'Select a building or college',
      backToDest: 'Back to destinations', arrivingTo: 'Buses arriving to',
    },
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

    admin: {
      nav: {
        overview: 'Overview', map: 'Live Map', vehicles: 'Vehicles', stations: 'Stations',
        routes: 'Routes', drivers: 'Drivers', alerts: 'Alerts', announcements: 'Announcements',
        incidents: 'Incidents', reports: 'Reports', users: 'Users', audit: 'Audit Log',
      },
      roleLabels: { super_admin: 'Super Admin', transport_manager: 'Transport Manager', dispatcher: 'Dispatcher', viewer: 'Viewer', driver: 'Driver' },
      changePassword: 'Change Password',
      logout: 'Sign Out',
      common: {
        add: '+ Add', edit: 'Edit', delete: 'Delete', save: 'Save Changes', cancel: 'Cancel',
        actions: '', name: 'Name', status: 'Status', active: 'Active', inactive: 'Inactive',
        confirmDelete: 'Are you sure you want to delete this?', none: '— None —', yourAccount: 'Your account',
      },
      overview: {
        title: 'Overview',
        total: 'Total Buses', inService: 'In Service', approaching: 'Approaching a Station', atStation: 'At Station',
        delayed: 'Delayed', emergency: 'Emergencies', outOfService: 'Out of Service', offline: 'Offline',
        activeTrips: 'Active Trips Now', arrivalsLast7: 'Arrivals (Last 7 Days)',
      },
      vehicles: {
        title: 'Vehicles (Buses)', addBtn: '+ Add Vehicle',
        name: 'Name', plate: 'Plate', type: 'Type', seats: 'Seats', route: 'Route', driver: 'Driver',
        status: 'Status', connectivity: 'Connectivity', deviceKey: 'Device Key',
        online: 'Online', offlineStatus: 'Offline', empty: 'No vehicles added yet',
        formName: 'Bus Name', formPlate: 'Plate Number', formType: 'Bus Type', formSeats: 'Number of Seats',
        formPhoto: 'Bus Photo URL (optional)', formRoute: 'Route', formDriver: 'Driver',
        formStatus: 'Vehicle Status', formDeviceKey: 'GPS Device Key (unique)',
        addTitle: 'Add Vehicle', editTitle: 'Save Changes',
        statusActive: 'Active', statusMaintenance: 'Maintenance', statusInactive: 'Inactive',
        busStatusActive: 'Active', busStatusEmergency: 'Emergency', busStatusMaintenance: 'Out of Service',
      },
      stations: {
        title: 'Stations', addBtn: '+ Add Station',
        code: 'Code', nameAr: 'Name (Arabic)', nameEn: 'Name (English)', lat: 'Latitude', lng: 'Longitude',
        empty: 'No stations added yet',
        formCode: 'Code', formNameAr: 'Arabic Name', formNameEn: 'English Name',
        formLat: 'Latitude', formLng: 'Longitude', formStatus: 'Status',
        addTitle: 'Add Station',
        statusActive: 'Active', statusInactive: 'Inactive',
      },
      routes: {
        title: 'Routes', addBtn: '+ Add Route', addStation: '+ Add Station', manualDraw: '🖊️ Manual Draw',
        deleteRoute: 'Delete Route', editBtn: '✏️ Edit', remove: 'Remove', sequence: '#', station: 'Station',
        empty: 'No routes added yet', emptyStations: 'No stations in this route',
        formNameAr: 'Arabic Name', formNameEn: 'English Name', formColor: 'Color',
        formStart: 'Start Time', formEnd: 'End Time', formStatus: 'Status',
        addTitle: 'Add Route',
        promptStationList: 'Choose a station number from the list:', promptSequence: 'Station order in the route:',
      },
      drivers: {
        title: 'Drivers', addBtn: '+ Add Driver',
        phone: 'Phone', license: 'License Number', status: 'Status', empty: 'No drivers added yet',
        formName: 'Driver Name', formPhone: 'Phone Number', formLicense: 'Driving License Number', formStatus: 'Status',
        addTitle: 'Add Driver',
        statusActive: 'Active', statusInactive: 'Inactive',
      },
      alerts: {
        title: 'Alerts',
        bus: 'Bus', type: 'Type', message: 'Message', severity: 'Severity', time: 'Time',
        resolve: 'Mark Resolved', resolved: '✅ Resolved', pending: '⏳', empty: 'No alerts',
      },
      announcements: {
        title: 'Announcements (shown on station screens)', addBtn: '+ New Announcement',
        ar: 'Arabic', en: 'English', scope: 'Scope', allStations: 'All Stations', created: 'Created',
        empty: 'No announcements',
        formMessageAr: 'Arabic Message', formMessageEn: 'English Message',
        formExpires: 'Expires after (minutes, leave empty for no expiry)',
        addTitle: 'Publish Announcement',
      },
      incidents: {
        title: 'Driver Reports',
        bus: 'Bus', driver: 'Driver', type: 'Type', notes: 'Notes', time: 'Time',
        resolve: 'Resolve', empty: 'No reports',
        types: { breakdown: 'Breakdown', congestion: 'Congestion', accident: 'Accident', emergency: 'Emergency' },
      },
      reports: {
        title: 'Reports', exportCsv: '⬇ Export CSV / Excel',
        summaryTitle: 'Last 7 Days Summary', arrivalsTitle: 'Station Arrivals Log',
        bus: 'Bus', plate: 'Plate', arrivalsToday: 'Arrivals (Today)', arrivals7: 'Arrivals (7 Days)',
        route: 'Route', station: 'Station', time: 'Time', empty: 'No records yet',
      },
      users: {
        title: 'User Accounts', addBtn: '+ Add User',
        name: 'Name', email: 'Email', role: 'Role',
        formName: 'Name', formEmail: 'Email Address', formPassword: 'Password',
        formPasswordEdit: 'New password (leave empty to keep unchanged)', formRole: 'Role',
        addTitle: 'Add User',
      },
      audit: {
        title: 'Audit Log',
        user: 'User', action: 'Action', entity: 'Entity', time: 'Time',
      },
    },
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

// مزامنة اللغة تلقائيًا بين الصفحة الرئيسية وأي إطار (iframe) مضمّن بداخلها مثل الخريطة الحية بلوحة الإدارة
window.addEventListener('storage', (e) => {
  if (e.key === 'bus_lang') applyLang();
});
