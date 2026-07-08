export default function NamePicker({ people, onSelect, error }) {
  return (
    <div className="picker-container">
      <div className="picker-title">🍱 화요일 도시락</div>
      <div className="picker-subtitle">본인 이름을 선택해주세요</div>
      <div className="picker-list">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            className="picker-btn"
            onClick={() => onSelect(person.id)}
          >
            {person.name}
          </button>
        ))}
      </div>
      {error && <div className="picker-error">{error}</div>}
    </div>
  );
}
