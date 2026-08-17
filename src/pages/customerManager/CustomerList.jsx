import { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import { IconButton } from '../../components/ui/Button.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

// 📍 Firestore 타임스탬프 또는 ISO/일련번호 날짜 텍스트를 YYYY-MM-DD 형태로 변환하는 헬퍼 함수
const formatDate = (rawDate) => {
  if (!rawDate) return '';
  if (typeof rawDate.toDate === 'function') {
    const d = rawDate.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
    if (/^\d{8}$/.test(trimmed)) return `${trimmed.substring(0,4)}-${trimmed.substring(4,6)}-${trimmed.substring(6,8)}`;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
    return trimmed;
  }
  return String(rawDate);
};

const customerCardManualSections = [
  {
    items: [
      { title: "고객 카드 클릭", desc: "고객 카드 영역을 클릭하면 해당 고객의 지공 차트 상세 페이지로 이동합니다." },
      { title: "편집 버튼", desc: "우측 연필 아이콘을 클릭하면 고객 인적사항 및 스타일 정보를 수정할 수 있습니다." },
      { title: "휴지통 버튼", desc: "우측 휴지통 아이콘을 클릭하면 고객 데이터와 지공 이력 모두가 삭제됩니다." }
    ]
  }
];

export default function CustomerList({ customers, onDelete, onEdit, onSelect }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    const handleUpdateSetting = () => {
      setShowManualHelpSetting(localStorage.getItem('show_manual_help') !== 'false');
    };
    handleUpdateSetting();
    window.addEventListener('manual_help_setting_changed', handleUpdateSetting);
    window.addEventListener('storage', handleUpdateSetting);
    return () => {
      window.removeEventListener('manual_help_setting_changed', handleUpdateSetting);
      window.removeEventListener('storage', handleUpdateSetting);
    };
  }, []);

  return (
    <div className="space-y-3 pb-20">
      {customers.length === 0 ? (
        <Card className="border-dashed bg-white/50 py-10 text-center font-bold text-slate-400">
          검색 결과가 없거나 등록된 고객이 없습니다.
        </Card>
      ) : (
        customers.map((customer, index) => (
          <Card
            key={customer.id}
            className="flex items-stretch justify-between overflow-hidden transition-all hover:border-indigo-400 hover:shadow-md"
          >
            <div
              role="button"
              tabIndex={0}
              className="flex-1 min-w-0 p-4 sm:p-5 text-left active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 cursor-pointer"
              onClick={() => onSelect && onSelect(customer)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect && onSelect(customer);
                }
              }}
            >
              {/* 📍 이름과 상주 볼링장/클럽 및 ? 가이드 버튼 배치 */}
              <div className="flex items-center gap-2 w-full truncate">
                <span className="font-black text-lg sm:text-xl text-slate-800 shrink-0">
                  {customer.name}
                </span>
                {customer.club && (
                  <span className="font-bold text-lg sm:text-xl text-slate-400 opacity-80 truncate">
                    {customer.club}
                  </span>
                )}
                {index === 0 && showManualHelpSetting && (
                  <span 
                    className="relative inline-flex shrink-0 z-20 ml-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowHelp(prev => !prev);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none"
                      aria-label="고객 카드 가이드"
                      title="고객 카드 가이드"
                    >
                      <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                      ?
                    </button>
                    <TaskbarHelpBalloon 
                      isOpen={showHelp} 
                      onClose={() => setShowHelp(false)} 
                      title="📖 고객 카드"
                      sections={customerCardManualSections}
                    />
                  </span>
                )}
              </div>
              
              {/* 📍 전화번호 진하게 & 등록일 나란히 배치 */}
              <div className="flex items-baseline gap-2 mt-0.5 w-full truncate">
                <span className="text-xs sm:text-sm font-extrabold text-slate-600 shrink-0">
                  {customer.phone || '연락처 없음'}
                </span>
                {customer.createdAt && (
                  <span className="text-xs sm:text-sm font-bold text-slate-400 opacity-80 truncate">
                    {formatDate(customer.createdAt)}
                  </span>
                )}
              </div>
              
              <span className="flex flex-wrap gap-1.5 text-[10px] sm:text-xs font-bold mt-2.5">
                {customer.gender && <Badge>{customer.gender}</Badge>}
                {customer.hand && <Badge>{customer.hand}</Badge>}
                {customer.style && <Badge variant="accent">{customer.style}</Badge>}
                {/* 📍 style2를 styleExtra로 수정 */}
                {customer.styleExtra && <Badge variant="accent">{customer.styleExtra}</Badge>}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 px-3 sm:px-4 border-l border-slate-100">
              <IconButton
                aria-label={`${customer.name} 고객 정보 수정`}
                icon="edit"
                onClick={(e) => onEdit(e, customer)}
                size="sm"
              />
              <IconButton
                aria-label={`${customer.name} 고객 삭제`}
                icon="trash"
                onClick={(e) => onDelete(e, customer)}
                size="sm"
                variant="danger"
              />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}