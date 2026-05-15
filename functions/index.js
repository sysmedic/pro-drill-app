const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 💡 관리자 권한 확인 유틸리티 함수
// 보안을 위해 함수 호출자가 진짜 관리자인지 서버 단에서 한 번 더 확인합니다.
const checkAdmin = (context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  // ADMIN_EMAILS 배열에 사장님 이메일을 반드시 입력하세요.
  const ADMIN_EMAILS = ["sysmedic@gmail.com", "사장님_이메일@gmail.com"];
  if (!ADMIN_EMAILS.includes(context.auth.token.email)) {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 없습니다.");
  }
};

// 1. 사용자 정식 승인 (trial_beta -> beta)
exports.approveUser = functions.https.onCall(async (data, context) => {
  checkAdmin(context); // 권한 체크
  
  const { userId } = data;
  if (!userId) throw new functions.https.HttpsError("invalid-argument", "userId가 필요합니다.");

  try {
    await db.collection("users").doc(userId).update({
      tier: "beta",
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, message: "사용자 승인 완료" };
  } catch (error) {
    console.error("approveUser error:", error);
    throw new functions.https.HttpsError("internal", "승인 처리 중 오류 발생");
  }
});

// 2. 사용자 차단/활성화
exports.blockUser = functions.https.onCall(async (data, context) => {
  checkAdmin(context);
  
  const { userId, block } = data;
  if (!userId) throw new functions.https.HttpsError("invalid-argument", "userId가 필요합니다.");

  const newStatus = block ? "blocked" : "active";

  try {
    await db.collection("users").doc(userId).update({
      status: newStatus
    });
    return { success: true, message: `사용자 상태가 ${newStatus}로 변경됨` };
  } catch (error) {
    console.error("blockUser error:", error);
    throw new functions.https.HttpsError("internal", "상태 변경 중 오류 발생");
  }
});

// 3. 사용자 등급(Tier) 변경
exports.updateUserTier = functions.https.onCall(async (data, context) => {
  checkAdmin(context);
  
  const { userId, newTier } = data;
  if (!userId || !newTier) throw new functions.https.HttpsError("invalid-argument", "파라미터가 부족합니다.");

  // 등급별 기기 수 정책 서버 단에서도 정의 (클라이언트와 동일하게)
  let maxDevices = 1;
  if (newTier === "pro") maxDevices = 2;
  if (newTier === "expert") maxDevices = 3;

  try {
    await db.collection("users").doc(userId).update({
      tier: newTier,
      maxDevices: maxDevices
    });
    return { success: true, message: "등급 변경 완료" };
  } catch (error) {
    console.error("updateUserTier error:", error);
    throw new functions.https.HttpsError("internal", "등급 변경 중 오류 발생");
  }
});

// 4. 특정 기기 접속 해제
exports.removeDevice = functions.https.onCall(async (data, context) => {
  checkAdmin(context);
  
  const { userId, deviceId } = data;
  if (!userId || !deviceId) throw new functions.https.HttpsError("invalid-argument", "파라미터가 부족합니다.");

  try {
    // Firestore의 배열에서 특정 항목(deviceId)만 안전하게 제거하는 방법
    await db.collection("users").doc(userId).update({
      activeDevices: admin.firestore.FieldValue.arrayRemove(deviceId)
    });
    return { success: true, message: "기기 제거 완료" };
  } catch (error) {
    console.error("removeDevice error:", error);
    throw new functions.https.HttpsError("internal", "기기 제거 중 오류 발생");
  }
});