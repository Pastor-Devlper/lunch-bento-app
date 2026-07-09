export default function Header({ dateStr, myName, onSwitchUser }) {
  return (
    <div className="header">
      {myName && (
        <div className="header-user-badge">
          {myName}님
          <button type="button" className="switch-user-btn" onClick={onSwitchUser}>
            다른 사람으로 전환
          </button>
        </div>
      )}
      <h1 className="header-title">🍱 화요일 도시락</h1>
      <div className="header-date">{dateStr}</div>
      <div className="deadline-box">⏰ 마감: 오늘 오후 5시</div>
    </div>
  );
}
