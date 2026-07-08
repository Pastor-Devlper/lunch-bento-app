export default function SummaryStats({ attendingCount, absentCount, pendingCount, eatingCount }) {
  return (
    <div className="summary-stats">
      <div className="stat-card stat-attending">
        <div className="stat-number">{attendingCount}</div>
        <div className="stat-label">참석</div>
      </div>
      <div className="stat-card stat-absent">
        <div className="stat-number">{absentCount}</div>
        <div className="stat-label">미참석</div>
      </div>
      <div className="stat-card stat-pending">
        <div className="stat-number">{pendingCount}</div>
        <div className="stat-label">미응답</div>
      </div>
      <div className="stat-card stat-eating">
        <div className="stat-number">{eatingCount}</div>
        <div className="stat-label">식사 예정</div>
      </div>
    </div>
  );
}
