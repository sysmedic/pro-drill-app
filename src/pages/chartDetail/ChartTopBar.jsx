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
    <TopBarShell fixed className="flex justify-between items-center">
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <Button icon="back" onClick={onBack} size="sm" variant="secondary">Back</Button>
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
        <Button onClick={onSave} size="md" variant="primary">Save</Button>
      </div>
    </TopBarShell>
  );
}
