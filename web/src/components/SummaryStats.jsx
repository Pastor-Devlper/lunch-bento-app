export default function SummaryStats({ attendingCount, absentCount, pendingCount, onTabChange }) {
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
        className="stat-card stat-absent"
        onClick={() => onTabChange('absent')}
      >
        <div className="stat-number">{absentCount}</div>
        <div className="stat-label">미참석</div>
      </button>
      <button
        type="button"
        className="stat-card stat-pending"
        onClick={() => onTabChange('pending')}
      >
        <div className="stat-number">{pendingCount}</div>
        <div className="stat-label">미응답</div>
      </button>
    </div>
  );
}
