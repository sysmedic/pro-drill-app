import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import { IconButton } from '../../components/ui/Button.jsx';

export default function CustomerList({ customers, onDelete, onEdit, onSelect }) {
  return (
    <div className="space-y-3 pb-20">
      {customers.length === 0 ? (
        <Card className="border-dashed bg-white/50 py-10 text-center font-bold text-slate-400">
          검색 결과가 없거나 등록된 고객이 없습니다.
        </Card>
      ) : (
        customers.map(customer => (
          <Card
            key={customer.id}
            className="flex items-stretch justify-between overflow-hidden transition-all hover:border-indigo-400 hover:shadow-md"
          >
            <button
              type="button"
              className="flex-1 min-w-0 p-4 sm:p-5 text-left active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
              onClick={() => onSelect && onSelect(customer)}
            >
              <span className="block font-black text-lg sm:text-xl text-slate-800 truncate">{customer.name}</span>
              <span className="block text-xs sm:text-sm font-bold text-slate-500 mt-0.5 truncate">{customer.phone || '연락처 없음'}</span>
              <span className="flex flex-wrap gap-1.5 text-[10px] sm:text-xs font-bold mt-2.5">
                {customer.gender && <Badge>{customer.gender}</Badge>}
                {customer.hand && <Badge>{customer.hand}</Badge>}
                {customer.style && <Badge variant="accent">{customer.style}</Badge>}
              </span>
            </button>

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
