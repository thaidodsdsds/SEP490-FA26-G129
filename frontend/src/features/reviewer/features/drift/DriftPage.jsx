import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';

const devices = [
  { serial: 'FL-289-10482', name: 'Đồng hồ vạn năng · Fluke 289', unit: 'V', values: [28, 35, 31, 46, 42], deviation: '+0.024 V', date: '20/10/2026' },
  { serial: 'TEK-3024-7741', name: 'Máy hiện sóng · Tektronix MDO3024', unit: 'V', values: [34, 38, 43, 39, 51], deviation: '+0.024 V', date: '21/10/2026' },
  { serial: 'MT-BBA-88201', name: 'Cân bàn điện tử · Mettler Toledo', unit: 'kg', values: [21, 27, 23, 32, 30], deviation: '+0.031 kg', date: '20/10/2026' },
];

function DriftPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const visible = devices.filter((item) => matches(`${item.name} ${item.serial}`));
  return (
    <ReviewerPageShell title="Lịch sử đo & độ trôi" description="Theo dõi xu hướng sai lệch theo thiết bị và các kỳ hiệu chuẩn." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Xu hướng MeasurementDetail.deviation</h2><p>So sánh độ lệch qua các kỳ theo dõi thiết bị.</p></div></div>
        <div className="drift-list">
          {visible.map((device) => (
            <article className="drift-device" key={device.serial}>
              <div className="drift-device-heading"><div><strong>{device.name}</strong><small>{device.serial} · Độ lệch gần nhất {device.deviation} · {device.date}</small></div></div>
              <div className="drift-chart" aria-label={`Lịch sử độ trôi ${device.name}`}>
                {device.values.map((value, index) => <div className="drift-point" key={`${device.serial}-${index}`}><span style={{ height: `${value * 2}px` }} /><small>{['2024', '2025', 'T1/26', 'T6/26', 'T10/26'][index]}</small></div>)}
              </div>
            </article>
          ))}
          {!visible.length && <div className="reviewer-empty">Không có thiết bị phù hợp.</div>}
        </div>
        <p className="mock-note">Biểu đồ minh họa theo dữ liệu mẫu; giá trị sản xuất phải lấy từ MeasurementDetail theo Device.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default DriftPage;
