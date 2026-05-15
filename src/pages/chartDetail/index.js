const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// 클라이언트와 달리 서버 측 로직은 요청에 따라 3일로 설정합니다.
const SERVER_TRIAL_BETA_DAYS = 7; // 7일로 정정

/**
 * 임시 베타 (trial_beta) 기간이 만료되었지만, 아직 관리자 승인을 받지 못한 사용자의 상태를
 * 'pending_approval'로 변경하는 스케줄링된 Cloud Function.
 * 매일 자정 (Asia/Seoul 타임존 기준) 실행됩니다.
 */
exports.checkTrialBetaExpiration = functions
  .region('asia-northeast3') // Functions 배포 지역을 Firestore와 가깝게 설정
  .pubsub.schedule('0 0 * * *') // 매일 자정
  .timeZone('Asia/Seoul') // 타임존은 KST (UTC+9)에 맞춰 설정
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = new Date(now.toDate().getTime() - (SERVER_TRIAL_BETA_DAYS * 24 * 60 * 60 * 1000)); // 정확한 7일 전 계산
    const sevenDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);

    console.log(`[checkTrialBetaExpiration] Running at ${now.toDate().toISOString()}`);
    console.log(`[checkTrialBetaExpiration] Checking users whose joinedAt is before ${sevenDaysAgo.toISOString()}`);

    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef
        .where('tier', '==', 'trial_beta')
        .where('approvedAt', '==', null) // 아직 승인되지 않은 사용자
        .where('joinedAt', '<', sevenDaysAgoTimestamp) // 가입일이 7일보다 오래된 사용자
        .where('status', '==', 'active') // 현재 상태가 'active'인 사용자
        .get();

      if (snapshot.empty) {
        console.log('[checkTrialBetaExpiration] No expired trial_beta users found.');
        return null;
      }

      const batch = db.batch();
      snapshot.forEach(doc => {
        const userRef = usersRef.doc(doc.id);
        batch.update(userRef, { status: 'pending_approval' }); // 상태를 'pending_approval'로 변경
        console.log(`[checkTrialBetaExpiration] User ${doc.id} (email: ${doc.data().email}) status updated to 'pending_approval'.`);
      });

      await batch.commit();
      console.log(`[checkTrialBetaExpiration] Successfully updated ${snapshot.size} users.`);
      return null;
    } catch (error) {
      console.error('[checkTrialBetaExpiration] Error checking trial beta expiration:', error);
      return null;
    }
  });