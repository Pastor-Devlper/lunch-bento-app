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

export default function NamePicker({ people, departments, onSelect, onAdd, onDelete, error }) {
  const [addingDept, setAddingDept] = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);

  function handleAdd(name, department) {
    return onAdd(name, department).then(() => {
      setAddingDept(null);
    });
  }

  function handleDeleteClick(person) {
    if (confirm(`'${person.name}'님을 명단에서 삭제할까요?`)) {
      onDelete(person.id);
    }
  }

  return (
    <div className="picker-container">
      <div className="picker-title">📋 이벤트 참석 현황</div>
      <div className="picker-subtitle">본인 이름을 선택해주세요</div>

      {departments.map((department) => {
        const members = people.filter((p) => p.department === department);
        const isDeleting = deletingDept === department;
        return (
          <div className="picker-department" key={department}>
            <div className="picker-department-title">{department}</div>
            <div className="picker-department-list">
              {members.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`picker-btn${isDeleting ? ' deleting' : ''}`}
                  onClick={() => (isDeleting ? handleDeleteClick(person) : onSelect(person.id))}
                >
                  {isDeleting && '🗑 '}{person.name}
                </button>
              ))}
              {addingDept === department ? (
                <AddPersonForm
                  department={department}
                  onAdd={handleAdd}
                  onDone={() => setAddingDept(null)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="picker-add-btn"
                    onClick={() => {
                      setAddingDept(department);
                      setDeletingDept(null);
                    }}
                    aria-label="이름 추가"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className={`picker-delete-btn${isDeleting ? ' active' : ''}`}
                    onClick={() => setDeletingDept(isDeleting ? null : department)}
                    aria-label={isDeleting ? '삭제 완료' : '이름 삭제'}
                  >
                    −
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {error && <div className="picker-error">{error}</div>}
    </div>
  );
}
