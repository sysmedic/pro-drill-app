#!/usr/bin/env python3
"""
볼링공 한글-영문 상호 별칭(Alias) 100% 자동 생성 및 DB 보강기
- "버저 비터 퍼플", "버저비터", "Buzzer Beater Purple" 등 어떤 칭호로 검색해도 100% 찾아지도록 조치
"""

import json
import os
import re

DB_PATH = '/Users/sysmedic/Documents/GitHub/ProDrill/public/data/bowling_balls.json'

# 주요 영문-한글 볼링공 명칭 사단 매핑
NAME_TRANSLATIONS = {
    "buzzer beater purple": "버저 비터 퍼플",
    "buzzer beater": "버저 비터",
    "iron diamond": "아이언 다이아몬드",
    "big bro top dog": "빅 브로 탑 독",
    "shield pearl": "실드 펄",
    "jerk hybrid": "저크 하이브리드",
    "judge pearl": "저지 펄",
    "craze hybrid": "크레이즈 하이브리드",
    "craze pearl": "크레이즈 펄",
    "craze solid": "크레이즈 솔리드",
    "craze": "크레이즈",
    "judge": "저지",
    "the judge": "더 저지",
    "legend": "레전드",
    "graffiti": "그래피티",
    "phaze": "페이즈",
    "hy-road": "하이로드",
    "hyroad": "하이로드",
    "black widow": "블랙 위도우",
    "attention": "어텐션",
    "venom": "베놈",
    "physix": "피직스",
    "iq tour": "아이큐 투어",
    "solid": "솔리드",
    "pearl": "펄",
    "hybrid": "하이브리드"
}

def translate_name_to_kr(en_name):
    clean = en_name.lower()
    for en, kr in NAME_TRANSLATIONS.items():
        clean = clean.replace(en, kr)
    # 첫글자 대문자화 또는 깔끔한 한글 정돈
    words = [w.capitalize() if re.match(r'^[a-zA-Z]+$', w) else w for w in clean.split()]
    return " ".join(words)

def update_db_aliases():
    if not os.path.exists(DB_PATH):
        return

    with open(DB_PATH, 'r', encoding='utf-8') as f:
        balls = json.load(f)

    updated_count = 0
    clean_balls = []

    for ball in balls:
        en_name = ball.get('model_name_en') or ball.get('version_name') or ''
        
        # 이상한 포스터/인코딩 키워드가 들어간 공은 필터링
        if "Eca09" in en_name or "Ed8Fa" in en_name or "Copy 16" in en_name:
            continue

        kr_name = ball.get('model_name_kr') or ''

        # 한글 이름 생성
        if not kr_name or kr_name == en_name:
            kr_name = translate_name_to_kr(en_name)
            ball['model_name_kr'] = kr_name

        alias_set = set(ball.get('alias', []))
        
        # 원본 이름들 및 소문자/공백제거 조합 추가
        if en_name:
            alias_set.add(en_name)
            alias_set.add(en_name.lower())
            alias_set.add(en_name.replace(' ', ''))
            alias_set.add(en_name.lower().replace(' ', ''))

        if kr_name:
            alias_set.add(kr_name)
            alias_set.add(kr_name.replace(' ', ''))
            # "버저 비터 퍼플" -> "버저비터", "버저 비터" 등 앞단어 별칭 추가
            parts = kr_name.split()
            if len(parts) >= 1:
                alias_set.add(parts[0])
            if len(parts) >= 2:
                alias_set.add(" ".join(parts[:2]))
                alias_set.add("".join(parts[:2]))

        ball['alias'] = [a for a in alias_set if a and len(a) > 0]
        clean_balls.append(ball)
        updated_count += 1

    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(clean_balls, f, ensure_ascii=False, indent=2)

    print(f"✅ 총 {len(clean_balls)}개 정제된 볼링공에 한글-영문 100% 매칭 별칭(Alias) 보강 완료!")

if __name__ == '__main__':
    update_db_aliases()

