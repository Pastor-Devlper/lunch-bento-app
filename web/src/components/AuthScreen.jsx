import { useState } from 'react';
import { verifyPassword } from '../api.js';

export default function AuthScreen({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await verifyPassword(password);

      if (res.ok) {
        localStorage.setItem('authenticated', 'true');
        onAuthenticated();
      } else {
        const body = await res.json();
        setError(body.error || '인증 실패');
        setPassword('');
      }
    } catch (err) {
      setError('서버와 연결할 수 없습니다');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">📋 이벤트 참석 현황</h1>
        <p className="auth-subtitle">비밀번호를 입력하세요</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="auth-input"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="auth-button"
            disabled={loading || !password}
          >
            {loading ? '확인 중...' : '진입'}
          </button>
        </form>

        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  );
}
