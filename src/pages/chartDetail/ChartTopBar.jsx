import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ChartTopBar({
  isEditMode,
  utilityState,
  onBack,
  onSave,
  onToggleEditMode,
  onToggleUtility,
}) {
  return (
    <TopBarShell fixed variant="toolbar" className="flex justify-between items-center gap-2">
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <Button icon="back" onClick={onBack} size="sm" variant="secondary">뒤로</Button>
        <Button
          aria-expanded={utilityState === 'expanded'}
          icon="tools"
          onClick={onToggleUtility}
          size="sm"
          variant="secondary"
        >
          유틸
        </Button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <Button
          icon={isEditMode ? 'chart' : 'edit'}
          onClick={onToggleEditMode}
          size="sm"
          variant="subtle"
        >
          {isEditMode ? '차트' : '수정'}
        </Button>
        <Button onClick={onSave} size="sm" variant="primary">저장</Button>
      </div>
    </TopBarShell>
  );
}
