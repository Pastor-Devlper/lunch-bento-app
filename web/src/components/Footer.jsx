export default function Footer({ lastUpdated, myName, onSwitchUser }) {
  return (
    <div className="footer">
      Last updated: {lastUpdated} | 점심 도시락 관리 시스템
      {myName && (
        <>
          {' '}| {myName}님으로 접속 중 ·{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchUser(); }} style={{ color: 'inherit' }}>
            다른 사람으로 전환
          </a>
        </>
      )}
    </div>
  );
}
