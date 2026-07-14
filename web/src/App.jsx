import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import SummaryStats from './components/SummaryStats.jsx';
import StatusGrid from './components/StatusGrid.jsx';
import MyStatus from './components/MyStatus.jsx';
import Settings from './components/Settings.jsx';
import Footer from './components/Footer.jsx';
import NamePicker from './components/NamePicker.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import EventList from './components/EventList.jsx';
import {
  fetchPeople, fetchDepartments, addPerson, deletePerson,
  fetchEvents, createEvent, deleteEvent, addMenuOption, fetchEventResponses, putEventResponse,
  fetchSettings, putSettings,
} from './api.js';
import { formatKoreanDateFromISO, formatTime } from './dateUtils.js';

const IDENTITY_KEY = 'lunchbento.personId';
const AUTH_KEY = 'authenticated';
const POLL_MS = 10000;

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [personId, setPersonId] = useState(() => {
    return localStorage.getItem(IDENTITY_KEY) || null;
  });
  const [events, setEvents] = useState([]);
  const [eventError, setEventError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [responses, setResponses] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pickerError, setPickerError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('attending');

  useEffect(() => {
    fetchPeople().then(setPeople).catch(() => setPickerError('명단을 불러오지 못했어요. 새로고침해주세요.'));
    fetchDepartments().then(setDepartments).catch(() => {});
  }, []);

  const refreshEvents = useCallback(() => {
    return fetchEvents().then(setEvents).catch(() => setEventError('이벤트 목록을 불러오지 못했어요.'));
  }, []);

  useEffect(() => {
    if (personId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([refreshEvents(), fetchSettings(personId).then((s) => setReminderEnabled(s.reminderEnabled))])
      .finally(() => setLoading(false));
  }, [personId, refreshEvents]);

  const refreshResponses = useCallback(() => {
    if (selectedEventId == null) return Promise.resolve();
    return fetchEventResponses(selectedEventId).then((rows) => {
      setResponses(rows);
      setLastUpdated(formatTime(new Date()));
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId == null) return;
    setSelectedTab('attending');
    refreshResponses();

    const interval = setInterval(() => {
      refreshResponses();
      refreshEvents();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [selectedEventId, refreshResponses, refreshEvents]);

  function handleSelectPerson(id) {
    localStorage.setItem(IDENTITY_KEY, String(id));
    setPersonId(id);
    setPickerError('');
  }

  function handleAddPerson(name, department) {
    return addPerson({ name, department }).then((person) => {
      setPeople((prev) => [...prev, person]);
      return person;
    });
  }

  function handleSwitchUser() {
    localStorage.removeItem(IDENTITY_KEY);
    setPersonId(null);
    setEvents([]);
    setSelectedEventId(null);
    setResponses([]);
  }

  function handleSelectEvent(eventId) {
    setSelectedEventId(eventId);
  }

  function handleBackToList() {
    setSelectedEventId(null);
    setResponses([]);
    refreshEvents();
  }

  function handleCreateEvent({ title, eventDate, description, multiSelect }) {
    return createEvent({ title, eventDate, description, createdBy: personId, multiSelect }).then((event) => {
      setEvents((prev) => [event, ...prev]);
      return event;
    });
  }

  function handleDeleteEvent(eventId, password) {
    deleteEvent(eventId, password)
      .then(() => {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      })
      .catch((err) => setEventError(err.message || '이벤트를 삭제하지 못했어요'));
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const me = responses.find((p) => p.personId === personId);
  const myAttending = me?.attending ?? null;
  const myNote = me?.note ?? null;
  const myOptions = me?.menuOptions ?? [];
  const menuOptions = selectedEvent?.menuOptions ?? [];

  function handleSetAttending(attending) {
    setResponses((prev) => prev.map((p) => (p.personId === personId ? { ...p, attending } : p)));
    putEventResponse(selectedEventId, personId, { attending, note: myNote, menuOptions: myOptions, meal: null })
      .then(() => refreshResponses())
      .catch(() => refreshResponses());
  }

  function handleSetNote(note) {
    setResponses((prev) => prev.map((p) => (p.personId === personId ? { ...p, note } : p)));
    putEventResponse(selectedEventId, personId, { attending: myAttending, note, menuOptions: myOptions, meal: null })
      .then(() => refreshResponses())
      .catch(() => refreshResponses());
  }

  function handleToggleOption(option) {
    const isMultiSelect = selectedEvent?.multiSelect ?? true;
    let nextOptions;
    if (isMultiSelect) {
      nextOptions = myOptions.includes(option)
        ? myOptions.filter((o) => o !== option)
        : [...myOptions, option];
    } else {
      nextOptions = myOptions.includes(option) ? [] : [option];
    }
    setResponses((prev) => prev.map((p) => (p.personId === personId ? { ...p, menuOptions: nextOptions } : p)));
    putEventResponse(selectedEventId, personId, { attending: myAttending, note: myNote, menuOptions: nextOptions, meal: null })
      .then(() => refreshResponses())
      .catch(() => refreshResponses());
  }

  function handleAddOption(option) {
    if (menuOptions.includes(option)) return;
    addMenuOption(selectedEventId, option)
      .then(({ menuOptions: updated }) => {
        setEvents((prev) => prev.map((e) => (e.id === selectedEventId ? { ...e, menuOptions: updated } : e)));
      })
      .catch(() => {});
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

  if (!authenticated) {
    return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />;
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
          <h1 className="header-title">📋 이벤트 참석 현황</h1>
        </div>
      </div>
    );
  }

  if (selectedEventId == null) {
    return (
      <div className="app-container">
        <EventList
          events={events}
          onSelect={handleSelectEvent}
          onCreate={handleCreateEvent}
          onDelete={handleDeleteEvent}
          error={eventError}
        />
      </div>
    );
  }

  const attendingPeople = responses.filter((p) => p.attending === true);
  const absentPeople = responses.filter((p) => p.attending === false);
  const pendingPeople = responses.filter((p) => p.attending === null);

  return (
    <div className="app-container">
      <Header
        eventTitle={selectedEvent?.title || '이벤트'}
        eventDateStr={formatKoreanDateFromISO(selectedEvent?.eventDate)}
        myName={me?.name}
        onSwitchUser={handleSwitchUser}
        onBackToList={handleBackToList}
      />

      <MyStatus
        myAttending={myAttending}
        myNote={myNote}
        myOptions={myOptions}
        menuEnabled={Boolean(selectedEvent?.menuEnabled)}
        menuOptions={menuOptions}
        multiSelect={selectedEvent?.multiSelect ?? true}
        onSetAttending={handleSetAttending}
        onSetNote={handleSetNote}
        onToggleOption={handleToggleOption}
        onAddOption={handleAddOption}
      />

      <SummaryStats
        attendingCount={attendingPeople.length}
        absentCount={absentPeople.length}
        pendingCount={pendingPeople.length}
        onTabChange={setSelectedTab}
      />

      <StatusGrid
        attendingPeople={attendingPeople}
        absentPeople={absentPeople}
        pendingPeople={pendingPeople}
        selectedTab={selectedTab}
        myPersonId={personId}
      />

      <Settings reminderEnabled={reminderEnabled} onToggle={handleToggleReminder} onDelete={handleDeleteUser} />

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
