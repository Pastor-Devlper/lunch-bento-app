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

export function fetchPeople() {
  return request('/people');
}

export function addPerson({ name, department }) {
  return request('/people', {
    method: 'POST',
    body: JSON.stringify({ name, department }),
  });
}

export function deletePerson(personId) {
  return request(`/people/${personId}`, {
    method: 'DELETE',
  });
}

export function fetchEvents() {
  return request('/events');
}

export function createEvent({ title, eventDate, description, createdBy, multiSelect }) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify({ title, eventDate, description, createdBy, multiSelect }),
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

export function putEventResponse(eventId, personId, { attending, note, menuOptions, meal }) {
  return request(`/events/${eventId}/responses/${personId}`, {
    method: 'PUT',
    body: JSON.stringify({ attending, note, menuOptions, meal }),
  });
}

export function fetchSettings(personId) {
  return request(`/settings/${personId}`);
}

export function putSettings(personId, { reminderEnabled }) {
  return request(`/settings/${personId}`, {
    method: 'PUT',
    body: JSON.stringify({ reminderEnabled }),
  });
}
