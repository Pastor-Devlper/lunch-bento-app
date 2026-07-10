export default function Settings({ reminderEnabled, onToggle, onDelete }) {
  function handleDelete() {
    if (confirm('정말 이 명단에서 삭제하시겠어요?')) {
      onDelete();
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-title">⚙️ 알림 설정</div>
      <div className="setting-item">
        <span className="setting-label">알림 받기</span>
        <button
          type="button"
          className={`toggle${reminderEnabled ? ' active' : ''}`}
          onClick={onToggle}
          aria-pressed={reminderEnabled}
          aria-label="알림 받기"
        >
          <div className="toggle-circle"></div>
        </button>
      </div>
      <div className="setting-item">
        <span className="setting-label">명단에서 삭제</span>
        <button
          type="button"
          className="delete-btn"
          onClick={handleDelete}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
