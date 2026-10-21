import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  chats as initialChats,
  certificates,
  initialProcedures,
  initialReviewRecords,
  masterStandards as initialStandards,
  notifications as initialNotifications,
  seals as initialSeals,
} from './mockData.js';
import ReviewerWorkspaceContext from './ReviewerWorkspaceContext.js';
import ReviewerWorkspaceOverlays from './shared/ReviewerWorkspaceOverlays.jsx';
import './reviewer.css';

function ReviewerWorkspaceProvider() {
  const [procedures, setProcedures] = useState(initialProcedures);
  const [records, setRecords] = useState(initialReviewRecords);
  const [certificateList, setCertificateList] = useState(certificates);
  const [standards, setStandards] = useState(initialStandards);
  const [seals, setSeals] = useState(initialSeals);
  const [chatThreads, setChatThreads] = useState(initialChats);
  const [alerts, setAlerts] = useState(initialNotifications);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [selectedChat, setSelectedChat] = useState(initialChats[0]);
  const [sentMessages, setSentMessages] = useState({});

  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
  const matches = (value) => !normalizedQuery || String(value).toLocaleLowerCase('vi-VN').includes(normalizedQuery);

  const handleApprove = (record) => {
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: 'Approved' } : item));
    setCertificateList((current) => current.some((item) => item.record === record.id)
      ? current
      : [{
          id: `CERT-${record.id.replace('CR-', '')}`,
          record: record.id,
          device: record.device,
          customer: record.customer,
          service: record.type,
          procedure: record.procedure,
          status: 'Draft',
          issuedAt: '21/10/2026',
        }, ...current]);
    setFeedback(`Đã duyệt hồ sơ ${record.id}. Certificate có thể được khởi tạo.`);
    setModal(null);
  };

  const handleReject = (event) => {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get('reason') || '').trim();
    if (!reason) {
      setModal((current) => ({ ...current, error: 'Nhập lý do Reject để lưu ReviewLog.' }));
      return;
    }
    const rejected = records.find((record) => record.id === modal.record.id);
    setRecords((current) => current.map((item) => item.id === modal.record.id
      ? { ...item, status: 'Rejected', rejectReason: reason }
      : item));
    if (rejected) {
      const nextRecord = {
        ...rejected,
        id: `${rejected.id}-R1`,
        status: 'Pending',
        submittedAt: 'Chưa trình lại',
        measurements: rejected.measurements.map((measurement) => ({ ...measurement })),
      };
      setRecords((current) => [...current, nextRecord]);
    }
    setFeedback(`Đã ghi nhận từ chối ${modal.record.id}; bản ghi cũ được giữ nguyên và cần đo lại trên hồ sơ mới.`);
    setModal(null);
  };

  const saveProcedure = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const testPoints = String(form.get('testPoints')).split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [nominalValue = '', tolerance = '', maxUncertainty = ''] = line.split('|').map((part) => part.trim());
      return { pointNo: index + 1, nominalValue, tolerance, maxUncertainty };
    });
    const procedure = {
      id: modal.procedure?.id || `PR-${String(Date.now()).slice(-4)}`,
      serviceType: String(form.get('serviceType')).trim(),
      code: String(form.get('code')).trim(),
      version: modal.procedure?.version || 'V1.0',
      effectiveFrom: String(form.get('effectiveFrom')),
      environment: String(form.get('environment')).trim(),
      requiredEquipment: String(form.get('requiredEquipment')).trim(),
      status: 'Draft',
      steps: String(form.get('steps')).split('\n').map((instruction, index) => ({
        no: index + 1,
        instruction: instruction.trim(),
        evidence: instruction.toLowerCase().includes('[evidence]'),
      })).filter((step) => step.instruction),
      parameters: [{
        name: String(form.get('parameter')).trim(),
        unit: String(form.get('unit')).trim(),
        repeat: Number(form.get('repeat')),
        method: String(form.get('method')),
        points: testPoints,
      }],
    };
    if (!procedure.steps.length || !procedure.parameters[0].name || !testPoints.length
      || testPoints.some((point) => !point.nominalValue || !point.tolerance || !point.maxUncertainty)) {
      setFeedback('Quy trình cần có bước thao tác và điểm đo đủ giá trị danh định, dung sai, độ không đảm bảo tối đa.');
      return;
    }
    setProcedures((current) => modal.procedure?.id && modal.procedure.status === 'Draft'
      ? current.map((item) => item.id === modal.procedure.id ? procedure : item)
      : [procedure, ...current]);
    setFeedback('Đã lưu bản nháp CalibrationProcedure cùng các bước và thông số mẫu.');
    setModal(null);
  };

  const publishProcedure = (procedure) => {
    if (!procedure.steps.length || !procedure.parameters.length
      || procedure.parameters.some((item) => (Array.isArray(item.points) ? !item.points.length : item.points < 1))) {
      setFeedback('Không thể phát hành: quy trình cần có bước, thông số và điểm đo.');
      return;
    }
    setProcedures((current) => current.map((item) => {
      if (item.serviceType === procedure.serviceType && item.status === 'Active') return { ...item, status: 'Obsolete' };
      return item.id === procedure.id ? { ...item, status: 'Active' } : item;
    }));
    setFeedback(`Đã phát hành ${procedure.code} ${procedure.version}; phiên bản Active cũ được chuyển Obsolete.`);
  };

  const saveStandard = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = {
      id: modal.standard?.id || `MS-${String(Date.now()).slice(-3)}`,
      name: String(form.get('name')).trim(),
      serial: String(form.get('serial')).trim(),
      accuracy: String(form.get('accuracy')).trim(),
      expiry: String(form.get('expiry')),
      field: String(form.get('field')),
      status: String(form.get('status')),
    };
    setStandards((current) => modal.standard
      ? current.map((standard) => standard.id === modal.standard.id ? item : standard)
      : [item, ...current]);
    setFeedback('Đã cập nhật danh mục chuẩn đối chứng mẫu.');
    setModal(null);
  };

  const requestRevocation = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = form.get('reason')?.toString().trim();
    if (!reason) {
      setFeedback('Cần nhập lý do yêu cầu thu hồi Seal.');
      return;
    }
    const seal = modal.seal;
    setSeals((current) => current.map((item) => item.id === seal.id
      ? { ...item, revocation: { status: 'PendingApproval', reason, note: String(form.get('note') || '').trim(), requestedBy: 'Nguyễn Thu Hương', requestedAt: '21/10/2026 · 14:20' } }
      : item));
    setFeedback(`Đã gửi yêu cầu thu hồi Seal ${seal.code}; chờ Signatory quyết định.`);
    setModal(null);
  };

  const markNotificationRead = (notificationId) => {
    setAlerts((current) => current.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  };

  const value = {
    procedures, records, certificateList, standards, seals, chatThreads, alerts,
    query, setQuery, normalizedQuery, matches,
    feedback, setFeedback, selectedChat, setSelectedChat, sentMessages, setSentMessages, modal,
    setChatThreads, setModal, handleApprove, handleReject, saveProcedure, publishProcedure,
    saveStandard, requestRevocation, markNotificationRead,
  };

  return (
    <ReviewerWorkspaceContext.Provider value={value}>
      <Outlet />
      <ReviewerWorkspaceOverlays />
    </ReviewerWorkspaceContext.Provider>
  );
}

export default ReviewerWorkspaceProvider;
