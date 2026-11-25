import { useState } from 'react';
import { OSCILLOSCOPE_PROCEDURE_SPEC } from './oscilloscopeProcedureData.js';

export default function OscilloscopeProcedureModal({
  isOpen,
  onClose,
  onApplyToWorkbench,
}) {
  const [activeTab, setActiveTab] = useState('steps'); // 'overview' | 'steps' | 'parameters' | 'simulator'
  const spec = OSCILLOSCOPE_PROCEDURE_SPEC;

  // State cho Tab Mô phỏng (Simulator)
  const [simulatedValues, setSimulatedValues] = useState(() => {
    const init = {};
    spec.parameters.forEach((param) => {
      param.test_points.forEach((tp) => {
        init[tp.id] = tp.default_measured || '';
      });
    });
    return init;
  });

  if (!isOpen) return null;

  const handleSimValueChange = (tpId, val) => {
    setSimulatedValues((prev) => ({ ...prev, [tpId]: val }));
  };

  const handleFillSampleValues = () => {
    const filled = {};
    spec.parameters.forEach((param) => {
      param.test_points.forEach((tp) => {
        filled[tp.id] = tp.default_measured || tp.reference;
      });
    });
    setSimulatedValues(filled);
  };

  const handleClearValues = () => {
    const empty = {};
    spec.parameters.forEach((param) => {
      param.test_points.forEach((tp) => {
        empty[tp.id] = '';
      });
    });
    setSimulatedValues(empty);
  };

  const checkTestPointStatus = (tp, measuredVal) => {
    if (measuredVal === '' || measuredVal === undefined) return { label: 'Chờ nhập', tone: 'neutral' };
    const num = Number(measuredVal);
    if (Number.isNaN(num)) return { label: 'Không hợp lệ', tone: 'danger' };

    // Băng thông: Yêu cầu >= 4.24 div
    if (tp.tolerance.includes('≥')) {
      const pass = num >= tp.tolerance_num;
      return {
        pass,
        label: pass ? 'ĐẠT (Pass)' : 'KHÔNG ĐẠT (Fail)',
        tone: pass ? 'success' : 'danger',
        deviation: (num - tp.tolerance_num).toFixed(3),
      };
    }

    // Trigger: Yêu cầu <= 1.0 div
    if (tp.tolerance.includes('≤')) {
      const pass = num <= tp.tolerance_num;
      return {
        pass,
        label: pass ? 'ĐẠT (Pass)' : 'KHÔNG ĐẠT (Fail)',
        tone: pass ? 'success' : 'danger',
        deviation: (num - tp.tolerance_num).toFixed(3),
      };
    }

    // Bình thường: |num - reference| <= tolerance_num
    const refNum = Number(tp.reference);
    const deviation = num - refNum;
    const pass = Math.abs(deviation) <= tp.tolerance_num;
    return {
      pass,
      label: pass ? 'ĐẠT (Pass)' : 'KHÔNG ĐẠT (Fail)',
      tone: pass ? 'success' : 'danger',
      deviation: deviation > 0 ? `+${deviation.toFixed(4)}` : deviation.toFixed(4),
    };
  };

  return (
    <div
      aria-modal="true"
      className="modal-backdrop"
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>🔬</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#38bdf8',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {spec.code}
                </span>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Phiên bản {spec.version} · {spec.status}
                </span>
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
                {spec.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onApplyToWorkbench && (
              <button
                className="button"
                onClick={() => {
                  onApplyToWorkbench();
                  onClose();
                }}
                style={{
                  background: '#22c55e',
                  borderColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: 'none',
                }}
                type="button"
              >
                ⚡ Nạp vào Bàn làm việc KTV
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.2rem',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setActiveTab('steps')}
            style={{
              padding: '12px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'steps' ? '3px solid #1d4ed8' : '3px solid transparent',
              color: activeTab === 'steps' ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            type="button"
          >
            <span>📋</span> 6 Bước quy trình chuẩn
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'overview' ? '3px solid #1d4ed8' : '3px solid transparent',
              color: activeTab === 'overview' ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            type="button"
          >
            <span>⌂</span> Phương tiện & Môi trường
          </button>

          <button
            onClick={() => setActiveTab('parameters')}
            style={{
              padding: '12px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'parameters' ? '3px solid #1d4ed8' : '3px solid transparent',
              color: activeTab === 'parameters' ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            type="button"
          >
            <span>📊</span> Điểm đo & Dung sai ({spec.parameters.reduce((sum, p) => sum + p.test_points.length, 0)} điểm)
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            style={{
              padding: '12px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'simulator' ? '3px solid #1d4ed8' : '3px solid transparent',
              color: activeTab === 'simulator' ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            type="button"
          >
            <span>🧮</span> Mô phỏng Nhập số liệu đo
          </button>
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          {/* TAB 1: 6 BƯỚC QUY TRÌNH (STEPS) */}
          {activeTab === 'steps' && (
            <div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>💡</span>
                <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>
                  <strong>Quy trình kỹ thuật 6 bước bắt buộc:</strong> Kỹ thuật viên phải hoàn thành
                  lần lượt từng bước từ Self Calibration đến kiểm tra kênh DC, Băng thông, Tốc độ lấy mẫu, Độ nhạy và Kết thúc xuất báo cáo.
                </div>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                {spec.steps.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#1e40af',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {st.step_no}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
                          {st.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#475569',
                            }}
                          >
                            {st.phase}
                          </span>
                          {st.requires_evidence && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                              }}
                            >
                              📷 Cần ảnh minh chứng
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                        {st.instruction}
                      </p>

                      {st.evidence_hint && (
                        <div style={{ fontSize: '0.72rem', color: '#b45309', fontStyle: 'italic' }}>
                          Yêu cầu: {st.evidence_hint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PHƯƠNG TIỆN & ĐIỀU KIỆN MÔI TRƯỜNG */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '18px' }}>
              {/* Box Điều kiện môi trường & Warm-up */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🌡️</span> Điều kiện môi trường & Chuẩn bị nhiệt độ
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Nhiệt độ phòng đo</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {spec.environment_requirement.temperature_display}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>Đạt tiêu chuẩn ISO/IEC 17025</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Độ ẩm tương đối</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {spec.environment_requirement.humidity_display}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>Độ ẩm kiểm soát không đọng sương</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 600 }}>Thời gian làm nóng (Warm-up)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
                      30 Phút
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#92400e' }}>Bắt buộc trước khi hiệu chuẩn</div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠️ Hướng dẫn chuẩn bị:</strong> {spec.environment_requirement.warmup_instruction}
                </div>
              </div>

              {/* Box Phương tiện cần thiết */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧰</span> Danh mục Phương tiện & Chuẩn đối chứng cần thiết
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {spec.required_equipment.map((eq) => (
                    <div
                      key={eq.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{eq.name}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                            {eq.category}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#475569' }}>
                          {eq.specification}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#1e293b' }}>{eq.serial_number}</div>
                        <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                          {eq.calibration_status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THAM SỐ & ĐIỂM ĐO (PARAMETERS & TEST POINTS) */}
          {activeTab === 'parameters' && (
            <div style={{ display: 'grid', gap: '18px' }}>
              {spec.parameters.map((param) => (
                <div
                  key={param.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
                        {param.name}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                        {param.description} · Phương pháp: <strong>{param.calculation_method.toUpperCase()}</strong> · Số lần đo lặp: <strong>{param.repeat_count} lần</strong>
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: '#e2e8f0',
                        color: '#334155',
                      }}
                    >
                      Đơn vị: {param.unit}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>#</th>
                          <th style={{ padding: '8px 12px' }}>Mô tả điểm đo (Test Point)</th>
                          <th style={{ padding: '8px 12px' }}>Giá trị chuẩn (Nominal)</th>
                          <th style={{ padding: '8px 12px' }}>Dung sai cho phép (Tolerance)</th>
                          <th style={{ padding: '8px 12px' }}>Độ KĐBĐ max (Umax)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {param.test_points.map((tp) => (
                          <tr key={tp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 600 }}>{tp.point_no}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{tp.point}</td>
                            <td style={{ padding: '8px 12px', color: '#0f172a' }}>
                              <strong>{tp.reference}</strong> {tp.unit}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: 600 }}>
                              {tp.tolerance} {tp.tolerance.includes('div') || tp.tolerance.includes('dB') ? '' : tp.unit}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              {tp.max_uncertainty} {tp.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: MÔ PHỎNG NHẬP SỐ ĐO & TÍNH TOÁN TỰ ĐỘNG */}
          {activeTab === 'simulator' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a' }}>
                    Bàn thử nghiệm tính toán số đo (Interactive Calibration Calculator)
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    Thử nghiệm gõ số đo thực tế để hệ thống tự tính: Độ lệch = Đo − Chuẩn và đánh giá Pass/Fail tức thì
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="button button-secondary"
                    onClick={handleFillSampleValues}
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    type="button"
                  >
                    ✨ Nạp mẫu số đo Pass
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={handleClearValues}
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    type="button"
                  >
                    ✕ Xóa trắng
                  </button>
                </div>
              </div>

              {spec.parameters.map((param) => (
                <div
                  key={param.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#1e40af' }}>
                    {param.name}
                  </h4>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>Điểm đo</th>
                          <th style={{ padding: '8px 10px' }}>Chuẩn đối chứng</th>
                          <th style={{ padding: '8px 10px' }}>Số đo thực tế</th>
                          <th style={{ padding: '8px 10px' }}>Dung sai</th>
                          <th style={{ padding: '8px 10px' }}>Độ lệch (Deviation)</th>
                          <th style={{ padding: '8px 10px' }}>Kết luận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {param.test_points.map((tp) => {
                          const currentVal = simulatedValues[tp.id] ?? '';
                          const result = checkTestPointStatus(tp, currentVal);

                          return (
                            <tr key={tp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tp.point}</td>
                              <td style={{ padding: '8px 10px' }}>
                                {tp.reference} <small>{tp.unit}</small>
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    inputMode="decimal"
                                    onChange={(e) => handleSimValueChange(tp.id, e.target.value)}
                                    placeholder="0.000"
                                    style={{
                                      width: '100px',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.78rem',
                                    }}
                                    type="number"
                                    step="any"
                                    value={currentVal}
                                  />
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{tp.unit}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>
                                {tp.tolerance} {tp.tolerance.includes('div') || tp.tolerance.includes('dB') ? '' : tp.unit}
                              </td>
                              <td
                                style={{
                                  padding: '8px 10px',
                                  fontWeight: 600,
                                  color: result.tone === 'success' ? '#166534' : result.tone === 'danger' ? '#b91c1c' : '#94a3b8',
                                }}
                              >
                                {result.deviation !== undefined ? `${result.deviation} ${tp.unit}` : '—'}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background:
                                      result.tone === 'success'
                                        ? '#f0fdf4'
                                        : result.tone === 'danger'
                                        ? '#fef2f2'
                                        : '#f1f5f9',
                                    color:
                                      result.tone === 'success'
                                        ? '#166534'
                                        : result.tone === 'danger'
                                        ? '#991b1b'
                                        : '#64748b',
                                    border: `1px solid ${
                                      result.tone === 'success'
                                        ? '#bbf7d0'
                                        : result.tone === 'danger'
                                        ? '#fecaca'
                                        : '#e2e8f0'
                                    }`,
                                  }}
                                >
                                  {result.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Quy trình chuẩn hóa phòng đo ISOCAL · Áp dụng cho dòng máy Tektronix, Keysight, Rigol
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="button button-secondary"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
            {onApplyToWorkbench && (
              <button
                className="button button-primary"
                onClick={() => {
                  onApplyToWorkbench();
                  onClose();
                }}
                style={{
                  background: '#1d4ed8',
                  borderColor: '#1e40af',
                }}
                type="button"
              >
                ⚡ Áp dụng vào Task đo thực tế
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

