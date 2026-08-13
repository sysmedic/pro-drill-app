/**
 * @typedef {"500-Grit Sanded" | "1000-Grit Sanded" | "2000-Grit Sanded" | "3000-Grit Sanded" | "4000-Grit Sanded" | "Polished / Gloss"} SurfaceGritOption
 */

/**
 * @typedef {Object} CoreSpecs
 * @property {number} rg - Low RG (2.400 ~ 2.800)
 * @property {number} diff - High Diff (0.000 ~ 0.060)
 * @property {number} int_diff - Intermediate Diff (비대칭: 0.008~0.030, 대칭: 0.000)
 */

/**
 * @typedef {Object} SpecsByWeight
 * @property {CoreSpecs} [16lb]
 * @property {CoreSpecs} 15lb
 * @property {CoreSpecs} [14lb]
 * @property {CoreSpecs} [13lb]
 * @property {CoreSpecs} [12lb]
 */

/**
 * @typedef {Object} BowlingBall
 * @property {string} id - 고유 ID (예: "st-hyroad-pearl-asia-2024")
 * @property {string} brand - 세부 브랜드 (Storm, Swag, Lane Masters, Brunswick 등)
 * @property {string} distributor - 상위 유통사 (진승무역, MK트레이딩, 로드필드 등)
 * @property {string} model_name_kr - 한글 모델명
 * @property {string} model_name_en - 영문 모델명
 * @property {string[]} alias - 검색용 키워드 (공백 제거, 한영 명칭 포함)
 * @property {string} usbc_approved_date - USBC 승인 날짜 (YYYY-MM)
 * @property {number} release_year - 출시 연도
 * @property {Object} coverstock
 * @property {string} coverstock.name
 * @property {"Solid" | "Pearl" | "Hybrid" | "Urethane" | "Particle"} coverstock.type
 * @property {string} coverstock.factory_finish - 원본 출하 표면
 * @property {Object} core
 * @property {string} core.name
 * @property {"Symmetric" | "Asymmetric"} core.type
 * @property {SpecsByWeight} specs_by_weight
 * @property {boolean} is_oem
 * @property {string} updated_at
 */

/**
 * @typedef {BowlingBall & {
 *   locker_id: string,
 *   selected_weight: number,
 *   current_finish: SurfaceGritOption,
 *   last_resurface_date?: string
 * }} LockerBall
 */

export const SURFACE_GRIT_OPTIONS = [
  "500-Grit Sanded",
  "1000-Grit Sanded",
  "2000-Grit Sanded",
  "3000-Grit Sanded",
  "4000-Grit Sanded",
  "Polished / Gloss"
];
