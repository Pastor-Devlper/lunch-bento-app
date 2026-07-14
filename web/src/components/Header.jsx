export default function Header({ eventTitle, eventDateStr, myName, onSwitchUser, onBackToList }) {
  return (
    <div className="header">
      <div className="header-top">
        <h1 className="header-title">{eventTitle}</h1>
      </div>
      <div className="header-info-row">
        <div className="header-date">{eventDateStr}</div>
        {myName && (
          <div className="header-user-badge">
            {myName}님
            <button type="button" className="switch-user-btn" onClick={onSwitchUser}>
              이름 선택
            </button>
            {onBackToList && (
              <button type="button" className="switch-user-btn" onClick={onBackToList}>
                이벤트 선택
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
