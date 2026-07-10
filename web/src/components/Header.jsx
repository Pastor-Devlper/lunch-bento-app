export default function Header({ eventTitle, eventDateStr, myName, onSwitchUser, onBackToList }) {
  return (
    <div className="header">
      <div className="header-top">
        {onBackToList && (
          <button type="button" className="back-to-list-btn" onClick={onBackToList}>
            ← 목록
          </button>
        )}
        <h1 className="header-title">{eventTitle}</h1>
      </div>
      <div className="header-info-row">
        <div className="header-date">{eventDateStr}</div>
        {myName && (
          <div className="header-user-badge">
            {myName}님
            <button type="button" className="switch-user-btn" onClick={onSwitchUser}>
              다른 사람으로 전환
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
