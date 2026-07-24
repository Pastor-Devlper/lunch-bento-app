const BASE = import.meta.env.VITE_API_BASE || 'https://lunch-bento-server.onrender.com/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function verifyPassword(password) {
  return fetch(`${BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function fetchDepartments() {
  return request('/departments');
}

// --- Base roster (admin, password-gated) ---
export function verifyRosterPassword(password) {
  return fetch(`${BASE}/roster/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function fetchPeople() {
  return request('/people');
}

export function addPerson({ name, department, password }) {
  return request('/people', {
    method: 'POST',
    body: JSON.stringify({ name, department, password }),
  });
}

export function deletePerson(personId, password) {
  return request(`/people/${personId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

// --- Per-event participants ---
export function addParticipant(eventId, { name, department }) {
  return request(`/events/${eventId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ name, department }),
  });
}

export function removeParticipant(eventId, participantId) {
  return request(`/events/${eventId}/participants/${participantId}`, {
    method: 'DELETE',
  });
}

export function fetchEvents() {
  return request('/events');
}

export function createEvent({ title, eventDate, description, multiSelect }) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify({ title, eventDate, description, multiSelect }),
  });
}

export function updateEvent(eventId, { title, eventDate, description, multiSelect }) {
  return request(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, eventDate, description, multiSelect }),
  });
}

export function deleteEvent(eventId, password) {
  return request(`/events/${eventId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export function addMenuOption(eventId, option) {
  return request(`/events/${eventId}/menu-options`, {
    method: 'POST',
    body: JSON.stringify({ option }),
  });
}

export function removeMenuOption(eventId, option) {
  return request(`/events/${eventId}/menu-options`, {
    method: 'DELETE',
    body: JSON.stringify({ option }),
  });
}

export function fetchEventResponses(eventId) {
  return request(`/events/${eventId}/responses`);
}

export function putEventResponse(eventId, personId, { attending, note, menuOptions }) {
  return request(`/events/${eventId}/responses/${personId}`, {
    method: 'PUT',
    body: JSON.stringify({ attending, note, menuOptions }),
  });
}
