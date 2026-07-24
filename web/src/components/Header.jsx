export default function Header({ eventTitle, eventDateStr, eventDescription, myName, onSwitchUser, onBackToList }) {
  return (
    <div className="header">
      <div className="header-top">
        <h1 className="header-title">{eventTitle}</h1>
      </div>
      {eventDescription && <div className="header-desc">{eventDescription}</div>}
      <div className="header-info-row">
        <div className="header-info-text">{eventDateStr}</div>
        {myName && <div className="header-info-text">{myName}님</div>}
        <button type="button" className="header-info-btn" onClick={onSwitchUser}>
          이름 선택
        </button>
        {onBackToList && (
          <button type="button" className="header-info-btn" onClick={onBackToList}>
            이벤트 선택
          </button>
        )}
      </div>
    </div>
  );
}
