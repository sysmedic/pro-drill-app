export default function CustomerList({ customers, onDelete, onEdit, onSelect }) {
  return (
    <div className="space-y-3 pb-20">
      {customers.length === 0 ? (
        <div className="text-center py-10 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
          검색 결과가 없거나 등록된 고객이 없습니다.
        </div>
      ) : (
        customers.map(customer => (
          <div
            key={customer.id}
            onClick={() => onSelect && onSelect(customer)}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-[0.98] transition-all group relative"
          >
            <div className="flex-1">
              <h3 className="font-black text-lg sm:text-xl text-slate-800">{customer.name}</h3>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">{customer.phone || '연락처 없음'}</p>
              <div className="flex gap-1.5 text-[10px] sm:text-xs font-bold mt-2.5">
                {customer.gender && <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200 shadow-sm">{customer.gender}</span>}
                {customer.hand && <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200 shadow-sm">{customer.hand}</span>}
                {customer.style && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 shadow-sm">{customer.style}</span>}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pl-3 sm:pl-4 border-l border-slate-100 ml-2">
              <button
                type="button"
                aria-label={`${customer.name} 고객 정보 수정`}
                onClick={(e) => onEdit(e, customer)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 border border-slate-200 shadow-sm text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-all"
              >
                ✏️
              </button>
              <button
                type="button"
                aria-label={`${customer.name} 고객 삭제`}
                onClick={(e) => onDelete(e, customer)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 border border-slate-200 shadow-sm text-slate-500 font-bold hover:bg-red-50 hover:border-red-300 hover:text-red-500 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
