export default function Header({ dateStr }) {
  return (
    <div className="header">
      <h1 className="header-title">🍱 화요일 도시락</h1>
      <div className="header-date">{dateStr}</div>
      <div className="deadline-box">⏰ 마감: 오늘 오후 5시</div>
    </div>
  );
}
