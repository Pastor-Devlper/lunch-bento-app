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
  fetchDepartments, fetchPeople, addPerson, deletePerson, verifyRosterPassword,
  fetchEvents, createEvent, updateEvent, deleteEvent,
  addParticipant, removeParticipant,
  addMenuOption, removeMenuOption, fetchEventResponses, putEventResponse,
} from './api.js';
import { formatKoreanDateFromISO, formatTime } from './dateUtils.js';
import { initKakao } from './kakao.js';

const AUTH_KEY = 'authenticated';
const POLL_MS = 10000;

const identityKey = (eventId) => `lunchbento.person.${eventId}`;

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    if (new URLSearchParams(window.location.search).get('event')) return true;
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [departments, setDepartments] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventError, setEventError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(() =>
    new URLSearchParams(window.location.search).get('event') || null);
  const [responses, setResponses] = useState([]);
  const [eventIdentity, setEventIdentity] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [selectedTab, setSelectedTab] = useState('attending');

  // Base-roster admin
  const [rosterPasswordModal, setRosterPasswordModal] = useState(false);
  const [rosterPassword, setRosterPassword] = useState(null);
  const [rosterPeople, setRosterPeople] = useState([]);
  const [rosterError, setRosterError] = useState('');

  useEffect(() => {
    initKakao();
    fetchDepartments().then(setDepartments).catch(() => {});
    // Drop the ?event= param from the URL once we've captured it.
    const url = new URL(window.location.href);
    if (url.searchParams.has('event')) {
      url.searchParams.delete('event');
      window.history.replaceState({}, '', url);
    }
  }, []);

  const refreshEvents = useCallback(() =>
    fetchEvents()
      .then((rows) => {
        setEvents(rows);
        setEventError('');
      })
      .catch(() => setEventError('이벤트 목록을 불러오지 못했어요.'))
      .finally(() => setEventsLoaded(true)), []);

  useEffect(() => {
    if (!authenticated) return;
    refreshEvents();
  }, [authenticated, refreshEvents]);

  // Resolve identity for the selected event from storage.
  useEffect(() => {
    if (selectedEventId == null) {
      setEventIdentity(null);
      return;
    }
    setEventIdentity(localStorage.getItem(identityKey(selectedEventId)) || null);
  }, [selectedEventId]);

  const refreshResponses = useCallback(() => {
    if (selectedEventId == null) return Promise.resolve();
    return fetchEventResponses(selectedEventId).then((rows) => {
      setResponses(rows);
      setLastUpdated(formatTime(new Date()));
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId == null) return undefined;
    setSelectedTab('attending');
    setLoadingEvent(true);
    refreshResponses()
      .catch(() => {
        setEventError('이벤트를 불러오지 못했어요.');
        setSelectedEventId(null);
      })
      .finally(() => setLoadingEvent(false));

    const interval = setInterval(refreshResponses, POLL_MS);
    return () => clearInterval(interval);
  }, [selectedEventId, refreshResponses]);

  // Drop a stale identity that no longer matches the event's participants.
  useEffect(() => {
    if (selectedEventId == null || eventIdentity == null) return;
    if (responses.length > 0 && !responses.some((p) => p.personId === eventIdentity)) {
      localStorage.removeItem(identityKey(selectedEventId));
      setEventIdentity(null);
    }
  }, [responses, eventIdentity, selectedEventId]);

  function handleSelectEvent(eventId) {
    setSelectedEventId(eventId);
    setResponses([]);
  }

  function handleBackToEvents() {
    setSelectedEventId(null);
    setResponses([]);
    refreshEvents();
  }

  function handleSelectName(participantId) {
    localStorage.setItem(identityKey(selectedEventId), participantId);
    setEventIdentity(participantId);
  }

  function handleSwitchName() {
    localStorage.removeItem(identityKey(selectedEventId));
    setEventIdentity(null);
  }

  function handleAddParticipant(name, department) {
    return addParticipant(selectedEventId, { name, department }).then(() => refreshResponses());
  }

  function handleRemoveParticipant(participantId) {
    return removeParticipant(selectedEventId, participantId).then(() => {
      if (participantId === eventIdentity) handleSwitchName();
      return refreshResponses();
    });
  }

  function handleCreateEvent({ title, eventDate, description, multiSelect }) {
    return createEvent({ title, eventDate, description, multiSelect }).then((event) => {
      setEvents((prev) => [event, ...prev]);
      return event;
    });
  }

  function handleUpdateEvent(eventId, data) {
    return updateEvent(eventId, data).then((updated) => {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
      return updated;
    });
  }

  function handleDeleteEvent(eventId, password) {
    return deleteEvent(eventId, password).then(() => {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    });
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const me = responses.find((p) => p.personId === eventIdentity);
  const myAttending = me?.attending ?? null;
  const myNote = me?.note ?? null;
  const myOptions = me?.menuOptions ?? [];
  const menuOptions = selectedEvent?.menuOptions ?? [];

  function handleSetAttending(attending) {
    // Menu choices only make sense for attendees; clear them when not attending.
    const nextOptions = attending === true ? myOptions : [];
    setResponses((prev) => prev.map((p) => (
      p.personId === eventIdentity ? { ...p, attending, menuOptions: nextOptions } : p
    )));
    putEventResponse(selectedEventId, eventIdentity, { attending, note: myNote, menuOptions: nextOptions })
      .then(() => refreshResponses())
      .catch(() => refreshResponses());
  }

  function handleSetNote(note) {
    setResponses((prev) => prev.map((p) => (p.personId === eventIdentity ? { ...p, note } : p)));
    putEventResponse(selectedEventId, eventIdentity, { attending: myAttending, note, menuOptions: myOptions })
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
    setResponses((prev) => prev.map((p) => (p.personId === eventIdentity ? { ...p, menuOptions: nextOptions } : p)));
    putEventResponse(selectedEventId, eventIdentity, { attending: myAttending, note: myNote, menuOptions: nextOptions })
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

  function handleRemoveOption(option) {
    removeMenuOption(selectedEventId, option)
      .then(({ menuOptions: updated }) => {
        setEvents((prev) => prev.map((e) => (e.id === selectedEventId ? { ...e, menuOptions: updated } : e)));
        setResponses((prev) => prev.map((p) => ({
          ...p,
          menuOptions: (p.menuOptions || []).filter((o) => o !== option),
        })));
      })
      .catch(() => {});
  }

  // --- Base roster admin ---
  function openRosterAdmin() {
    setRosterError('');
    setRosterPasswordModal(true);
  }

  function unlockRosterAdmin(password) {
    return verifyRosterPassword(password).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '비밀번호가 틀렸습니다');
      }
      const people = await fetchPeople();
      setRosterPeople(people);
      setRosterPassword(password);
      setRosterPasswordModal(false);
    });
  }

  function handleAdminAdd(name, department) {
    return addPerson({ name, department, password: rosterPassword }).then((person) => {
      setRosterPeople((prev) => [...prev, person]);
    });
  }

  function handleAdminDelete(personId) {
    return deletePerson(personId, rosterPassword).then(() => {
      setRosterPeople((prev) => prev.filter((p) => p.id !== personId));
    });
  }

  // --- Render ---
  if (!authenticated) {
    return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />;
  }

  // Base roster admin screen (over the event list)
  if (rosterPassword != null) {
    return (
      <div className="app-container">
        <NamePicker
          people={rosterPeople}
          departments={departments}
          onAdd={handleAdminAdd}
          onDelete={handleAdminDelete}
          selectable={false}
          title="👥 기본 명단 관리"
          subtitle="여기서 바꾸면 앞으로 만드는 이벤트에 반영돼요"
          onClose={() => setRosterPassword(null)}
        />
      </div>
    );
  }

  if (selectedEventId == null) {
    return (
      <div className="app-container">
        <EventList
          events={events}
          loading={!eventsLoaded}
          onSelect={handleSelectEvent}
          onCreate={handleCreateEvent}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          onOpenRosterAdmin={openRosterAdmin}
          error={eventError}
        />
        {rosterPasswordModal && (
          <RosterPasswordModal
            onSubmit={unlockRosterAdmin}
            onClose={() => setRosterPasswordModal(false)}
          />
        )}
      </div>
    );
  }

  if (loadingEvent) {
    return (
      <div className="app-container">
        <div className="header">
          <h1 className="header-title">📋 이벤트 참석 현황</h1>
        </div>
      </div>
    );
  }

  // Event selected but no name chosen yet → event's own name picker
  if (eventIdentity == null) {
    const pickerPeople = responses.map((r) => ({ id: r.personId, name: r.name, department: r.department }));
    return (
      <div className="app-container">
        <NamePicker
          people={pickerPeople}
          departments={departments}
          onSelect={handleSelectName}
          onAdd={handleAddParticipant}
          onDelete={handleRemoveParticipant}
          title={selectedEvent?.title || '이벤트'}
          subtitle="본인 이름을 선택해주세요"
          onClose={handleBackToEvents}
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
        eventDescription={selectedEvent?.description}
        myName={me?.name}
        onSwitchUser={handleSwitchName}
        onBackToList={handleBackToEvents}
      />

      <MyStatus
        myAttending={myAttending}
        myNote={myNote}
        myOptions={myOptions}
        menuEnabled
        menuOptions={menuOptions}
        multiSelect={selectedEvent?.multiSelect ?? true}
        onSetAttending={handleSetAttending}
        onSetNote={handleSetNote}
        onToggleOption={handleToggleOption}
        onAddOption={handleAddOption}
        onRemoveOption={handleRemoveOption}
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
        myPersonId={eventIdentity}
        eventTitle={selectedEvent?.title}
      />

      <Settings />

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}

function RosterPasswordModal({ onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    onSubmit(password).catch((err) => {
      setError(err.message || '비밀번호가 틀렸습니다');
      setSubmitting(false);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-title">기본 명단 관리</div>
        <div className="modal-text">관리 비밀번호를 입력하세요.</div>
        <input
          type="password"
          className="modal-input"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions">
          <button type="submit" className="modal-btn-danger" disabled={submitting}>확인</button>
          <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={submitting}>취소</button>
        </div>
      </form>
    </div>
  );
}
