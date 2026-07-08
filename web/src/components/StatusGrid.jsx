function StatusColumn({ variant, icon, title, people, myPersonId, showMeal, emptyText }) {
  return (
    <div className={`status-column status-${variant}`}>
      <div className="status-header">
        <span>{icon} {title}</span>
        <span className="status-count">{people.length}</span>
      </div>
      <div className="status-list">
        {people.length === 0 && <div className="empty-hint">{emptyText}</div>}
        {people.map((person) => (
          <div
            key={person.personId}
            className={`person-item${person.personId === myPersonId ? ' is-me' : ''}`}
          >
            {person.name}
            {showMeal && person.meal && (
              <div className="meal-status">🍽️ {person.meal}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatusGrid({ attendingPeople, absentPeople, pendingPeople, myPersonId }) {
  return (
    <div className="status-grid">
      <StatusColumn
        variant="attending"
        icon="✓"
        title="참석"
        people={attendingPeople}
        myPersonId={myPersonId}
        showMeal
        emptyText="아직 참석자가 없어요"
      />
      <StatusColumn
        variant="absent"
        icon="✗"
        title="미참석"
        people={absentPeople}
        myPersonId={myPersonId}
        emptyText="아직 없어요"
      />
      <StatusColumn
        variant="pending"
        icon="?"
        title="미응답"
        people={pendingPeople}
        myPersonId={myPersonId}
        emptyText="모두 응답했어요 🎉"
      />
    </div>
  );
}
