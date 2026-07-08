export default function Settings({ reminderEnabled, onToggle }) {
  return (
    <div className="settings-section">
      <div className="settings-title">⚙️ 알림 설정</div>
      <div className="setting-item">
        <span className="setting-label">화요일 아침 8시 리마인더</span>
        <button
          type="button"
          className={`toggle${reminderEnabled ? ' active' : ''}`}
          onClick={onToggle}
          aria-pressed={reminderEnabled}
          aria-label="화요일 아침 8시 리마인더"
        >
          <div className="toggle-circle"></div>
        </button>
      </div>
    </div>
  );
}
