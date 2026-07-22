import { useState } from 'react';
import { formatKoreanDateFromISO } from '../dateUtils.js';
import { shareEvent } from '../kakao.js';

function NewEventForm({ onCreate, onDone }) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [multiSelect, setMultiSelect] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || submitting) return;
    setSubmitting(true);
    setError('');
    onCreate({
      title: trimmedTitle,
      eventDate: eventDate || null,
      description: description.trim() || null,
      multiSelect,
    })
      .then(() => onDone())
      .catch((err) => {
        setError(err.message || '이벤트를 만들지 못했어요');
        setSubmitting(false);
      });
  }

  return (
    <form className="event-new-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="event-new-input"
        placeholder="이벤트 이름 (예: 워크숍, 송년회)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
        autoFocus
      />
      <label className="event-new-date">
        <span className="event-new-date-label">📅 날짜 (선택)</span>
        <input
          type="date"
          className="event-new-input event-new-date-input"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          disabled={submitting}
        />
      </label>
      <textarea
        className="event-new-input"
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={submitting}
      />
      <label className="event-new-checkbox">
        <input
          type="checkbox"
          checked={multiSelect}
          onChange={(e) => setMultiSelect(e.target.checked)}
          disabled={submitting}
        />
        복수 선택 (메뉴를 여러 개 고를 수 있어요)
      </label>
      <div className="event-new-actions">
        <button type="submit" className="picker-add-confirm" disabled={submitting}>만들기</button>
        <button type="button" className="picker-add-cancel" onClick={onDone} disabled={submitting}>취소</button>
      </div>
      {error && <div className="picker-add-error">{error}</div>}
    </form>
  );
}

function DeleteEventModal({ event, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    onConfirm(password).catch((err) => {
      setError(err.message || '삭제하지 못했어요');
      setSubmitting(false);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-title">이벤트 삭제</div>
        <div className="modal-text">
          '{event.title}' 이벤트를 삭제할까요?<br />응답 데이터도 함께 삭제됩니다.
        </div>
        <input
          type="password"
          className="modal-input"
          placeholder="삭제 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions">
          <button type="submit" className="modal-btn-danger" disabled={submitting}>삭제</button>
          <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={submitting}>취소</button>
        </div>
      </form>
    </div>
  );
}

export default function EventList({ events, loading, onSelect, onCreate, onDelete, onOpenRosterAdmin, error }) {
  const [creating, setCreating] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(null);

  function handleDelete(e, event) {
    e.stopPropagation();
    setDeletingEvent(event);
  }

  function handleShare(e, event) {
    e.stopPropagation();
    shareEvent(event);
  }

  return (
    <div className="picker-container event-list-container">
      <div className="picker-title">📋 이벤트 참석 현황</div>
      <div className="picker-subtitle">참석 인원을 확인할 이벤트를 선택하세요</div>

      <div className="event-list">
        {loading && events.length === 0 && (
          <div className="empty-hint loading-hint">
            <span className="loading-spinner" aria-hidden="true" />
            데이터를 불러오는 중이에요…
          </div>
        )}
        {!loading && events.length === 0 && <div className="empty-hint">아직 이벤트가 없어요</div>}
        {events.map((event) => (
          <div
            key={event.id}
            className="event-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(event.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(event.id);
              }
            }}
          >
            <div className="event-card-main">
              <div className="event-card-title">{event.menuEnabled && '🍹 '}{event.mealEnabled && '🍽️ '}{event.title}</div>
              {event.eventDate && <div className="event-card-date">{formatKoreanDateFromISO(event.eventDate)}</div>}
            </div>
            <div className="event-card-footer">
              <div className="event-card-counts">
                <span className="event-card-count event-card-count-attending">참석 {event.attendingCount}</span>
                <span className="event-card-count event-card-count-absent">미참석 {event.absentCount}</span>
                <span className="event-card-count event-card-count-pending">미응답 {event.pendingCount}</span>
              </div>
              <button
                type="button"
                className="event-card-share"
                onClick={(e) => handleShare(e, event)}
              >
                💬 카톡 공유
              </button>
            </div>
            <button
              type="button"
              className="event-card-delete"
              onClick={(e) => handleDelete(e, event)}
              aria-label="이벤트 삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {creating ? (
        <NewEventForm onCreate={onCreate} onDone={() => setCreating(false)} />
      ) : (
        <button type="button" className="event-new-btn" onClick={() => setCreating(true)}>
          + 새 이벤트 만들기
        </button>
      )}

      {onOpenRosterAdmin && !creating && (
        <button type="button" className="roster-admin-btn" onClick={onOpenRosterAdmin}>
          👥 기본 명단 관리
        </button>
      )}

      {error && <div className="picker-error">{error}</div>}

      {deletingEvent && (
        <DeleteEventModal
          event={deletingEvent}
          onConfirm={(password) =>
            onDelete(deletingEvent.id, password).then(() => setDeletingEvent(null))
          }
          onClose={() => setDeletingEvent(null)}
        />
      )}
    </div>
  );
}
