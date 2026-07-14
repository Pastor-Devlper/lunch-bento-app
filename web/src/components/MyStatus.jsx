import { useEffect, useState } from 'react';

function MenuPicker({ menuOptions, myOptions, onToggleOption, onAddOption }) {
  const [newOption, setNewOption] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed) return;
    onAddOption(trimmed);
    setNewOption('');
  }

  return (
    <div>
      <div className="my-status-title my-status-subtitle">메뉴 선택 (복수 선택 가능)</div>
      {menuOptions.length > 0 && (
        <div className="menu-options">
          {menuOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`menu-option-btn${myOptions.includes(option) ? ' selected' : ''}`}
              onClick={() => onToggleOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <form className="menu-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="menu-add-input"
          placeholder="새 메뉴 추가"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
        />
        <button type="submit" className="menu-add-btn">추가</button>
      </form>
    </div>
  );
}

export default function MyStatus({
  myAttending, myNote, myOptions, myMeal, menuEnabled, menuOptions, mealEnabled,
  onSetAttending, onSetNote, onToggleOption, onAddOption, onSetMeal,
}) {
  const [note, setNote] = useState(myNote || '');

  useEffect(() => {
    setNote(myNote || '');
  }, [myNote]);

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

      {mealEnabled && myAttending === true && (
        <div style={{ marginBottom: 20 }}>
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

      {menuEnabled && myAttending === true && (
        <div style={{ marginBottom: 20 }}>
          <MenuPicker
            menuOptions={menuOptions}
            myOptions={myOptions}
            onToggleOption={onToggleOption}
            onAddOption={onAddOption}
          />
        </div>
      )}

      <div>
        <div className="my-status-title my-status-subtitle">메모 (선택)</div>
        <textarea
          className="note-input"
          placeholder="예: 늦게 참석해요, 특이사항 등"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== (myNote || '')) onSetNote(note);
          }}
        />
      </div>
    </div>
  );
}
