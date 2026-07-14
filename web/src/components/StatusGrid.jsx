export default function StatusGrid({ attendingPeople, absentPeople, pendingPeople, selectedTab, myPersonId }) {
  const tabs = [
    { id: 'attending', icon: '✓', title: '참석', people: attendingPeople, emptyText: '아직 참석자가 없어요' },
    { id: 'absent', icon: '✗', title: '미참석', people: absentPeople, emptyText: '아직 없어요' },
    { id: 'pending', icon: '?', title: '미응답', people: pendingPeople, emptyText: '모두 응답했어요 🎉' },
  ];

  const currentTab = tabs.find((t) => t.id === selectedTab) || tabs[0];

  const menuTally = attendingPeople.reduce((acc, p) => {
    (p.menuOptions || []).forEach((option) => {
      acc[option] = (acc[option] || 0) + 1;
    });
    return acc;
  }, {});
  const menuTallyEntries = Object.entries(menuTally);

  const mealTally = attendingPeople.reduce((acc, p) => {
    if (!p.meal) return acc;
    acc[p.meal] = (acc[p.meal] || 0) + 1;
    return acc;
  }, {});
  const mealTallyEntries = Object.entries(mealTally);

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
              {person.menuOptions && person.menuOptions.length > 0 && (
                <div className="note-status">🍹 {person.menuOptions.join(', ')}</div>
              )}
              {person.meal && <div className="note-status">🍽️ {person.meal}</div>}
              {person.note && <div className="note-status">{person.note}</div>}
            </div>
          ))}
        </div>
        {selectedTab === 'attending' && menuTallyEntries.length > 0 && (
          <div className="menu-tally">
            {menuTallyEntries.map(([option, count]) => (
              <span key={option} className="menu-tally-item">🍹 {option} {count}</span>
            ))}
          </div>
        )}
        {selectedTab === 'attending' && mealTallyEntries.length > 0 && (
          <div className="menu-tally">
            {mealTallyEntries.map(([meal, count]) => (
              <span key={meal} className="menu-tally-item meal-tally-item">🍽️ {meal} {count}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
