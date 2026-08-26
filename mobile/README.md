# httpSMS Android Mobile App Setup Guide

Is folder me Android mobile ke liye **`HttpSms.apk`** file ready hai. Is app se aapka Android phone ek 100% Free SMS Gateway ban jayega.

---

## Step-by-Step Mobile Installation & Setup

### Step 1: APK Copy & Install Karein
1. `mobile/HttpSms.apk` file ko apne Android phone par send/copy karein (via WhatsApp, Telegram, USB, ya Google Drive).
2. Android phone par `HttpSms.apk` file par tap karke **Install** karein.
3. Agar phone "Install unknown apps" ki warning de, toh **Allow / Enable** kar dein.

---

### Step 2: httpSMS Account & API Key Obtain Karein
1. Phone ya PC me **[httpsms.com](https://httpsms.com)** website kholein.
2. Sign up / Log in karein (Free Account).
3. **Settings** / **API Keys** section me jaakar apni **API Key** copy karein.
4. Apna Mobile SIM Number register karein (e.g. `+919876543210`).

---

### Step 3: App Config & Permissions
1. Mobile me **httpSMS** App open karein.
2. Apne **httpsms.com** account ke credentials se login karein.
3. App dwara maangi gayi permissions (SMS Send, SMS Read State) ko **ALLOW** karein.

---

### Step 4: Background Optimization Off Karein (Important!)
Taaki App background me kill na ho aur 24x7 OTP send kar sake:
1. Phone Settings -> **Apps** -> **httpSMS** -> **Battery** me jayein.
2. Battery Usage ko **Unrestricted / Don't Optimize** select karein.
3. Phone me Internet (WiFi ya Mobile Data) aur SIM card active rakhein.

---

### Step 5: Quro AI Backend Environment Configuration
Apne `quro.io-main/backend/.env` file me ye values add karein:

```env
HTTPSMS_API_KEY=your_copied_api_key_here
HTTPSMS_FROM_NUMBER=+91XXXXXXXXXX
```

Aapka Mobile Auth System 100% Ready hai! Daily 100 Free SMS quota direct aapke Indian SIM card se send hoga.
