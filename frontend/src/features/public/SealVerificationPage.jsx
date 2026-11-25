import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { verifySealApi } from '../../services/verification-service.js';
import isocalLogo from '../../assets/isocal_logo.png';
import './seal-verification.css';

const CURRENT_YEAR = new Date().getFullYear();

const RESULT_META = {
  Valid: { label: 'HỢP LỆ', tone: 'valid', icon: '✓' },
  Invalid: { label: 'KHÔNG HỢP LỆ', tone: 'invalid', icon: '!' },
  Expired: { label: 'HẾT HẠN', tone: 'expired', icon: '⌛' },
  Revoked: { label: 'ĐÃ THU HỒI', tone: 'revoked', icon: '✕' },
};

const SEAL_STATUS_LABELS = {
  Active: 'Đang hiệu lực',
  PendingPayment: 'Chờ thanh toán',
  Expired: 'Hết hạn',
  Revoked: 'Đã thu hồi',
};

const formatDate = (value) => {
  if (!value || typeof value !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

function SealVerificationPage() {
  const { sealCode } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(sealCode ?? '');
  const [loading, setLoading] = useState(Boolean(sealCode));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // Tăng giá trị để bấm lại cùng 1 mã vẫn gọi lại API (retry sau lỗi mạng).
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Đổi mã (Back/Forward) hoặc retry thì xóa kết quả/lỗi cũ trước khi fetch.
    setData(null);
    setError('');
    setInput(sealCode ?? '');
    if (!sealCode) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);
    verifySealApi(sealCode)
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err?.response?.data?.error?.message ||
            'Không thể tra cứu tem lúc này. Vui lòng thử lại sau.',
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sealCode, retryKey]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const code = input.trim();
    if (!code) {
      setError('Vui lòng nhập mã tem trước khi kiểm tra.');
      return;
    }
    setInput(code);
    setError('');
    if (code === sealCode) {
      // Cùng mã → chỉ tăng retryKey để effect fetch lại.
      setRetryKey((value) => value + 1);
      return;
    }
    setRetryKey(0);
    setLoading(true);
    setData(null);
    navigate(`/verify/${encodeURIComponent(code)}`);
  };

  const meta = data ? RESULT_META[data.result] ?? RESULT_META.Invalid : null;

  return (
    <div className="verify-shell">
      <header className="verify-header">
        <Link to="/" className="verify-brand">
          <img src={isocalLogo} alt="ISOCAL" />
          <span>ISOCAL</span>
        </Link>
        <Link to="/" className="verify-home-link">
          ← Trang chủ
        </Link>
      </header>

      <main className="verify-main">
        <div className="verify-intro">
          <span className="verify-eyebrow">XÁC THỰC TEM ĐIỆN TỬ</span>
          <h1>Kiểm tra tính hợp lệ của tem</h1>
          <p>
            Nhập mã tem in trên tem hiệu chuẩn/kiểm định hoặc quét mã QR để đối chiếu
            trực tiếp với cơ sở dữ liệu ISOCAL. Tra cứu công khai, không cần đăng nhập.
          </p>
        </div>

        <form className="verify-search" onSubmit={handleSubmit}>
          <label htmlFor="seal-code">Mã tem (seal code)</label>
          <div className="verify-search__row">
            <input
              id="seal-code"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ví dụ: ISO-26-A7B302"
              autoComplete="off"
              maxLength={50}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Đang kiểm tra…' : 'Kiểm tra'}
            </button>
          </div>
        </form>

        {error && <div className="verify-error">{error}</div>}

        {loading && (
          <div className="verify-loading">
            <span className="verify-spinner" />
            <p>Đang đối chiếu mã tem với cơ sở dữ liệu ISOCAL…</p>
          </div>
        )}

        {!loading && !sealCode && !error && (
          <div className="verify-hint">
            <span className="verify-hint__icon">⌁</span>
            <div>
              <strong>Bạn có tem hiệu chuẩn ISOCAL?</strong>
              <p>
                Mã tem nằm trên nhãn dán thiết bị hoặc trong file PDF tem được gửi kèm
                chứng nhận. Nhập mã vào ô trên để xem kết quả.
              </p>
            </div>
          </div>
        )}

        {!loading && data && meta && (
          <section className={`verify-result verify-result--${meta.tone}`}>
            <div className="verify-result__head">
              <span className="verify-result__icon">{meta.icon}</span>
              <div>
                <span className="verify-result__label">{meta.label}</span>
                <h2>{meta.label}</h2>
              </div>
              <span className="verify-result__time">
                Tra cứu lúc {formatDateTime(data.verified_at)}
              </span>
            </div>

            <p className="verify-result__message">{data.message}</p>

            {data.seal && (
              <div className="verify-result__details">
                <div>
                  <span>Mã tem</span>
                  <strong>{data.seal.seal_code}</strong>
                </div>
                <div>
                  <span>Số chứng nhận</span>
                  <strong>{data.seal.certificate_no}</strong>
                </div>
                <div>
                  <span>Thiết bị</span>
                  <strong>{data.seal.device?.name || '—'}</strong>
                </div>
                <div>
                  <span>Model / Serial</span>
                  <strong>
                    {[data.seal.device?.model, data.seal.device?.serial_number]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </strong>
                </div>
                <div>
                  <span>Ngày hiệu chuẩn</span>
                  <strong>{formatDate(data.seal.cal_date)}</strong>
                </div>
                <div>
                  <span>Hạn hiệu lực</span>
                  <strong>{formatDate(data.seal.due_date)}</strong>
                </div>
                <div>
                  <span>Trạng thái tem</span>
                  <strong>
                    {SEAL_STATUS_LABELS[data.seal.status] || data.seal.status}
                  </strong>
                </div>
              </div>
            )}

            <p className="verify-result__note">
              Mỗi lượt tra cứu được ghi nhận để phục vụ truy vết theo yêu cầu ISO/IEC 17025.
              Nếu có nghi vấn, vui lòng liên hệ ISOCAL để đối chiếu thêm.
            </p>
          </section>
        )}
      </main>

      <footer className="verify-footer">
        © {CURRENT_YEAR} ISOCAL · Hiệu chuẩn &amp; Kiểm định thiết bị đo
      </footer>
    </div>
  );
}

export default SealVerificationPage;
