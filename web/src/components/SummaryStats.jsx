export default function SummaryStats({ attendingCount, eatingCount, onTabChange }) {
  return (
    <div className="summary-stats">
      <button
        type="button"
        className="stat-card stat-attending"
        onClick={() => onTabChange('attending')}
      >
        <div className="stat-number">{attendingCount}</div>
        <div className="stat-label">참석</div>
      </button>
      <button
        type="button"
        className="stat-card stat-eating"
        onClick={() => onTabChange('eating')}
      >
        <div className="stat-number">{eatingCount}</div>
        <div className="stat-label">식사</div>
      </button>
    </div>
  );
}
