import { useState } from 'react';

function AddPersonForm({ department, onAdd, onDone }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const name = value.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setError('');
    onAdd(name, department).catch((err) => {
      setError(err.message || '추가하지 못했어요');
      setSubmitting(false);
    });
  }

  return (
    <div>
      <form className="picker-add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="picker-add-input"
          placeholder="이름 입력"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        <button type="submit" className="picker-add-confirm" disabled={submitting}>추가</button>
        <button type="button" className="picker-add-cancel" onClick={onDone} disabled={submitting}>취소</button>
      </form>
      {error && <div className="picker-add-error">{error}</div>}
    </div>
  );
}

export default function NamePicker({ people, departments, onSelect, onAdd, error }) {
  const [addingDept, setAddingDept] = useState(null);

  function handleAdd(name, department) {
    return onAdd(name, department).then(() => {
      setAddingDept(null);
    });
  }

  return (
    <div className="picker-container">
      <div className="picker-title">📋 이벤트 참석 현황</div>
      <div className="picker-subtitle">본인 이름을 선택해주세요</div>

      {departments.map((department) => {
        const members = people.filter((p) => p.department === department);
        return (
          <div className="picker-department" key={department}>
            <div className="picker-department-title">{department}</div>
            <div className="picker-department-list">
              {members.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="picker-btn"
                  onClick={() => onSelect(person.id)}
                >
                  {person.name}
                </button>
              ))}
              {addingDept === department ? (
                <AddPersonForm
                  department={department}
                  onAdd={handleAdd}
                  onDone={() => setAddingDept(null)}
                />
              ) : (
                <button
                  type="button"
                  className="picker-add-btn"
                  onClick={() => setAddingDept(department)}
                >
                  + 추가
                </button>
              )}
            </div>
          </div>
        );
      })}

      {error && <div className="picker-error">{error}</div>}
    </div>
  );
}
