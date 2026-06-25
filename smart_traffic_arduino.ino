// --- PIN TANIMLAMALARI ---
const int L1[] = {2, 3, 4};   // 1. Yön (Kuzey - Ana Yol) [Kırmızı, Sarı, Yeşil]
const int L2[] = {5, 6, 7};   // 2. Yön (Güney - Ana Yol) [Kırmızı, Sarı, Yeşil]
const int L3[] = {8, 9, 10};  // 3. Yön (Doğu - Yan Yol / Ara Sokak) [Kırmızı, Sarı, Yeşil]
const int L4[] = {11, 12, 13};// 4. Yön (Batı - Yan Yol / Ara Sokak) [Kırmızı, Sarı, Yeşil]

const int sensorPin = A0;     // FS-80 Cisim Sensörü Pini
const int thresholdValue = 512; // Sensör hassasiyet eşiği (%50)

// --- SİSTEM DURUMLARI ---
String currentMode = "ROUTINE"; // ROUTINE, AUTO, EMERGENCY
unsigned long lastRoutineChange = 0;
String currentBroadcastedState = "";

// Zamanlamalar (Milisaniye cinsinden)
unsigned long nsGreenTime = 5000;    // Ana Yol Yeşil Süresi (Kuzey-Güney)
unsigned long ewGreenTime = 5000;    // Yan Yol Yeşil Süresi (Doğu-Batı)
unsigned long yellowTime = 2000;     // Sarı ışık geçiş süresi

// Otomatik Mod (Sensör) Değişkenleri
int autoState = 0;
unsigned long autoStateTimer = 0;

void setup() {
  Serial.begin(9600);
  
  for (int i = 0; i < 3; i++) {
    pinMode(L1[i], OUTPUT);
    pinMode(L2[i], OUTPUT);
    pinMode(L3[i], OUTPUT);
    pinMode(L4[i], OUTPUT);
  }
  
  pinMode(sensorPin, INPUT);
}

void loop() {
  checkSerialCommands();

  if (currentMode == "AUTO") {
    handleAutoMode();
  } else if (currentMode == "ROUTINE") {
    handleRoutineMode();
  } else if (currentMode == "EMERGENCY") {
    handleEmergencyMode();
  }
}

// --- SERİ PORT KOMUT DİNLEYİCİ ---
void checkSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); 
    
    if (command.startsWith("MODE:")) {
      currentMode = command.substring(5);
      Serial.println("ACK: Mod Degistirildi -> " + currentMode);
      lastRoutineChange = millis();
      autoState = 0; // Otomatik modu sıfırla
    } 
    else if (command.startsWith("TIME_NS:")) {
      nsGreenTime = command.substring(8).toInt();
      Serial.println("ACK: Ana Yol Suresi -> " + String(nsGreenTime));
    }
    else if (command.startsWith("TIME_EW:")) {
      ewGreenTime = command.substring(8).toInt();
      Serial.println("ACK: Yan Yol Suresi -> " + String(ewGreenTime));
    }
  }
}

// --- WEB'E DURUM VE SAYAC BİLDİRİMİ ---
// Örnek Çıktı: "STATE:NS_GREEN:12" (Faz ve Kalan Saniye)
void broadcastStateWithTime(String newState, long remainingSeconds) {
  String payload = newState + ":" + String(remainingSeconds);
  // Saniye saniye ekranda değişmesi için currentBroadcastedState'i sadece faz+saniye değişince gönderiyoruz.
  if (currentBroadcastedState != payload) {
    currentBroadcastedState = payload;
    Serial.println("STATE:" + payload);
  }
}

// --- KLASİK RUTİN ZAMAN AYARLI MOD (6 FAZ) ---
void handleRoutineMode() {
  unsigned long timePassed = millis() - lastRoutineChange;
  unsigned long totalCycle = nsGreenTime + (yellowTime * 4) + ewGreenTime;
  timePassed = timePassed % totalCycle; 
  
  long remaining = 0;

  if (timePassed < nsGreenTime) {
    remaining = (nsGreenTime - timePassed) / 1000;
    isiklariAyarla(LOW, LOW, HIGH, HIGH, LOW, LOW); 
    broadcastStateWithTime("NS_GREEN", remaining);
  } 
  else if (timePassed < nsGreenTime + yellowTime) {
    remaining = (nsGreenTime + yellowTime - timePassed) / 1000;
    isiklariAyarla(LOW, HIGH, LOW, HIGH, LOW, LOW); 
    broadcastStateWithTime("NS_YELLOW", remaining);
  } 
  else if (timePassed < nsGreenTime + (yellowTime * 2)) {
    remaining = (nsGreenTime + (yellowTime * 2) - timePassed) / 1000;
    isiklariAyarla(HIGH, LOW, LOW, LOW, HIGH, LOW); 
    broadcastStateWithTime("EW_PREP", remaining);
  } 
  else if (timePassed < nsGreenTime + (yellowTime * 2) + ewGreenTime) {
    remaining = (nsGreenTime + (yellowTime * 2) + ewGreenTime - timePassed) / 1000;
    isiklariAyarla(HIGH, LOW, LOW, LOW, LOW, HIGH); 
    broadcastStateWithTime("EW_GREEN", remaining);
  } 
  else if (timePassed < nsGreenTime + (yellowTime * 3) + ewGreenTime) {
    remaining = (nsGreenTime + (yellowTime * 3) + ewGreenTime - timePassed) / 1000;
    isiklariAyarla(HIGH, LOW, LOW, LOW, HIGH, LOW); 
    broadcastStateWithTime("EW_YELLOW", remaining);
  } 
  else {
    remaining = (totalCycle - timePassed) / 1000;
    isiklariAyarla(LOW, HIGH, LOW, HIGH, LOW, LOW); 
    broadcastStateWithTime("NS_PREP", remaining);
  }
}

// --- YENİ OTOMATİK MOD (YAPAY ZEKA / SENSÖR) ---
void handleAutoMode() {
  int sensorValue = analogRead(sensorPin);
  bool isVehiclePresent = (sensorValue > thresholdValue);
  long remaining = 0;
  
  switch(autoState) {
    case 0: // Cadde (NS) Yeşil, Bekleme
      isiklariAyarla(LOW, LOW, HIGH, HIGH, LOW, LOW);
      broadcastStateWithTime("NS_GREEN", 99); // 99 sn Sonsuz Bekleme Anlamında
      
      if (isVehiclePresent) {
         autoState = 1;
         autoStateTimer = millis();
      }
      break;
      
    case 1: // Araç Geldi -> Cadde Sarıya Döner
      isiklariAyarla(LOW, HIGH, LOW, HIGH, LOW, LOW);
      remaining = (yellowTime - (millis() - autoStateTimer)) / 1000;
      broadcastStateWithTime("NS_YELLOW", remaining);
      if (millis() - autoStateTimer >= yellowTime) {
         autoState = 2;
         autoStateTimer = millis();
      }
      break;
      
    case 2: // Yan Yol Hazırlık (NS Kırmızı, EW Sarı)
      isiklariAyarla(HIGH, LOW, LOW, LOW, HIGH, LOW);
      remaining = (yellowTime - (millis() - autoStateTimer)) / 1000;
      broadcastStateWithTime("EW_PREP", remaining);
      if (millis() - autoStateTimer >= yellowTime) {
         autoState = 3;
      }
      break;
      
    case 3: // Yan Yol (EW) Yeşil Yanar (Araç varken bitmez)
      isiklariAyarla(HIGH, LOW, LOW, LOW, LOW, HIGH);
      
      if (isVehiclePresent) {
         // Araç varken sayacı sıfırlayarak 5 saniyenin başlamasını engeller
         autoStateTimer = millis(); 
         broadcastStateWithTime("EW_GREEN", 5); 
      } else {
         // Araç Gitti! 5 saniyelik geri sayım başladı
         remaining = (5000 - (millis() - autoStateTimer)) / 1000;
         broadcastStateWithTime("EW_GREEN", remaining);
         if (millis() - autoStateTimer >= 5000) {
            autoState = 4;
            autoStateTimer = millis();
         }
      }
      break;
      
    case 4: // Yan Yol Sarı (Araç gitti, caddeye dönüyoruz)
      isiklariAyarla(HIGH, LOW, LOW, LOW, HIGH, LOW);
      remaining = (yellowTime - (millis() - autoStateTimer)) / 1000;
      broadcastStateWithTime("EW_YELLOW", remaining);
      if (millis() - autoStateTimer >= yellowTime) {
         autoState = 5;
         autoStateTimer = millis();
      }
      break;
      
    case 5: // Cadde Hazırlık (NS Sarı, EW Kırmızı)
      isiklariAyarla(LOW, HIGH, LOW, HIGH, LOW, LOW);
      remaining = (yellowTime - (millis() - autoStateTimer)) / 1000;
      broadcastStateWithTime("NS_PREP", remaining);
      if (millis() - autoStateTimer >= yellowTime) {
         autoState = 0; // Her şey başa döndü, Cadde tekrar yeşil!
      }
      break;
  }
}

// --- ACİL DURUM MODU ---
void handleEmergencyMode() {
  // Tüm yönler KIRMIZI
  isiklariAyarla(HIGH, LOW, LOW, HIGH, LOW, LOW); 
  broadcastStateWithTime("ALL_RED", 0);
}

// --- YARDIMCI FONKSİYON ---
void isiklariAyarla(int nsR, int nsY, int nsG, int ewR, int ewY, int ewG) {
  // Kuzey Güney (L1 ve L2)
  digitalWrite(L1[0], nsR); digitalWrite(L1[1], nsY); digitalWrite(L1[2], nsG);
  digitalWrite(L2[0], nsR); digitalWrite(L2[1], nsY); digitalWrite(L2[2], nsG);
  
  // Doğu Batı (L3 ve L4)
  digitalWrite(L3[0], ewR); digitalWrite(L3[1], ewY); digitalWrite(L3[2], ewG);
  digitalWrite(L4[0], ewR); digitalWrite(L4[1], ewY); digitalWrite(L4[2], ewG);
}