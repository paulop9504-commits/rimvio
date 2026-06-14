# Rimvio Google Play (Android) 출시

> **플랫폼:** Capacitor 6 · WebView → `CAPACITOR_SERVER_URL`  
> **Application ID:** `com.rimvio.app`  
> **공통:** [LAUNCH.md](./LAUNCH.md) · [STORE_LAUNCH_IOS.md](./STORE_LAUNCH_IOS.md)  
> **SSOT:** `lib/mobile/store-launch-config.ts` · `lib/pwa/store-meta.ts`

---

## 0. 준비 명령 (Windows OK)

```powershell
cd c:\Users\userguest\Desktop\new-project
npm run store:icons
npm run store:screenshots
$env:CAPACITOR_SERVER_URL="https://rimvio.app"
npm run store:prepare:android -- --sync
npm run mobile:android
```

---

## 1. Google Play Console

| 항목 | 값 |
|------|-----|
| 등록비 | $25 (1회) |
| Application ID | `com.rimvio.app` |
| 앱 이름 | Rimvio |
| 카테고리 | Productivity |

[Play Console](https://play.google.com/console) → Create app.

---

## 2. 서명 키스토어 (최초 1회)

Android Studio → **Build → Generate Signed App Bundle or APK**

1. **Create new keystore** — `.jks` 파일 생성
2. **백업 필수** — 분실 시 업데이트 불가
3. Output: **AAB** (Play는 AAB 필수)

예상 경로: `android/app/build/outputs/bundle/release/app-release.aab`

`android/app/build.gradle` 버전:

```gradle
versionCode 1      // 매 업로드 +1
versionName "1.0.0"
```

---

## 3. Capacitor 동기화

`capacitor.config.ts`는 prod URL을 WebView로 로드:

```powershell
$env:CAPACITOR_SERVER_URL="https://rimvio.app"
npm run store:prepare:android -- --sync
```

로컬 디버그만 할 때:

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"   # emulator → host
```

---

## 4. 스토어 등록정보

| 필드 | 소스 |
|------|------|
| 짧은 설명 | `STORE_META.shortDescription` |
| 전체 설명 | `STORE_META.longDescription` |
| 스크린샷 | `public/store/*.png` |
| 아이콘 | `public/icons/icon-512.png` |
| 개인정보 URL | `https://<prod>/privacy` |

---

## 5. 데이터 안전성 · 권한

Play Console **Data safety** + **App content** 설문 정직하게 작성.

현재 `AndroidManifest.xml` 권한:

| 권한 | 용도 | v1 심사 |
|------|------|---------|
| `INTERNET` | Vercel WebView | ✅ 필수 |
| `READ_MEDIA_IMAGES/VIDEO` | 경험 맥락 사진 매칭 | ✅ opt-in 설명 |
| `NotificationListenerService` | 알림 → 맥락 (실험) | ⚠️ v1 제출 전 **끄거나 제거** 권장 |

알림 리스너를 v1에 넣지 않으면 심사·설명 부담이 크게 줄어듭니다.

---

## 6. 공유하기 (Share Target) — v1.1 뼈대

PWA `manifest.ts`의 `share_target`은 **웹 PWA 전용**.  
Play 스토어 APK에서 **다른 앱 → Rimvio 공유**를 받으려면 `MainActivity`에 intent-filter 추가 필요.

예시 (아직 미적용 — `android/STORE_SHARE_INTENT.example.xml` 참고):

```xml
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/plain" />
  <data android:mimeType="image/*" />
  <data android:mimeType="video/*" />
</intent-filter>
```

→ `/share` deep link 처리는 v1.1 slice.

---

## 7. 출시 트랙

```
내부 테스트 (본인 기기)
  → 비공개 테스트 (지인)
  → 프로덕션 심사
  → 단계적 출시 (10% → 100%)
```

실기기 QA: [PHONE_QA.md](./PHONE_QA.md)

---

## 8. v1 범위

| 포함 | v1.1 |
|------|------|
| Capacitor + prod WebView | Android share intent |
| Feed · Globe · Bridge | NotificationListener |
| 사진·동영상 read (opt-in) | TWA 대신 full native shell polish |

---

## 9. 업데이트

| 변경 | 방법 |
|------|------|
| UI / API (웹) | Vercel 배포 → 앱 재설치 없이 반영 |
| 네이티브 · 권한 · versionCode | 새 AAB 업로드 |

---

## 10. 체크리스트

- [ ] `npm run store:prepare:android` 전부 ✓ (share-intent는 v1.1 optional ✗ OK)
- [ ] Play Console 앱 생성
- [ ] Keystore 백업
- [ ] Signed AAB 내부 테스트 업로드
- [ ] Data safety 설문
- [ ] `/privacy` URL

---

## 11. 롤백

- **웹:** Vercel Promote
- **Play:** Console → Release → 이전 AAB로 promote (versionCode 규칙 준수)
