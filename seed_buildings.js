// seed_buildings.js — يدخل كل مباني الجامعة (مناطق E و C) دفعة واحدة
// آمن للتشغيل أكثر من مرة: لو المبنى موجود أصلًا (بنفس الاسم الإنجليزي)، يتجاهله ولا يكرره
// الاستخدام: node seed_buildings.js
const db = require('./db');

const buildings = [
  // ---------------- الكليات الطبية (Zone E) ----------------
  { name_ar: 'كلية الصيدلة و العلوم الصحية', name_en: 'College of Pharmacy and Health Sciences', code: 'E1', lat: 25.299236, lng: 55.486372, icon: '🩺' },
  { name_ar: 'مسرح الرازي', name_en: 'Al Razi Auditorium', code: 'E2', lat: 25.300414, lng: 55.486933, icon: '🏛️' },
  { name_ar: 'كليات الطب والعلوم الصحية', name_en: 'Medical and Health Sciences Colleges', code: 'E3', lat: 25.300962, lng: 55.487405, icon: '🩺' },
  { name_ar: 'مبنى المكتبة (الطبية)', name_en: 'Library Building (Medical)', code: 'E4', lat: 25.301442, lng: 55.4877, icon: '📚' },
  { name_ar: 'كلية الطب', name_en: 'College of Medicine', code: 'E5', lat: 25.302422, lng: 55.488719, icon: '🩺' },
  { name_ar: 'معهد البحوث الطبية والعلوم الصحية', name_en: 'Research Institute for Medical and Health Sciences', code: 'E6', lat: 25.300109, lng: 55.488693, icon: '🏛️' },
  { name_ar: 'مركز التدريب الاكلينيكي و الجراحي', name_en: 'Clinical Surgical Training Center', code: 'E7', lat: 25.300109, lng: 55.488693, icon: '🩺' },
  { name_ar: 'مجمع المطاعم (الطبية)', name_en: 'Dining Hall (Medical)', code: 'E8', lat: 25.300109, lng: 55.488693, icon: '🍽️' },
  { name_ar: 'كلية طب الأسنان', name_en: 'College of Dental Medicine', code: 'E9', lat: 25.300109, lng: 55.488693, icon: '🩺' },
  { name_ar: 'مستشفى الأسنان الجامعي بالشارقة', name_en: 'University Dental Hospital Sharjah', code: 'E11', lat: 25.298455, lng: 55.488671, icon: '🩺' },

  // ---------------- كليات البنات (Zone C) ----------------
  { name_ar: 'كلية الشريعة والدراسات الإسلامية', name_en: 'College of Sharia and Islamic Studies', code: 'C1', lat: 25.293311, lng: 55.481354, icon: '🕌' },
  { name_ar: 'كلية القانون', name_en: 'College of Law', code: 'C1', lat: 25.293311, lng: 55.481354, icon: '🏛️' },
  { name_ar: 'كلية الآداب والعلوم الإنسانية والاجتماعية', name_en: 'College of Arts, Humanities and Social Sciences', code: 'C2', lat: 25.292526, lng: 55.480565, icon: '🏛️' },
  { name_ar: 'كلية السياسات العامة', name_en: 'College of Public Policy', code: 'C2', lat: 25.292526, lng: 55.480565, icon: '🏛️' },
  { name_ar: 'كلية الآداب والعلوم الإنسانية والاجتماعية', name_en: 'College of Arts, Humanities and Social Sciences (C3)', code: 'C3', lat: 25.291519, lng: 55.480061, icon: '🏛️' },
  { name_ar: 'مجمع المطاعم (البنات)', name_en: 'Dining Hall (Girls)', code: 'C4', lat: 25.290171, lng: 55.480402, icon: '🍽️' },
  { name_ar: 'مركز الطالبات', name_en: 'Students Center', code: 'C5', lat: 25.290171, lng: 55.480402, icon: '🏛️' },
  { name_ar: 'منتدى الطالبات', name_en: 'Students Forum', code: 'C6', lat: 25.290171, lng: 55.480402, icon: '🏛️' },
  { name_ar: 'مبنى المكتبة (البنات)', name_en: 'Library Building (Girls)', code: 'C7', lat: 25.290171, lng: 55.480402, icon: '📚' },
  { name_ar: 'قاعات دراسية (C8)', name_en: 'Classrooms (C8)', code: 'C8', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'كلية الحوسبة والمعلوماتية', name_en: 'College of Computing and Informatics', code: 'C9', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'كلية إدارة الأعمال', name_en: 'College of Business Administration', code: 'C10', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'كلية الاتصال', name_en: 'College of Communication', code: 'C11', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'قاعات دراسية (C12)', name_en: 'Classrooms (C12)', code: 'C12', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'كلية الهندسة', name_en: 'College of Engineering', code: 'C13', lat: 25.289167, lng: 55.477349, icon: '🏗️' },
  { name_ar: 'قاعات دراسية (C14)', name_en: 'Classrooms (C14)', code: 'C14', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
  { name_ar: 'المجمع الرياضي', name_en: 'Sports Complex', code: 'C15', lat: 25.293251, lng: 55.482105, icon: '🏟️' },
  { name_ar: 'قاعات دراسية (C16)', name_en: 'Classrooms (C16)', code: 'C16', lat: 25.289167, lng: 55.477349, icon: '🏛️' },
];

const getExisting = db.prepare('SELECT id FROM buildings WHERE name_en = ?');
const insert = db.prepare('INSERT INTO buildings (name_ar, name_en, lat, lng, icon, color) VALUES (?,?,?,?,?,?)');

let added = 0, skipped = 0;
buildings.forEach((b) => {
  if (getExisting.get(b.name_en)) {
    console.log(`↺ موجود أصلًا: ${b.name_ar} (${b.code})`);
    skipped++;
  } else {
    insert.run(b.name_ar, b.name_en, b.lat, b.lng, b.icon, '#2eb386');
    console.log(`✅ أُضيف: ${b.name_ar} (${b.code})`);
    added++;
  }
});

console.log(`\n📊 النتيجة: ${added} مبنى جديد أُضيف، ${skipped} كان موجود أصلًا وتم تجاهله.`);
console.log('⚠️ تذكير: بعض المباني (E6-E9, C8-C12, C14, C16) عندها إحداثيات مؤقتة متطابقة — عدّلها لاحقًا من لوحة الإدارة → المباني، فور ما توصلك الإحداثيات الدقيقة الفردية.');
