#!/usr/bin/env python3
"""
1,737개 전수 볼링공 팩트 DB 한글 음차 표기 및 별칭(Alias) 일괄 변환 및 ProDrill DB 이관기
"""

import json
import os
import re

SRC_PATH = '/Users/sysmedic/.gemini/antigravity-ide/brain/9d312135-cd75-4cbf-a35e-f4f0801031e5/scratch/bowwwl_all_1737_fact_balls.json'
DEST_PATH = '/Users/sysmedic/Documents/GitHub/ProDrill/public/data/bowling_balls.json'

# 브랜드 및 주요 단어 한글 음차 표기 매핑 사전
WORD_TRANSLATIONS = {
    # 브랜드
    "storm": "스톰",
    "roto grip": "로토그립",
    "rotogrip": "로토그립",
    "900 global": "900글로벌",
    "brunswick": "브런스윅",
    "hammer": "햄머",
    "motiv": "모티브",
    "swag": "스웨그",
    "lord field": "로드필드",
    "lordfield": "로드필드",
    "columbia 300": "콜롬비아 300",
    "ebonite": "에보나이트",
    "track": "트랙",
    "radical": "라디컬",
    "dv8": "디브이에이트",
    "pyramid": "피라미드",
    
    # 대표 공 키워드 및 타입
    "buzzer beater": "버저 비터",
    "buzzerbeater": "버저비터",
    "iron diamond": "아이언 다이아몬드",
    "craze": "크레이즈",
    "judge": "저지",
    "legend": "레전드",
    "phaze": "페이즈",
    "hy-road": "하이로드",
    "hyroad": "하이로드",
    "black widow": "블랙 위도우",
    "attention": "어텐션",
    "venom": "베놈",
    "physix": "피직스",
    "iq tour": "아이큐 투어",
    "code black": "코드 블랙",
    "dark code": "다크 코드",
    "pitch black": "피치 블랙",
    "super phase": "슈퍼 페이즈",
    "optimum cell": "옵티멈 셀",
    "gem": "잼",
    "magic gem": "매직 잼",
    "exotic gem": "이그조틱 잼",
    "subzero": "서브제로",
    "solaris": "솔라리스",
    "primal": "프라이멀",
    "jackal": "자칼",
    "raptor": "랩터",
    "fatal venom": "페이탈 베놈",
    "sky venom": "스카이 베놈",
    "evoke": "이보크",
    "black widow 2.0": "블랙 위도우 2.0",
    "pure physical": "퓨어 피지컬",
    "infinite physix": "인피니트 피직스",
    "absolute": "앱솔루트",
    "virtual gravity": "버추얼 그래비티",
    "proton physix": "프로톤 피직스",
    "hy-road pearl": "하이로드 펄",
    
    # 제원 및 가공 수치 텍스트
    "solid": "솔리드",
    "pearl": "펄",
    "hybrid": "하이브리드",
    "urethane": "우레탄",
    "asymmetric": "비대칭",
    "symmetric": "대칭"
}

def translate_to_kr(en_text):
    if not en_text: return ""
    clean = en_text.lower()
    
    # 1. 완벽한 단어 문구 대체
    for en, kr in sorted(WORD_TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True):
        if en in clean:
            clean = clean.replace(en, kr)
            
    # 남아있는 영문 단어가 포함되어 있다면 각 첫글자를 대문자 정돈
    words = clean.split()
    res = []
    for w in words:
        if re.match(r'^[a-zA-Z]+$', w):
            res.append(w.capitalize())
        else:
            res.append(w)
    return " ".join(res)

def convert_all():
    if not os.path.exists(SRC_PATH):
        print(f"❌ 원본 팩트 파일이 존재하지 않습니다: {SRC_PATH}")
        return

    with open(SRC_PATH, 'r', encoding='utf-8') as f:
        raw_list = json.load(f)

    print(f"📦 원본 {len(raw_list)}개 팩트 데이터 변환 시작...")

    converted_balls = []
    for item in raw_list:
        brand_en = item.get('brand', '').strip()
        name_en = item.get('name', '').strip()
        full_name_en = item.get('fullName') or f"{brand_en} {name_en}".strip()
        
        kr_brand = translate_to_kr(brand_en)
        kr_name = translate_to_kr(name_en)
        kr_full_name = f"{kr_brand} {kr_name}".strip()

        # 별칭(Alias) 집합 구축
        alias_set = set()
        for s in [full_name_en, name_en, kr_full_name, kr_name]:
            if not s: continue
            alias_set.add(s)
            alias_set.add(s.lower())
            alias_set.add(s.replace(' ', ''))
            alias_set.add(s.lower().replace(' ', ''))
            # 띄어쓰기 기준 단어 분리
            parts = s.split()
            if len(parts) >= 1: alias_set.add(parts[0])
            if len(parts) >= 2:
                alias_set.add(" ".join(parts[:2]))
                alias_set.add("".join(parts[:2]))

        # specs_by_weight 파싱
        weight_specs = item.get('weightSpecs', {})
        specs_by_weight = {}
        target_rg = None
        target_diff = None

        # 15lb 최우선, 없으면 14lb -> 16lb 순
        for w_key in ['15lb', '14lb', '16lb', '13lb', '12lb']:
            if w_key in weight_specs:
                spec = weight_specs[w_key]
                try:
                    rg_val = float(spec.get('rg')) if spec.get('rg') else None
                    diff_val = float(spec.get('diff')) if spec.get('diff') else None
                    int_diff_val = float(spec.get('intDiff')) if spec.get('intDiff') else None

                    specs_by_weight[w_key] = {
                        "rg": rg_val,
                        "diff": diff_val,
                        "int_diff": int_diff_val
                    }

                    if target_rg is None and rg_val is not None:
                        target_rg = rg_val
                        target_diff = diff_val
                except (ValueError, TypeError):
                    pass

        cover_raw = item.get('coverstock', '')
        cover_type = "Solid" if "Solid" in cover_raw else ("Pearl" if "Pearl" in cover_raw else "Hybrid")
        core_type = "Asymmetric" if item.get('coreType') in ['비대칭', 'Asymmetric'] else "Symmetric"

        converted_item = {
            "id": item.get('id') or f"ball-{len(converted_balls)+1}",
            "series": name_en.split()[0] if name_en else "Standard",
            "version_name": kr_full_name if kr_full_name else full_name_en,
            "brand": brand_en,
            "distributor": "공식 팩트 DB (bowwwl)",
            "model_name_kr": kr_full_name,
            "model_name_en": full_name_en,
            "alias": [a for a in alias_set if a and len(a) > 0],
            "usbc_approved_date": item.get('releaseDate'),
            "coverstock": {
                "name": cover_raw if cover_raw else f"{brand_en} Cover",
                "type": cover_type,
                "factory_finish": item.get('factoryFinish', '')
            },
            "core": {
                "name": item.get('core') or f"{name_en} Core",
                "type": core_type
            },
            "specs_by_weight": specs_by_weight,
            "rg": target_rg,
            "diff": target_diff,
            "oilCondition": "Medium Oil",
            "is_oem": False,
            "missing_info_notes": "100% bowwwl.com 정밀 팩트 수수료 0원 입수 DB",
            "updated_at": "2026-08-15"
        }
        converted_balls.append(converted_item)

    # 이전 16개 삭제 후 1,737개 완전 덮어쓰기
    with open(DEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(converted_balls, f, ensure_ascii=False, indent=2)

    print(f"✨ [완료] 기존 DB 100% 교체! 총 {len(converted_balls)}개 전수 팩트 볼링공 적재 완료: {DEST_PATH}")

if __name__ == '__main__':
    convert_all()
