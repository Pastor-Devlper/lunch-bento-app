import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import SummaryStats from './components/SummaryStats.jsx';
import StatusGrid from './components/StatusGrid.jsx';
import MyStatus from './components/MyStatus.jsx';
import Settings from './components/Settings.jsx';
import Footer from './components/Footer.jsx';
import NamePicker from './components/NamePicker.jsx';
import { fetchPeople, fetchDepartments, addPerson, deletePerson, fetchDay, putDay, fetchSettings, putSettings } from './api.js';
import { todayISO, formatKoreanDate, formatTime } from './dateUtils.js';

const IDENTITY_KEY = 'lunchbento.personId';
const POLL_MS = 10000;

export default function App() {
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [personId, setPersonId] = useState(() => {
    const stored = localStorage.getItem(IDENTITY_KEY);
    return stored ? Number(stored) : null;
  });
  const [day, setDay] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pickerError, setPickerError] = useState('');
  const [loading, setLoading] = useState(true);

  const date = todayISO();

  useEffect(() => {
    fetchPeople().then(setPeople).catch(() => setPickerError('명단을 불러오지 못했어요. 새로고침해주세요.'));
    fetchDepartments().then(setDepartments).catch(() => {});
  }, []);

  const refreshDay = useCallback(() => {
    return fetchDay(date).then((rows) => {
      setDay(rows);
      setLastUpdated(formatTime(new Date()));
    });
  }, [date]);

  useEffect(() => {
    if (personId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([refreshDay(), fetchSettings(personId).then((s) => setReminderEnabled(s.reminderEnabled))])
      .finally(() => setLoading(false));

    const interval = setInterval(refreshDay, POLL_MS);
    return () => clearInterval(interval);
  }, [personId, refreshDay]);

  function handleSelectPerson(id) {
    localStorage.setItem(IDENTITY_KEY, String(id));
    setPersonId(id);
    setPickerError('');
  }

  function handleAddPerson(name, department) {
    return addPerson({ name, department }).then((person) => {
      setPeople((prev) => [...prev, person]);
      handleSelectPerson(person.id);
      return person;
    });
  }

  function handleSwitchUser() {
    localStorage.removeItem(IDENTITY_KEY);
    setPersonId(null);
    setDay([]);
  }

  const me = day.find((p) => p.personId === personId);
  const myAttending = me?.attending ?? null;
  const myMeal = me?.meal ?? null;

  function handleSetAttending(attending) {
    const meal = attending ? (myMeal || '먹음') : null;
    setDay((prev) => prev.map((p) => (p.personId === personId ? { ...p, attending, meal } : p)));
    putDay(personId, { date, attending, meal })
      .then(() => refreshDay())
      .catch(() => refreshDay());
  }

  function handleSetMeal(meal) {
    setDay((prev) => prev.map((p) => (p.personId === personId ? { ...p, meal } : p)));
    putDay(personId, { date, attending: true, meal })
      .then(() => refreshDay())
      .catch(() => refreshDay());
  }

  function handleToggleReminder() {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    putSettings(personId, { reminderEnabled: next }).catch(() => setReminderEnabled(!next));
  }

  function handleDeleteUser() {
    deletePerson(personId)
      .then(() => {
        setPeople((prev) => prev.filter((p) => p.id !== personId));
        handleSwitchUser();
      })
      .catch(() => alert('삭제하지 못했어요'));
  }

  if (personId == null) {
    return (
      <div className="app-container">
        <NamePicker
          people={people}
          departments={departments}
          onSelect={handleSelectPerson}
          onAdd={handleAddPerson}
          error={pickerError}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="header">
          <h1 className="header-title">🍱 화요일 도시락</h1>
        </div>
      </div>
    );
  }

  const attendingPeople = day.filter((p) => p.attending === true);
  const absentPeople = day.filter((p) => p.attending === false);
  const pendingPeople = day.filter((p) => p.attending === null);
  const eatingCount = attendingPeople.filter((p) => p.meal === '먹음').length;

  return (
    <div className="app-container">
      <Header dateStr={formatKoreanDate()} myName={me?.name} onSwitchUser={handleSwitchUser} />

      <SummaryStats
        attendingCount={attendingPeople.length}
        absentCount={absentPeople.length}
        pendingCount={pendingPeople.length}
        eatingCount={eatingCount}
      />

      <StatusGrid
        attendingPeople={attendingPeople}
        absentPeople={absentPeople}
        pendingPeople={pendingPeople}
        myPersonId={personId}
      />

      <MyStatus
        myAttending={myAttending}
        myMeal={myMeal}
        onSetAttending={handleSetAttending}
        onSetMeal={handleSetMeal}
      />

      <Settings reminderEnabled={reminderEnabled} onToggle={handleToggleReminder} onDelete={handleDeleteUser} />

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
