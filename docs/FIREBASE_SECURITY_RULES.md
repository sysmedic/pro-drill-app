# Firestore 파이어베이스 보안 규칙 (Security Rules) 최종 통합본

파이어베이스 콘솔(Firebase Console) ➔ Firestore Database ➔ **Rules (규칙)** 탭에 아래 코드 전체를 그대로 복사해 붙여넣으신 후 **[게시 (Publish)]**를 누르시면 됩니다.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 👑 1. 승인된 지공사 라이선스 관리 테이블
    match /licenses/{licenseId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasAll(['status', 'userTier']);
    }
    
    // 📊 2. 트라이얼 사용자 기기 및 접속 집계 테이블
    match /trial_users/{trialId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasAny(['email', 'lastActive', 'daysLeft']);
    }

    // 🎳 3. 현장 볼링공 DB 실시간 0원 무과금 수집 컬렉션 (NEW)
    match /shared_bowling_balls/{ballId} {
      allow read, delete: if true;
      allow write: if request.resource.data.keys().hasAny(['ballName', 'weight', 'coreType', 'rg', 'diff', 'status', 'contributedBy']);
    }

    // 👤 4. 지공사 사용자 프로필 테이블
    match /users/{userEmail} {
      allow read, write: if true;
    }
  }
}
```
