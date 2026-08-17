/**
 * 유저 선택 파운드(12 ~ 16lb)의 실제 제원 조회
 * DB에 명시된 해당 파운드의 실제 제원이 없으면 임의로 생성하지 않고 null을 반환합니다.
 * @param {import('../types/bowlingBall').BowlingBall} ball
 * @param {number} targetWeight - 유저 선택 파운드 (12 ~ 16)
 * @returns {import('../types/bowlingBall').CoreSpecs | null}
 */
export function getSpecsForWeight(ball, targetWeight) {
  if (!ball || !ball.specs_by_weight) {
    return null;
  }

  const weightKey = `${targetWeight}lb`;

  // DB에 해당 파운드의 실제 데이터가 직접 명시된 경우만 반환
  if (ball.specs_by_weight[weightKey]) {
    const direct = ball.specs_by_weight[weightKey];
    return {
      rg: Number(direct.rg),
      diff: Number(direct.diff),
      int_diff: Number(direct.int_diff || 0)
    };
  }

  // 15lb 기본 제원이 존재하고 15lb를 요청한 경우
  if (targetWeight === 15 && ball.specs_by_weight["15lb"]) {
    const base15 = ball.specs_by_weight["15lb"];
    return {
      rg: Number(base15.rg),
      diff: Number(base15.diff),
      int_diff: Number(base15.int_diff || 0)
    };
  }

  // 데이터가 없으면 비워둠 (null 반환)
  return null;
}
