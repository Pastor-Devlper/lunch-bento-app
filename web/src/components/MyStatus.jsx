import { useEffect, useRef, useState } from 'react';

const LONG_PRESS_MS = 2000;

function MenuOptionPill({ option, selected, onToggle, onRemove }) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef(null);
  const longPressedRef = useRef(false);

  function startPress() {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setRevealed(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    clearTimeout(timerRef.current);
  }

  function handleClick() {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (revealed) {
      setRevealed(false);
      return;
    }
    onToggle();
  }

  function handleRemove() {
    onRemove();
    setRevealed(false);
  }

  return (
    <span className="menu-option-wrap">
      <button
        type="button"
        className={`menu-option-btn${selected ? ' selected' : ''}`}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onClick={handleClick}
      >
        {option}
      </button>
      {revealed && (
        <button
          type="button"
          className="menu-option-delete"
          onClick={handleRemove}
          aria-label={`${option} 삭제`}
        >
          ×
        </button>
      )}
    </span>
  );
}

function MenuPicker({ menuOptions, myOptions, multiSelect, onToggleOption, onAddOption, onRemoveOption }) {
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
      <div className="my-status-title my-status-subtitle">
        메뉴 선택 {multiSelect ? '(복수 선택 가능)' : '(하나만 선택)'}
      </div>
      {menuOptions.length > 0 && (
        <div className="menu-options">
          {menuOptions.map((option) => (
            <MenuOptionPill
              key={option}
              option={option}
              selected={myOptions.includes(option)}
              onToggle={() => onToggleOption(option)}
              onRemove={() => onRemoveOption(option)}
            />
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
  myAttending, myNote, myOptions, menuEnabled, menuOptions, multiSelect,
  onSetAttending, onSetNote, onToggleOption, onAddOption, onRemoveOption,
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

      {menuEnabled && myAttending === true && (
        <div style={{ marginBottom: 20 }}>
          <MenuPicker
            menuOptions={menuOptions}
            myOptions={myOptions}
            multiSelect={multiSelect}
            onToggleOption={onToggleOption}
            onAddOption={onAddOption}
            onRemoveOption={onRemoveOption}
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
