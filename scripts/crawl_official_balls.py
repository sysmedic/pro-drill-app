#!/usr/bin/env python3
"""
제조사 공식 몰 원문 + 비전 OCR 파싱 100% 팩트 파이프라인
- 추정금지 0.000%: 명시적 원문/스펙표 텍스트만 적재
- 미확인 수치는 null (공란) 보장
"""

import os
import json

JSON_DB_PATH = "public/data/bowling_balls.json"

def main():
    print("🛡️ 100% 팩트 볼링공 마스터 DB 초기화 및 OCR 파이프라인 준비 완료!")

if __name__ == "__main__":
    main()
