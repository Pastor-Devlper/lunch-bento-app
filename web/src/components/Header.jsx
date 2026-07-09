export default function Header({ dateStr, myName, onSwitchUser }) {
  return (
    <div className="header">
      <div className="header-top">
        <h1 className="header-title">🍱 화요일 도시락</h1>
      </div>
      <div className="header-info-row">
        <div className="header-date">{dateStr}</div>
        {myName && (
          <div className="header-user-badge">
            {myName}님
            <button type="button" className="switch-user-btn" onClick={onSwitchUser}>
              다른 사람으로 전환
            </button>
          </div>
        )}
      </div>
      <div className="deadline-box">⏰ 마감: 오늘 오후 5시</div>
    </div>
  );
}
