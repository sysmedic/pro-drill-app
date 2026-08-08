import ModalShell from '../../components/ui/ModalShell.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function UserManualModal({ onClose }) {
  return (
    <ModalShell onClose={onClose} size="md" title={"📖 ProDrill 사용 설명서"}>
      <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto text-slate-700 text-xs leading-relaxed select-text">
        
        {/* 안내 개요 카드 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl space-y-1">
          <div className="font-black text-indigo-900 text-sm flex items-center gap-1.5">
            <Icon name="ball" size={16} className="text-indigo-600 shrink-0" />
            <span>ProDrill 지공사 공식 안내서</span>
          </div>
          <p className="text-[11px] text-indigo-800 font-medium">
            볼링 지공 현장에서 차트 작성, 키패드 입력, 사생활 보호 및 백업 기능을 손쉽게 활용하실 수 있는 안내서입니다.
          </p>
        </div>

        {/* 제1장 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="tools" size={14} className="text-indigo-600 shrink-0" />
            <span>[제1장] 시작하기 & 로그인</span>
          </h3>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium text-slate-600">
            <li><strong className="text-slate-800">구글 계정 연동:</strong> 최초 실행 시 <span className="text-indigo-600 font-bold">[구글 계정 연결하기]</span>를 누르고 이메일을 선택하면 로그인과 백업이 즉시 가동됩니다.</li>
            <li><strong className="text-slate-800">서비스 이용 안내:</strong> 설치 즉시 차트 작성, AI 추천, 레이아웃, 드릴링 가이드 등 모든 서비스를 사용하실 수 있습니다. 접속일 기준 90일 동안 클라우드 백업을 통한 멀티 디바이스 및 다양한 백업 기능을 사용해 보실 수 있으며, 이후에도 백업 관련 서비스를 제외한 모든 서비스를 그대로 이용 가능합니다.</li>
          </ul>
        </div>

        {/* 제2장 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="chart" size={14} className="text-indigo-600 shrink-0" />
            <span>[제2장] 고객 및 지공 차트 관리</span>
          </h3>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium text-slate-600">
            <li><strong className="text-slate-800">고객 등록 및 검색:</strong> 고객 등록 후 상단 검색창(<Icon name="search" size={12} className="inline-block text-slate-700 mx-0.5" />)에서 이름이나 전화번호 뒷 4자리로 즉시 검색이 가능합니다.</li>
            <li><strong className="text-slate-800">클라우드 백업:</strong> 햄버거 메뉴 ➔ <span className="font-bold text-slate-700">☁️ 클라우드 백업</span> ➔ <span className="font-bold text-slate-700">드라이브에 백업</span>으로 구글 드라이브에 안전하게 암호화 보관할 수 있습니다.</li>
            <li><strong className="text-slate-800">멀티 디바이스:</strong> 클라우드 백업을 통해 PC, 태블릿, 모바일 등에서 동시에 차트를 관리하실 수 있습니다.</li>
            <li><strong className="text-slate-800">로컬 백업:</strong> 햄버거 메뉴 ➔ <span className="font-bold text-slate-700">🗂️ 로컬 백업</span> ➔ <span className="font-bold text-slate-700">📥 파일로 내보내기</span>로 JSON 파일 저장 및 불러오기가 가능합니다.</li>
          </ul>
        </div>

        {/* 제3장 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="memo" size={14} className="text-indigo-600 shrink-0" />
            <span>[제3장] 지공 수치 입력 및 레이아웃</span>
          </h3>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium text-slate-600">
            <li><strong className="text-slate-800">전용 키패드:</strong> 수치 터치 시 분수 입력 키패드가 열리며, <span className="font-bold text-indigo-600">PAP (Up/Down)</span> 터치 시 <span className="font-bold text-slate-800">Up (↑)</span> / <span className="font-bold text-slate-800">Down (↓)</span> 버튼이 지원됩니다.</li>
            <li><strong className="text-slate-800">지공 프로필:</strong> 왼손/오른손 시점 자동 반전 및 덤리스(투핸드) 선택 시 엄지 항목 자동 정돈 기능이 기본 제공됩니다.</li>
            <li><strong className="text-slate-800">AI 추천 레이아웃:</strong> 차트에 정리된 볼러 스펙과 볼링공 제원을 토대로 4가지 레이아웃을 제안합니다.</li>
            <li><strong className="text-slate-800">레이아웃 자동 변환:</strong> <span className="font-bold text-indigo-600">Dual Angle ↔️ Storm 2LS</span> 버튼으로 PAP/틸트를 계산해 즉시 호환 수치를 산출합니다.</li>
            <li><strong className="text-slate-800">드릴링 가이드:</strong> 드릴링 시 필요한 수치 정보를 한눈에 보실 수 있습니다.</li>
            <li><strong className="text-slate-800">오발 계산기:</strong> 엄지의 피치 정보 및 각도를 계산하여 정확한 오발 컷을 산출합니다. 드릴 비트 마모도를 고려한 보정 기능으로 각 지공기에 최적화하실 수 있습니다.</li>
          </ul>
        </div>

        {/* 제4장 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
          <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Icon name="warning" size={14} className="text-indigo-600 shrink-0" />
            <span>[제4장] 사생활 보호 & 화면 잠금</span>
          </h3>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium text-slate-600">
            <li><strong className="text-slate-800">차트 보호 (3회 연속 터치):</strong>
              <div className="pl-2 pt-1 space-y-0.5 text-[10.5px]">
                <div>• <span className="font-bold text-emerald-700">[ON]</span>: 앱 내 모든 빈 공간 3회 연속 터치 시 즉시 차트 가림 화면 전환</div>
                <div>• <span className="font-bold text-slate-500">[OFF]</span>: 오직 도면 영역 3회 연속 터치 시에만 차트 가림 화면 전환</div>
              </div>
            </li>
            <li><strong className="text-slate-800">비밀번호 잠금:</strong> 환경 설정 ➔ 앱 비밀번호 4자리를 지정해 보안을 강화할 수 있습니다.</li>
          </ul>
        </div>

        {/* 닫기 액션 */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-28 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
          >
            닫기
          </button>
        </div>

      </div>
    </ModalShell>
  );
}
