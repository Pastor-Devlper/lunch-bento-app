export default function MyStatus({ myAttending, myMeal, onSetAttending, onSetMeal }) {
  return (
    <div className="my-status-section">
      <div className="my-status-title">내 답변</div>

      <div style={{ marginBottom: 20 }}>
        <div className="my-status-title my-status-subtitle">참석 여부</div>
        <div className="status-buttons">
          <button
            type="button"
            className={`status-btn attend${myAttending === true ? ' selected' : ''}`}
            onClick={() => onSetAttending(true)}
          >
            ✓ 참석
          </button>
          <button
            type="button"
            className={`status-btn attend${myAttending === false ? ' selected' : ''}`}
            onClick={() => onSetAttending(false)}
          >
            ✗ 미참석
          </button>
        </div>
      </div>

      {myAttending && (
        <div>
          <div className="my-status-title my-status-subtitle">식사 여부</div>
          <div className="meal-options">
            <button
              type="button"
              className={`meal-btn${myMeal === '먹음' ? ' selected' : ''}`}
              onClick={() => onSetMeal('먹음')}
            >
              🍽️ 먹음
            </button>
            <button
              type="button"
              className={`meal-btn${myMeal === '안먹음' ? ' selected' : ''}`}
              onClick={() => onSetMeal('안먹음')}
            >
              × 안먹음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
