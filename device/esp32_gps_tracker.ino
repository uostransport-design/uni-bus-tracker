/*
  esp32_gps_tracker.ino
  ----------------------
  جهاز تتبع يُركَّب داخل كل حافلة:
  - ESP32 (لديه واي فاي/يمكن استخدام وحدة GSM/SIM800L بدلاً من الواي فاي خارج الحرم الجامعي)
  - وحدة GPS من نوع NEO-6M / NEO-M8N متصلة عبر UART
  يقرأ الإحداثيات كل بضع ثوانٍ ويرسلها إلى سيرفر النظام عبر HTTP POST.

  المكتبات المطلوبة (تُثبّت من Arduino Library Manager):
  - TinyGPSPlus
  - HTTPClient (مدمجة مع ESP32 core)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ---- إعدادات الشبكة والسيرفر ----
const char* WIFI_SSID     = "UNIVERSITY_WIFI";
const char* WIFI_PASSWORD = "WIFI_PASSWORD";
const char* SERVER_URL    = "http://your-server-domain.com/api/gps"; // غيّرها لعنوان سيرفرك
const char* DEVICE_KEY    = "DEVICE-KEY-BUS-1"; // مفتاح فريد لكل حافلة (يُطابق قيمة device_key في قاعدة البيانات)

// ---- إعدادات GPS ----
HardwareSerial gpsSerial(1); // UART1 على ESP32
TinyGPSPlus gps;
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17

const unsigned long SEND_INTERVAL_MS = 5000; // إرسال الموقع كل 5 ثوانٍ
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("جارٍ الاتصال بالشبكة");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nتم الاتصال بنجاح");
}

void loop() {
  // قراءة بيانات GPS القادمة من الوحدة
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    if (gps.location.isValid()) {
      sendLocation(gps.location.lat(), gps.location.lng(), gps.speed.kmph(), gps.course.deg());
    } else {
      Serial.println("بانتظار إشارة GPS صالحة...");
    }
  }
}

void sendLocation(double lat, double lng, double speedKmh, double heading) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"device_key\":\"" + String(DEVICE_KEY) + "\",";
  payload += "\"lat\":" + String(lat, 6) + ",";
  payload += "\"lng\":" + String(lng, 6) + ",";
  payload += "\"speed\":" + String(speedKmh, 1) + ",";
  payload += "\"heading\":" + String(heading, 1);
  payload += "}";

  int code = http.POST(payload);
  Serial.printf("إرسال الموقع (%.6f, %.6f) -> رمز الاستجابة: %d\n", lat, lng, code);
  http.end();
}
