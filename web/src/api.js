const BASE = import.meta.env.VITE_API_BASE || '/api';

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

export function fetchDay(date) {
  return request(`/day?${new URLSearchParams({ date })}`);
}

export function putDay(personId, { date, attending, meal }) {
  return request(`/day/${personId}`, {
    method: 'PUT',
    body: JSON.stringify({ date, attending, meal }),
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
