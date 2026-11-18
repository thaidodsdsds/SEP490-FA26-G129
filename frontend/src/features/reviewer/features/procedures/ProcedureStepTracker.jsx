import { Link } from 'react-router-dom';

const STEPS = [
  {
    step: 1,
    title: 'Thông tin chung',
    subtitle: 'Loại DV & Điều kiện',
    getPath: (id) => (id ? `/internal/head-of-tech/procedures/${id}/edit` : '/internal/head-of-tech/procedures/new'),
  },
  {
    step: 2,
    title: 'Bước thao tác',
    subtitle: 'Trình tự & Bằng chứng',
    getPath: (id) => `/internal/head-of-tech/procedures/${id}/steps`,
  },
  {
    step: 3,
    title: 'Thông số & Điểm đo',
    subtitle: 'Dung sai & Công thức',
    getPath: (id) => `/internal/head-of-tech/procedures/${id}/parameters`,
  },
  {
    step: 4,
    title: 'Xem trước & Ban hành',
    subtitle: 'Biểu mẫu đo & Duyệt',
    getPath: (id) => `/internal/head-of-tech/procedures/${id}/preview`,
  },
];

function ProcedureStepTracker({ currentStep, procedureId }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '16px 24px',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: 20,
        gap: 8,
        overflowX: 'auto',
      }}
    >
      {STEPS.map((s, index) => {
        const isCurrent = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const isAccessible = Boolean(procedureId);

        let circleBg = '#f1f5f9';
        let circleColor = '#64748b';
        let circleBorder = '1px solid #cbd5e1';

        if (isCurrent) {
          circleBg = '#2563eb';
          circleColor = '#ffffff';
          circleBorder = '2px solid #1d4ed8';
        } else if (isCompleted) {
          circleBg = '#ecfdf5';
          circleColor = '#059669';
          circleBorder = '1px solid #a7f3d0';
        }

        return (
          <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {index > 0 && (
              <span style={{ color: '#cbd5e1', fontSize: '1.1rem', marginRight: 4, userSelect: 'none' }}>
                →
              </span>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: !isAccessible && !isCurrent ? 0.45 : 1,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: circleBg,
                  color: circleColor,
                  border: circleBorder,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {isCompleted ? '✓' : s.step}
              </span>

              <div>
                {isAccessible && !isCurrent ? (
                  <Link
                    to={s.getPath(procedureId)}
                    style={{
                      color: '#1e293b',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
                  >
                    {s.title}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: isCurrent ? '#0f172a' : '#64748b',
                      fontWeight: isCurrent ? 700 : 600,
                      display: 'block',
                    }}
                  >
                    {s.title}
                  </span>
                )}

                <small
                  style={{
                    display: 'block',
                    color: isCurrent ? '#2563eb' : isCompleted ? '#059669' : '#94a3b8',
                    fontSize: '0.76rem',
                    fontWeight: isCurrent || isCompleted ? 600 : 400,
                    marginTop: 1,
                  }}
                >
                  {isCurrent ? 'Đang thực hiện' : isCompleted ? 'Đã thiết lập' : s.subtitle}
                </small>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProcedureStepTracker;
