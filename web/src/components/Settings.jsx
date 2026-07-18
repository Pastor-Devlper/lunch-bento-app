export default function Settings() {
  return (
    <div className="settings-section">
      <div className="settings-title">⚙️ 설정</div>
      <div className="setting-item">
        <span className="setting-label">
          알림 받기
          <span className="setting-hint">준비중</span>
        </span>
        <button
          type="button"
          className="toggle"
          disabled
          aria-pressed={false}
          aria-label="알림 받기 (준비중)"
        >
          <div className="toggle-circle"></div>
        </button>
      </div>
    </div>
  );
}
