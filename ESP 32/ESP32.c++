
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------- WIFI ----------
const char* WIFI_SSID = "packers";
const char* WIFI_PASSWORD = "6125518389";

// ---------- SUPABASE ----------
const char* SUPABASE_URL =
  "https://zantwocqgvlrcbmnlofm.supabase.co";

const char* SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7yn5D0LMFq7X0ovk4Dmsxw_Gh8EouR7";

// Temporary placeholder for the signed-in user's JWT.
// Do not use your service-role or secret key here.
const char* USER_ACCESS_TOKEN =
  "YOUR_USER_ACCESS_TOKEN";

// Refresh interval: 30 seconds
const unsigned long REFRESH_INTERVAL = 30000;
unsigned long lastRefresh = 0;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected!");
}

void fetchTasks() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected.");
    return;
  }

  WiFiClientSecure client;

  // Testing only: skips TLS certificate verification.
  // Before deployment, configure certificate verification.
  client.setInsecure();

  HTTPClient http;

  String url = String(SUPABASE_URL) +
    "/rest/v1/tasks?select=id,text,done,priority,dueDate&order=id.asc&limit=30";

  if (!http.begin(client, url)) {
    Serial.println("Could not start HTTPS request.");
    return;
  }

  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader(
    "Authorization",
    String("Bearer ") + USER_ACCESS_TOKEN
  );

  int status = http.GET();

  if (status == 200) {
    String response = http.getString();

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.println("Could not parse task JSON.");
    } else {
      Serial.println("\n--- YOUR SUPABASE TASKS ---");

      for (JsonObject task : doc.as<JsonArray>()) {
        Serial.printf(
          "Task: %s\n",
          task["text"] | "(no title)"
        );

        Serial.printf(
          "Done: %s\n",
          (task["done"] | false) ? "Yes" : "No"
        );

        Serial.printf(
          "Priority: %s\n",
          task["priority"] | "Normal"
        );

        Serial.printf(
          "Due: %s\n\n",
          task["dueDate"] | "None"
        );
      }

      Serial.println("--- END TASKS ---");
    }
  } else {
    Serial.printf("Supabase HTTP status: %d\n", status);
    Serial.println(http.getString());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  connectWiFi();

  fetchTasks();
  lastRefresh = millis();
}

void loop() {
  if (millis() - lastRefresh >= REFRESH_INTERVAL) {
    lastRefresh = millis();
    fetchTasks();
  }

  delay(50);
}
