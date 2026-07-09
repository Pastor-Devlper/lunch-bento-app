export default function StatusGrid({ attendingPeople, eatingPeople, selectedTab, myPersonId }) {
  const tabs = [
    { id: 'attending', icon: '✓', title: '참석', people: attendingPeople, emptyText: '아직 참석자가 없어요' },
    { id: 'eating', icon: '🍽️', title: '식사', people: eatingPeople, emptyText: '아직 없어요' },
  ];

  const currentTab = tabs.find((t) => t.id === selectedTab) || tabs[0];

  return (
    <div className="status-grid-container">
      <div className={`status-column status-${selectedTab}`}>
        <div className="status-header">
          <span>{currentTab.icon} {currentTab.title}</span>
          <span className="status-count">{currentTab.people.length}</span>
        </div>
        <div className="status-list status-list-3col">
          {currentTab.people.length === 0 && <div className="empty-hint">{currentTab.emptyText}</div>}
          {currentTab.people.map((person) => (
            <div
              key={person.personId}
              className={`person-item${person.personId === myPersonId ? ' is-me' : ''}`}
            >
              {person.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
