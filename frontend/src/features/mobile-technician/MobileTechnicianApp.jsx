import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { getUserInitials } from '../../app/role-routing.js';
import { loginApi } from '../../services/auth-service.js';
import {
  deleteFileFromCloudApi,
  getTechnicianTasksApi,
  readFileAsDataUrl,
  saveCalibrationRecordApi,
  saveInitialInspectionApi,
  submitInspectionConsentApi,
  syncTechnicianTasksApi,
  uploadFileToCloudApi,
} from '../../services/work-order-service.js';
import OscilloscopeProcedureModal from '../operations/OscilloscopeProcedureModal.jsx';
import { createOscilloscopeSampleTask } from '../operations/oscilloscopeProcedureData.js';
import {
  TechnicianDigitalSignatureModal,
  TechnicianSignedDetailsCard,
} from '../operations/TechnicianDigitalSignatureModal.jsx';
import TechnicianInspectionConsentBox from '../operations/TechnicianInspectionConsentBox.jsx';
import './mobile-technician.css';

const getTasksCacheKey = (userId) => `isocal_tech_tasks_v4_u_${userId || 'guest'}`;
const getQueueCacheKey = (userId) => `isocal_tech_queue_v4_u_${userId || 'guest'}`;
const getLastSyncCacheKey = (userId) => `isocal_tech_last_sync_v4_u_${userId || 'guest'}`;

const inspectionCanProceed = (task) =>
  Boolean(
    task &&
      (task.inspection === 'Pass' ||
        (task.inspection === 'Fail' &&
          task.consentStatus === 'Approved' &&
          task.defectNote?.trim() &&
          (task.inspectionPhoto || task.inspectionPhotoData))),
  );

const isTaskReady = (task) =>
  Boolean(
    task &&
      inspectionCanProceed(task) &&
      task.steps.every((step) => step.done && (!step.evidence || step.file)) &&
      task.measurements.every((measurement) => measurement.measured !== ''),
  );

const getDeviation = (measurement) => {
  if (!measurement || measurement.measured === '' || measurement.measured === null) return null;
  const dev = Number(measurement.measured) - Number(measurement.reference);
  return Number.isNaN(dev) ? null : dev.toFixed(3);
};

const getVerificationHint = (measurement) => {
  if (!measurement || measurement.measured === '' || measurement.measured === null) return null;
  const tolerance = Number(String(measurement.tolerance || '').replace(/[^\d.-]/g, ''));
  const deviation = Number(measurement.measured) - Number(measurement.reference);
  if (Number.isNaN(deviation) || Number.isNaN(tolerance)) return null;
  return Math.abs(deviation) <= tolerance ? 'Gợi ý đạt' : 'Cần xem xét';
};

function MobileTechnicianApp() {
  const navigate = useNavigate();
  const { session, startSession, endSession } = useAppContext();
  const currentUser = session?.user;

  // Real logged-in technician data (Zero hardcoded values)
  const technicianName = currentUser?.full_name || currentUser?.name || currentUser?.email || 'Kỹ thuật viên';
  const technicianInitials = getUserInitials(currentUser, 'KT');
  const technicianRole = currentUser?.role || 'Technician';
  const technicianIdStr = currentUser?.id ? `KTV-${String(currentUser.id).padStart(3, '0')}` : 'KTV-ISOCAL';

  // ─── Mobile Login States (when opening app without prior session) ────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('Isocal@123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ─── Active Tab & Selection ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'calibrate' | 'sync' | 'profile'
  const [activeStepTab, setActiveStepTab] = useState('inspect'); // 'inspect' | 'steps' | 'measures' | 'sign'
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // ─── Network & Offline Storage ───────────────────────────────────────
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const effectiveOnline = isOnline && !simulatedOffline;

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const currentUserId = currentUser?.id || 'guest';
  const tasksCacheKey = getTasksCacheKey(currentUserId);
  const queueCacheKey = getQueueCacheKey(currentUserId);
  const lastSyncCacheKey = getLastSyncCacheKey(currentUserId);

  // Load cached tasks scoped to the logged-in technician
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem(tasksCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t) => t.id !== 'task-osc-sample-01');
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc cache offline tasks:', e);
    }
    return [];
  });

  const [selectedId, setSelectedId] = useState(() => tasks[0]?.id || '');
  const [isOscProcedureModalOpen, setIsOscProcedureModalOpen] = useState(false);

  // Load sync queue & last sync timestamp
  const [syncQueue, setSyncQueue] = useState(() => {
    try {
      const cached = localStorage.getItem(queueCacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [lastSyncedTime, setLastSyncedTime] = useState(() => {
    return localStorage.getItem(lastSyncCacheKey) || 'Chưa đồng bộ';
  });

  // Reload user-scoped cache whenever the logged-in account changes
  useEffect(() => {
    try {
      const cached = localStorage.getItem(tasksCacheKey);
      const parsed = cached ? JSON.parse(cached) : [];
      const list = Array.isArray(parsed) ? parsed.filter((t) => t.id !== 'task-osc-sample-01') : [];
      setTasks(list);
      setSelectedId(list[0]?.id || '');
    } catch {
      setTasks([]);
      setSelectedId('');
    }
    try {
      const cachedQ = localStorage.getItem(queueCacheKey);
      setSyncQueue(cachedQ ? JSON.parse(cachedQ) : []);
    } catch {
      setSyncQueue([]);
    }
    setLastSyncedTime(localStorage.getItem(lastSyncCacheKey) || 'Chưa đồng bộ');
  }, [tasksCacheKey, queueCacheKey, lastSyncCacheKey]);

  // ─── Real Network Listeners & PWA Install Prompt ─────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage('🟢 Đã có mạng trở lại! Đang chuẩn bị đồng bộ dữ liệu với Web...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage('📶 Đã chuyển sang chế độ Ngoại tuyến (Offline Mode). Dữ liệu được lưu trên máy.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Save tasks and sync queue to LocalStorage
  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(tasksCacheKey, JSON.stringify(newTasks));
    } catch (e) {
      console.warn(e);
    }
  };

  const enqueueSyncAction = (action) => {
    setSyncQueue((prev) => {
      const updated = [action, ...prev];
      try {
        localStorage.setItem(queueCacheKey, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  // ─── Mobile Login Handlers ───────────────────────────────────────────
  const OFFLINE_TECH_ACCOUNTS = [
    { id: 13, full_name: 'Trần Tuấn Anh', email: 'tran.anh@isocal.com', phone: '0901000013', role: 'Technician' },
    { id: 12, full_name: 'Nguyễn Minh Quân', email: 'nguyen.quan@isocal.com', phone: '0901000012', role: 'Technician' },
    { id: 4, full_name: 'Lê Văn Cường', email: 'technician@isocal.com', phone: '0901000004', role: 'Technician' },
    { id: 5, full_name: 'Phạm Minh Đức', email: 'head.technician@isocal.com', phone: '0901000005', role: 'HeadTechnician' },
    { id: 2, full_name: 'Nguyễn Văn An', email: 'sale@isocal.com', phone: '0901000002', role: 'Sales' },
    { id: 1, full_name: 'System Administrator', email: 'admin@isocal.com', phone: '0901000001', role: 'Admin' },
  ];

  const handleMobileLogin = async (emailOverride, passwordOverride) => {
    const emailToUse = (emailOverride || loginEmail).trim().toLowerCase();
    const passwordToUse = passwordOverride || loginPassword;

    if (!emailToUse || !passwordToUse) {
      setLoginError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      const { token, account } = await loginApi(emailToUse, passwordToUse);
      localStorage.setItem('isocal_token', token);
      try {
        localStorage.setItem('isocal_user', JSON.stringify(account));
      } catch {}

      startSession(account);
      setToastMessage(`✓ Xin chào ${account.full_name || account.email}! Đã kích hoạt phiên KTV.`);
    } catch (err) {
      // Nếu mất mạng hoặc không kết nối được máy chủ (Offline mode), cho phép xác thực ngoại tuyến
      const isNetworkOrServerDown = !err?.response || err.response.status >= 502;
      if (isNetworkOrServerDown) {
        const matchedOffline = OFFLINE_TECH_ACCOUNTS.find((a) => a.email.toLowerCase() === emailToUse);
        if (matchedOffline && passwordToUse === 'Isocal@123') {
          try {
            localStorage.setItem('isocal_user', JSON.stringify(matchedOffline));
          } catch {}
          startSession(matchedOffline);
          setToastMessage(`📶 Đã đăng nhập chế độ Ngoại tuyến: ${matchedOffline.full_name}`);
          setLoginLoading(false);
          return;
        }
      }

      setLoginError(
        err?.response?.data?.error?.message === 'Invalid email or password.'
          ? 'Email hoặc mật khẩu không chính xác.'
          : err?.response?.data?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.',
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMobileLogout = () => {
    endSession();
    setToastMessage('Đã đăng xuất tài khoản trên ứng dụng.');
  };

  // ─── Auto-fetch from Backend when Online ──────────────────────────────
  useEffect(() => {
    if (!effectiveOnline || !currentUser) return;
    let isMounted = true;

    const pullRemote = async () => {
      try {
        const remoteTasks = await getTechnicianTasksApi();
        if (isMounted && Array.isArray(remoteTasks)) {
          setTasks((local) => {
            const localMap = new Map(local.map((t) => [t.id, t]));
            const merged = remoteTasks.map((rt) => {
              const loc = localMap.get(rt.id);
              if (loc && loc.pendingSync) {
                return {
                  ...rt,
                  ...loc,
                  service_request_item_id: rt.service_request_item_id,
                  assignment_id: rt.assignment_id,
                  service_type_id: rt.service_type_id,
                  procedure_id: rt.procedure_id,
                  steps: (loc.steps?.length ? loc.steps : rt.steps || []).map((ls, idx) => ({
                    ...(rt.steps?.[idx] || {}),
                    ...ls,
                    procedure_step_id: ls.procedure_step_id || rt.steps?.[idx]?.procedure_step_id,
                    step_no: ls.step_no || rt.steps?.[idx]?.step_no || idx + 1,
                  })),
                  measurements: (loc.measurements?.length ? loc.measurements : rt.measurements || []).map((lm, idx) => ({
                    ...(rt.measurements?.[idx] || {}),
                    ...lm,
                    test_point_id: lm.test_point_id || rt.measurements?.[idx]?.test_point_id,
                    parameter_id: lm.parameter_id || rt.measurements?.[idx]?.parameter_id,
                    point_no: lm.point_no || rt.measurements?.[idx]?.point_no,
                  })),
                };
              }
              return {
                ...rt,
                steps: rt.steps?.length ? rt.steps : loc?.steps || [],
                measurements: rt.measurements?.length ? rt.measurements : loc?.measurements || [],
              };
            });
            const finalList = merged.filter((t) => t.id !== 'task-osc-sample-01');

            try {
              localStorage.setItem(tasksCacheKey, JSON.stringify(finalList));
            } catch (e) {
              console.warn(e);
            }
            if (finalList.length > 0) {
              setSelectedId((prev) => (finalList.some((m) => m.id === prev) ? prev : finalList[0].id));
            } else {
              setSelectedId('');
            }
            return finalList;
          });
        }
      } catch {
        // Smoothly continue using offline local data
      }
    };

    pullRemote();
    return () => {
      isMounted = false;
    };
  }, [effectiveOnline, currentUser, tasksCacheKey]);

  // ─── Bi-directional Sync Function ────────────────────────────────────
  const handleSyncWithWeb = async () => {
    if (!effectiveOnline) {
      setToastMessage('⚠️ Không thể đồng bộ khi đang mất mạng. Vui lòng bật 4G/Wifi!');
      return;
    }
    setIsSyncing(true);
    try {
      const pendingTasks = tasks.filter((t) => t.pendingSync);
      const res = await syncTechnicianTasksApi({
        tasks: pendingTasks.length > 0 ? pendingTasks : tasks,
        queue: syncQueue,
      });

      // Clear pending status
      const updatedTasks = tasks.map((t) => ({ ...t, pendingSync: false }));
      saveTasks(updatedTasks);

      setSyncQueue([]);
      try {
        localStorage.removeItem(queueCacheKey);
      } catch (e) {
        console.warn(e);
      }

      const timeStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      setLastSyncedTime(timeStr);
      localStorage.setItem(lastSyncCacheKey, timeStr);

      setToastMessage(`✓ ${res?.message || 'Đồng bộ hai chiều với Web thành công!'}`);
    } catch (err) {
      setToastMessage(err?.response?.data?.error?.message || 'Lỗi khi đồng bộ lên máy chủ. Dữ liệu vẫn được lưu an toàn trên máy.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Task Update Handler ─────────────────────────────────────────────
  const updateTask = (taskId, updater) => {
    setTasks((current) => {
      const nextTasks = current.map((t) => {
        if (t.id === taskId) {
          const mod = updater(t);
          return {
            ...mod,
            pendingSync: !effectiveOnline || t.pendingSync || false,
            lastModified: new Date().toISOString(),
          };
        }
        return t;
      });
      try {
        localStorage.setItem(tasksCacheKey, JSON.stringify(nextTasks));
      } catch (e) {
        console.warn(e);
      }
      return nextTasks;
    });

    enqueueSyncAction({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId,
      type: 'UPDATE_TASK',
      time: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  // ─── Camera / Photo Upload ───────────────────────────────────────────
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState('');

  const handleCameraCapture = async (file, field = 'inspectionPhoto') => {
    if (!selectedTask || !file) return;
    setUploadingPhotoKey(field);
    try {
      const base64 = await readFileAsDataUrl(file);
      let finalUrl = base64;
      let publicId = '';

      if (effectiveOnline) {
        try {
          setToastMessage('☁️ Đang tải ảnh lên Cloudinary...');
          const uploaded = await uploadFileToCloudApi({
            fileData: base64,
            fileName: file.name,
            folder: 'inspections',
          });
          if (uploaded?.url) {
            finalUrl = uploaded.url;
            publicId = uploaded.public_id || '';
          }
        } catch {
          // Fallback to base64 if offline
        }
      }

      const updated = {
        ...selectedTask,
        [field]: finalUrl,
        [`${field}Name`]: file.name,
        [`${field}Data`]: finalUrl,
        [`${field}PublicId`]: publicId,
      };
      updateTask(selectedTask.id, () => updated);
      setToastMessage('✓ Đã chụp và lưu ảnh lên Cloudinary!');
      if (updated.inspection === 'Pass' || (updated.inspection === 'Fail' && updated.defectNote?.trim())) {
        handleSaveInspection(updated);
      }
    } catch {
      setToastMessage('Lỗi khi đọc tệp ảnh chụp.');
    } finally {
      setUploadingPhotoKey('');
    }
  };

  const handleRemoveInspectionPhoto = async () => {
    if (!selectedTask) return;
    const oldUrl = selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto || '';
    const oldPublicId = selectedTask.inspectionPhotoPublicId || '';

    const updated = {
      ...selectedTask,
      inspectionPhoto: '',
      inspectionPhotoName: '',
      inspectionPhotoData: '',
      inspectionPhotoPublicId: '',
    };
    updateTask(selectedTask.id, () => updated);

    if (effectiveOnline && (oldPublicId || /^https?:\/\//i.test(oldUrl) || oldUrl.startsWith('/uploads/'))) {
      try {
        await deleteFileFromCloudApi({ public_id: oldPublicId, url: oldUrl });
      } catch {
        // ignore
      }
    }
    setToastMessage('🗑 Đã xóa ảnh ngoại quan đã chọn.');
  };

  const handleStepEvidenceCapture = async (stepId, file) => {
    if (!selectedTask || !file) return;
    setUploadingPhotoKey(`step-${stepId}`);
    try {
      const base64 = await readFileAsDataUrl(file);
      let finalUrl = base64;
      let publicId = '';

      if (effectiveOnline) {
        try {
          setToastMessage('☁️ Đang tải ảnh minh chứng lên Cloudinary...');
          const uploaded = await uploadFileToCloudApi({
            fileData: base64,
            fileName: file.name,
            folder: 'step_evidence',
          });
          if (uploaded?.url) {
            finalUrl = uploaded.url;
            publicId = uploaded.public_id || '';
          }
        } catch {
          // Fallback to base64
        }
      }

      updateTask(selectedTask.id, (task) => ({
        ...task,
        steps: task.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                file: finalUrl,
                fileName: file.name,
                fileData: finalUrl,
                publicId,
                done: true,
              }
            : s,
        ),
      }));
      setToastMessage('✓ Đã lưu ảnh minh chứng bước quy trình!');
    } catch {
      setToastMessage('Lỗi khi đọc ảnh minh chứng.');
    } finally {
      setUploadingPhotoKey('');
    }
  };

  const handleRemoveStepEvidence = async (stepId) => {
    if (!selectedTask) return;
    const targetStep = selectedTask.steps.find((s) => s.id === stepId);
    const oldUrl = targetStep?.fileData || targetStep?.file || '';
    const oldPublicId = targetStep?.publicId || '';

    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((s) =>
        s.id === stepId
          ? { ...s, file: '', fileName: '', fileData: '', publicId: '' }
          : s,
      ),
    }));

    if (effectiveOnline && (oldPublicId || /^https?:\/\//i.test(oldUrl) || oldUrl.startsWith('/uploads/'))) {
      try {
        await deleteFileFromCloudApi({ public_id: oldPublicId, url: oldUrl });
      } catch {
        // ignore
      }
    }
    setToastMessage('🗑 Đã xóa ảnh minh chứng của bước đo.');
  };

  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [inspectionSaveSuccess, setInspectionSaveSuccess] = useState(false);

  const handleSaveInspection = async (taskToSave = selectedTask) => {
    if (!taskToSave || !taskToSave.inspection) return;
    if (taskToSave.inspection === 'Fail' && !taskToSave.defectNote?.trim()) {
      setToastMessage('⚠️ Vui lòng nhập mô tả chi tiết lỗi ngoại quan khi đánh giá Không đạt.');
      return;
    }

    setIsSavingInspection(true);
    setInspectionSaveSuccess(false);

    if (effectiveOnline) {
      try {
        await saveInitialInspectionApi({
          assignment_id: taskToSave.assignment_id,
          service_request_item_id: taskToSave.service_request_item_id,
          result: taskToSave.inspection,
          defect_note: taskToSave.defectNote || '',
          photo_url: taskToSave.inspectionPhotoData || taskToSave.inspectionPhoto || '',
          customer_written_consent: Boolean(taskToSave.consent),
        });
        setToastMessage(`✓ Đã lưu kết quả ngoại quan (${taskToSave.inspection === 'Pass' ? 'Đạt' : 'Không đạt'}) vào CSDL!`);
        setInspectionSaveSuccess(true);
        setTimeout(() => setInspectionSaveSuccess(false), 5000);
      } catch (err) {
        setToastMessage(err?.response?.data?.error?.message || 'Lỗi khi lưu kết quả ngoại quan.');
      } finally {
        setIsSavingInspection(false);
      }
    } else {
      setToastMessage('📶 Đã lưu ngoại tuyến kết quả ngoại quan. Sẽ tự động đồng bộ khi có mạng!');
      setInspectionSaveSuccess(true);
      setIsSavingInspection(false);
      setTimeout(() => setInspectionSaveSuccess(false), 5000);
    }
  };

  const handleTechnicianConsentSubmit = async ({
    signerName,
    consentMethod,
    note,
    consentFile,
  }) => {
    if (!selectedTask) return;
    const nowIso = new Date().toISOString();
    const updated = {
      ...selectedTask,
      consent: true,
      consentStatus: 'Approved',
      consentSignerName: signerName || selectedTask.customer || 'Đại diện Khách hàng',
      consentMethod: consentMethod || 'WrittenDocument',
      consentNote: note || '',
      consentFile: consentFile || selectedTask.consentFile || '',
      consentedAt: nowIso,
    };
    updateTask(selectedTask.id, () => updated);

    if (effectiveOnline) {
      try {
        await submitInspectionConsentApi({
          assignment_id: selectedTask.assignment_id,
          service_request_item_id: selectedTask.service_request_item_id,
          decision: 'Approved',
          signer_name: signerName || selectedTask.customer || 'Đại diện Khách hàng',
          consent_method: consentMethod || 'WrittenDocument',
          note,
          consent_file: consentFile,
        });
        setToastMessage('✓ Đã ghi nhận văn bản đồng ý & mở khóa hiệu chuẩn');
      } catch (err) {
        setToastMessage(err?.response?.data?.error?.message || 'Lỗi khi lưu xác nhận lên máy chủ.');
      }
    } else {
      setToastMessage('📶 Đã lưu ngoại tuyến xác nhận. Sẽ đồng bộ khi có mạng.');
    }
  };

  const handleApplyOscilloscopeTask = () => {
    if (!selectedTask) {
      setToastMessage('⚠️ Vui lòng chọn một thiết bị được giao trước!');
      return;
    }
    const sample = createOscilloscopeSampleTask();
    updateTask(selectedTask.id, (task) => ({
      ...task,
      procedure: sample.procedure,
      environment: sample.environment,
      steps: sample.steps.map((st) => ({
        ...st,
        done: task.steps?.find((s) => s.id === st.id)?.done || false,
      })),
      measurements: sample.measurements.map((m) => {
        const existing = task.measurements?.find((em) => em.id === m.id);
        return {
          ...m,
          measured: existing ? existing.measured : m.measured,
        };
      }),
    }));
    setActiveTab('calibrate');
    setActiveStepTab('steps');
    setToastMessage(`✓ Đã áp dụng quy trình 6 bước vào "${selectedTask.device}"!`);
  };

  // ─── Step Toggle & Measurement Inputs ────────────────────────────────
  const toggleStep = (stepId) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
    }));
  };

  const setEnvironmentField = (field, val) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      [field]: val,
    }));
  };

  const setStepNote = (stepId, noteVal) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((s) => (s.id === stepId ? { ...s, note: noteVal } : s)),
    }));
  };

  const handleMeasurementChange = (measureId, val) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      measurements: task.measurements.map((m) =>
        m.id === measureId ? { ...m, measured: val } : m,
      ),
    }));
  };

  const adjustMeasurement = (measureId, delta) => {
    if (!selectedTask) return;
    const item = selectedTask.measurements.find((m) => m.id === measureId);
    if (!item) return;
    const currentVal = item.measured === '' ? Number(item.reference) || 0 : Number(item.measured);
    const newVal = (currentVal + delta).toFixed(3);
    handleMeasurementChange(measureId, newVal);
  };

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const handleSaveProcedureProgress = async (submitFinal = false, taskOverride = null) => {
    const targetTask = taskOverride || selectedTask;
    if (!targetTask) return;

    const resolvedAssignmentId =
      targetTask.assignment_id ||
      (typeof targetTask.id === 'string' && targetTask.id.startsWith('task-')
        ? Number(targetTask.id.replace('task-', ''))
        : undefined);

    if (!targetTask.service_request_item_id && !resolvedAssignmentId) return;

    if (!effectiveOnline) {
      setToastMessage('📶 Đã lưu tiến độ ngoại tuyến trên điện thoại!');
      return;
    }

    setIsSavingRecord(true);
    try {
      const saved = await saveCalibrationRecordApi({
        service_request_item_id: targetTask.service_request_item_id,
        assignment_id: resolvedAssignmentId,
        environment_temp: targetTask.environment_temp,
        environment_humidity: targetTask.environment_humidity,
        steps: targetTask.steps,
        measurements: targetTask.measurements,
        submit: submitFinal,
        signed: Boolean(submitFinal || targetTask.signed),
        signature_image: targetTask.signatureImage || null,
        signature_note: targetTask.signatureNote || null,
        signer_name: targetTask.signedBy || technicianName || null,
      });

      if (saved) {
        setTasks((current) => {
          const next = current.map((t) => {
            if (t.id !== targetTask.id) return t;
            const sig = saved.digital_signature || t.digital_signature || null;
            return {
              ...t,
              calibration_record_id: saved.calibration_record?.id || t.calibration_record_id,
              environment_temp: saved.calibration_record?.environment_temp ?? t.environment_temp,
              environment_humidity: saved.calibration_record?.environment_humidity ?? t.environment_humidity,
              result_status: saved.calibration_record?.result_status || t.result_status,
              review_status: saved.calibration_record?.review_status || t.review_status,
              submitted_at: saved.calibration_record?.submitted_at || t.submitted_at,
              signed: Boolean(sig || saved.calibration_record?.submitted_at || t.signed),
              submitted: Boolean(saved.calibration_record?.submitted_at || t.submitted),
              signedAt: sig?.signed_at || saved.calibration_record?.submitted_at || t.signedAt,
              signedBy: sig?.signer_name || t.signedBy || technicianName,
              signatureHash: sig?.document_hash || t.signatureHash,
              signatureValue: sig?.signature_value || t.signatureValue,
              signatureImage: sig?.signed_file_url || t.signatureImage,
              signatureTransactionId: sig?.provider_transaction_id || t.signatureTransactionId,
              signatureProvider: sig?.provider || t.signatureProvider || 'ISOCAL-PKI-SHA256',
              signatureNote: sig?.signature_metadata?.note || t.signatureNote,
              digital_signature: sig,
              steps: saved.steps?.length ? saved.steps : t.steps,
              measurements: saved.test_points?.length ? saved.test_points : t.measurements,
              pendingSync: false,
            };
          });
          try {
            localStorage.setItem(tasksCacheKey, JSON.stringify(next));
          } catch (e) {
            console.warn(e);
          }
          return next;
        });
      }

      setToastMessage(
        submitFinal
          ? '✓ Đã ký số điện tử (SHA-256) & lưu biên bản lên CSDL!'
          : '✓ Đã lưu tiến độ quy trình kỹ thuật vào CSDL!',
      );
    } catch {
      setToastMessage('📶 Đã lưu tiến độ trên máy, sẽ đồng bộ khi kết nối ổn định.');
    } finally {
      setIsSavingRecord(false);
    }
  };

  // ─── Digital Signature ───────────────────────────────────────────────
  const [mobileSignModalOpen, setMobileSignModalOpen] = useState(false);

  const handleDigitalSign = () => {
    if (!selectedTask) return;
    if (!isTaskReady(selectedTask)) {
      setToastMessage('⚠️ Cần hoàn tất kiểm tra ngoại quan, các bước quy trình và đủ số liệu trước khi ký!');
      return;
    }
    setMobileSignModalOpen(true);
  };

  const confirmMobileDigitalSign = async (signData = {}) => {
    if (!selectedTask) return;
    const nowIso = new Date().toISOString();
    const updatedTask = {
      ...selectedTask,
      signed: true,
      submitted: true,
      signedAt: nowIso,
      signedBy: signData.signerName || technicianName,
      signatureHash: signData.previewHash || `SHA256:${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      signatureImage: signData.signatureImage || '',
      signatureNote: signData.signatureNote || '',
    };
    updateTask(selectedTask.id, () => updatedTask);

    if (effectiveOnline) {
      await handleSaveProcedureProgress(true, updatedTask);
      setMobileSignModalOpen(false);
    } else {
      setMobileSignModalOpen(false);
      setToastMessage('✓ Đã ký số và lưu ngoại tuyến trên điện thoại. Sẽ tự động gửi khi có mạng!');
    }
  };

  // ─── Filter Tasks ────────────────────────────────────────────────────
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchSearch =
        !q ||
        `${task.workOrder} ${task.device} ${task.serial} ${task.customer} ${task.model}`
          .toLowerCase()
          .includes(q);

      const matchFilter =
        filter === 'all' ||
        (filter === 'new' && !task.submitted && !task.inspection) ||
        (filter === 'in-progress' && !task.submitted && task.inspection) ||
        (filter === 'done' && task.submitted) ||
        (filter === 'pending' && task.pendingSync);

      return matchSearch && matchFilter;
    });
  }, [filter, search, tasks]);

  const selectedTask = tasks.find((t) => t.id === selectedId) || visibleTasks[0] || tasks[0];
  const pendingCount = tasks.filter((t) => t.pendingSync).length;
  const completedCount = tasks.filter((t) => t.submitted).length;
  const inProgressCount = tasks.filter((t) => !t.submitted && t.inspection).length;

  return (
    <div className="mobile-app-root">
      <div className="mobile-device-shell">
        {/* ─── Simulated Status Bar (Carrier, Time, Wifi, Battery) ─── */}
        <div className="mobile-status-bar">
          <span>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="mobile-status-bar-icons">
            <span>{effectiveOnline ? '5G' : '✕ No SIM'}</span>
            <span>{effectiveOnline ? 'ᯤ' : '—'}</span>
            <span>89% 🔋</span>
          </div>
        </div>

        {/* ─── App Header Bar ────────────────────────────────────────── */}
        <header className="mobile-app-header">
          <div className="mobile-app-brand">
            <div className="mobile-app-logo">IS</div>
            <div>
              <h1 className="mobile-app-title">ISOCAL Tech</h1>
              <p className="mobile-app-subtitle">
                {currentUser ? technicianName : 'Đăng nhập KTV'}
              </p>
            </div>
          </div>

          <div className="mobile-header-actions">
            {/* Connection Status Pill */}
            <button
              className={`mobile-conn-pill ${effectiveOnline ? 'online' : 'offline'}`}
              onClick={() => setActiveTab('sync')}
              type="button"
            >
              <span className="conn-dot-indicator" />
              <span>{effectiveOnline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Sync Badge Button */}
            <button
              className="mobile-sync-icon-btn"
              onClick={() => setActiveTab('sync')}
              title="Trung tâm đồng bộ"
              type="button"
            >
              <span>⟳</span>
              {pendingCount > 0 && <span className="mobile-sync-badge">{pendingCount}</span>}
            </button>
          </div>
        </header>

        {/* ─── Toast Feedback Notification ───────────────────────────── */}
        {toastMessage && (
          <div
            onClick={() => setToastMessage('')}
            style={{
              background: '#1e293b',
              color: '#ffffff',
              padding: '10px 16px',
              fontSize: '0.72rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid #334155',
            }}
          >
            <span>{toastMessage}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>✕</span>
          </div>
        )}

        {/* ─── MAIN CONTENT AREA ──────────────────────────────────────── */}
        {!currentUser ? (
          /* ═════════════════════════════════════════════════════════════
             IF NOT LOGGED IN: MOBILE LOGIN SCREEN
             ═════════════════════════════════════════════════════════════ */
          <main className="mobile-content-area" style={{ padding: '24px 18px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#fff',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
                  marginBottom: '10px',
                }}
              >
                IS
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                Đăng nhập Kỹ thuật viên
              </h2>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                Đăng nhập tài khoản của bạn để nhận lệnh công việc và làm việc ngoại tuyến
              </p>
            </div>

            {loginError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {loginError}
              </div>
            )}

            {/* Quick 1-Tap Account Selector for Testing */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                ⚡ Chọn nhanh tài khoản KTV để đăng nhập ngay:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'Trần Tuấn Anh', email: 'tran.anh@isocal.com', role: 'KTV Điện – Điện tử' },
                  { name: 'Nguyễn Minh Quân', email: 'nguyen.quan@isocal.com', role: 'KTV Cơ – Áp suất' },
                  { name: 'Lê Văn Cường', email: 'technician@isocal.com', role: 'KTV Khối lượng – Lực' },
                  { name: 'Phạm Minh Đức', email: 'head.technician@isocal.com', role: 'Trưởng nhóm Kỹ thuật' },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    disabled={loginLoading}
                    onClick={() => handleMobileLogin(acc.email, 'Isocal@123')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    type="button"
                  >
                    <div>
                      <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{acc.name}</strong>
                      <div style={{ fontSize: '0.67rem', color: '#64748b' }}>{acc.email} · {acc.role}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>Đăng nhập →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Email / Password Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMobileLogin();
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                Hoặc nhập thông tin tài khoản khác:
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Email kỹ thuật viên:
                </label>
                <input
                  disabled={loginLoading}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ví dụ: tran.anh@isocal.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  type="email"
                  value={loginEmail}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Mật khẩu:
                </label>
                <input
                  disabled={loginLoading}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mặc định: Isocal@123"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  type="password"
                  value={loginPassword}
                />
              </div>

              <button
                className="mobile-sync-cta"
                disabled={loginLoading}
                style={{ width: '100%' }}
                type="submit"
              >
                {loginLoading ? 'Đang xác thực...' : 'ĐĂNG NHẬP VÀO ỨNG DỤNG'}
              </button>
            </form>
          </main>
        ) : (
          /* ═════════════════════════════════════════════════════════════
             IF LOGGED IN: REGULAR TABS (TASKS / CALIBRATE / SYNC / PROFILE)
             ═════════════════════════════════════════════════════════════ */
          <main className="mobile-content-area">
            {/* ─── TAB 1: DANH SÁCH CÔNG VIỆC (MY TASKS) ─────────── */}
            {activeTab === 'tasks' && (
              <div>
                {/* Dynamic User Greeting Card */}
                <div className="mobile-user-card">
                  <div className="mobile-user-info">
                    <h2>{technicianName}</h2>
                    <p>Mã KTV: {technicianIdStr} · {technicianRole}</p>
                  </div>
                  <div className="mobile-avatar-circle">{technicianInitials}</div>
                </div>

                {/* Offline Warning Banner if Offline */}
                {!effectiveOnline && (
                  <div className="mobile-app-banner offline">
                    <div className="mobile-banner-text">
                      <strong>Chế độ Ngoại tuyến đang hoạt động</strong>
                      <span>Dữ liệu đo kiểm, ảnh camera và chữ ký được lưu trực tiếp trên máy.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('sync')}
                      style={{
                        background: '#d97706',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                      type="button"
                    >
                      Xem ({pendingCount})
                    </button>
                  </div>
                )}

                {/* KPI Stat Pills */}
                <div className="mobile-stats-row">
                  <div className="mobile-stat-box">
                    <div className="mobile-stat-number">{tasks.length}</div>
                    <div className="mobile-stat-label">Được giao</div>
                  </div>
                  <div className="mobile-stat-box">
                    <div className="mobile-stat-number" style={{ color: '#0284c7' }}>
                      {inProgressCount}
                    </div>
                    <div className="mobile-stat-label">Đang đo</div>
                  </div>
                  <div className="mobile-stat-box">
                    <div className="mobile-stat-number" style={{ color: '#16a34a' }}>
                      {completedCount}
                    </div>
                    <div className="mobile-stat-label">Đã xong</div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mobile-search-wrapper">
                  <span className="mobile-search-icon">⌕</span>
                  <input
                    className="mobile-search-input"
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm thiết bị, model, serial, khách..."
                    value={search}
                  />
                </div>

                {/* Filter Chips */}
                <div className="mobile-chip-scroll">
                  {[
                    ['all', 'Tất cả'],
                    ['new', 'Chưa đo'],
                    ['in-progress', 'Đang đo'],
                    ['done', 'Đã xong'],
                    ['pending', `Chờ gửi Web (${pendingCount})`],
                  ].map(([val, label]) => (
                    <button
                      className={`mobile-chip ${filter === val ? 'active' : ''}`}
                      key={val}
                      onClick={() => setFilter(val)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Shortcut to Oscilloscope Procedure Standard */}
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsOscProcedureModalOpen(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.2rem' }}>🔬</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>
                          Quy trình Chuẩn: Máy hiện sóng (6 bước)
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#3b82f6' }}>
                          Fluke 5520A · 18–28°C · 30 phút làm nóng · CH1 & CH2
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>Xem ➔</span>
                  </button>
                </div>

                {/* Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {visibleTasks.map((task) => (
                    <div
                      className="mobile-task-card"
                      key={task.id}
                      onClick={() => {
                        setSelectedId(task.id);
                        setActiveTab('calibrate');
                        setActiveStepTab('inspect');
                      }}
                    >
                      <div className="mobile-card-top">
                        <div className="mobile-card-device">{task.device}</div>
                        <span className="mobile-card-code">{task.workOrder}</span>
                      </div>

                      <div className="mobile-card-customer">{task.customer}</div>

                      <div className="mobile-card-meta">
                        <div>
                          Model: <strong>{task.model}</strong> · SN: <strong>{task.serial}</strong>
                        </div>
                        <div>
                          Lịch: {task.scheduled} · {task.location}
                        </div>
                      </div>

                      <div className="mobile-card-footer">
                        <span
                          className={`mobile-badge ${
                            task.submitted ? 'done' : task.inspection ? 'in-progress' : 'new'
                          }`}
                        >
                          {task.submitted ? '✓ Đã trình duyệt' : task.inspection ? '● Đang đo kiểm' : 'Chưa bắt đầu'}
                        </span>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {task.pendingSync && (
                            <span className="mobile-offline-tag">⚡ Chưa gửi Web</span>
                          )}
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>→</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleTasks.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '32px 16px',
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '14px',
                        color: '#64748b',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>📋</div>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                        {tasks.length === 0
                          ? 'Chưa có thiết bị nào được phân công cho bạn'
                          : 'Không có nhiệm vụ nào phù hợp với bộ lọc'}
                      </strong>
                      <span>
                        {tasks.length === 0
                          ? `Tài khoản ${technicianName} hiện chưa được gán thiết bị đo kiểm nào từ Trưởng phòng Kỹ thuật.`
                          : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB 2: MÀN HÌNH ĐO KIỂM & QUY TRÌNH (CALIBRATE) ─ */}
            {activeTab === 'calibrate' && !selectedTask && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '14px',
                  color: '#64748b',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔬</div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  Chưa chọn thiết bị đo kiểm
                </strong>
                <span>Vui lòng chọn một thiết bị được phân công tại mục Nhiệm vụ để bắt đầu.</span>
              </div>
            )}

            {activeTab === 'calibrate' && selectedTask && (
              <div>
                {/* Back to tasks pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    style={{
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    type="button"
                  >
                    ← Danh sách nhiệm vụ
                  </button>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                    {selectedTask.workOrder}
                  </span>
                </div>

                {/* Task Header Box */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedTask.device}
                    </h2>
                    <span
                      className={`mobile-badge ${
                        selectedTask.submitted ? 'done' : selectedTask.inspection ? 'in-progress' : 'new'
                      }`}
                    >
                      {selectedTask.submitted ? 'Đã duyệt' : selectedTask.inspection ? 'Đang đo' : 'Mới'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                    {selectedTask.customer}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                    Model: {selectedTask.model} · Serial: {selectedTask.serial} · Chuẩn: {selectedTask.master_standard || 'Lab'}
                  </div>
                </div>

                {/* Step Navigation Tabs */}
                <div className="mobile-step-nav">
                  {[
                    ['inspect', '1. Ngoại quan'],
                    ['steps', '2. Quy trình'],
                    ['measures', '3. Kết quả đo'],
                    ['sign', '4. Ký số'],
                  ].map(([tabKey, tabLabel]) => (
                    <button
                      className={`mobile-step-tab ${activeStepTab === tabKey ? 'active' : ''}`}
                      key={tabKey}
                      onClick={() => setActiveStepTab(tabKey)}
                      type="button"
                    >
                      {tabLabel}
                    </button>
                  ))}
                </div>

                {/* Step 1: Kiểm tra ngoại quan */}
                {activeStepTab === 'inspect' && (
                  <div className="mobile-section-box">
                    <h3>Bước 1: Kiểm tra ban đầu & Ngoại quan</h3>
                    <p>Xác nhận tình trạng thiết bị không bị hư hỏng, tem niêm phong còn hạn.</p>

                    <div className="mobile-touch-btn-row">
                      <button
                        className={`mobile-touch-btn pass ${selectedTask.inspection === 'Pass' ? 'chosen' : ''}`}
                        disabled={selectedTask.submitted}
                        onClick={() => {
                          const updated = {
                            ...selectedTask,
                            inspection: 'Pass',
                            consent: false,
                            defectNote: '',
                          };
                          updateTask(selectedTask.id, () => updated);
                          handleSaveInspection(updated);
                        }}
                        type="button"
                      >
                        <span style={{ fontSize: '1.3rem' }}>✓</span>
                        <span>Đạt ngoại quan</span>
                      </button>

                      <button
                        className={`mobile-touch-btn fail ${selectedTask.inspection === 'Fail' ? 'chosen' : ''}`}
                        disabled={selectedTask.submitted}
                        onClick={() => {
                          const updated = {
                            ...selectedTask,
                            inspection: 'Fail',
                            consent: false,
                            consentStatus: 'Pending',
                            consentSignerName: '',
                            consentMethod: '',
                            consentNote: '',
                            consentFile: '',
                            consentedAt: null,
                          };
                          updateTask(selectedTask.id, () => updated);
                        }}
                        type="button"
                      >
                        <span style={{ fontSize: '1.3rem' }}>!</span>
                        <span>Có lỗi / Không đạt</span>
                      </button>
                    </div>

                    {selectedTask.inspection === 'Pass' && (
                      <div
                        style={{
                          marginTop: '10px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#166534',
                          fontSize: '0.74rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>✓</span>
                        <div>
                          <strong>Đã lưu Đạt ngoại quan vào CSDL.</strong> Thiết bị đủ điều kiện tiếp tục quy trình đo kiểm.
                        </div>
                      </div>
                    )}

                    {/* Defect note and camera photo */}
                    {selectedTask.inspection === 'Fail' && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginTop: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                          Mô tả lỗi ngoại quan <span>*</span>:
                        </label>
                        <textarea
                          disabled={selectedTask.submitted}
                          onChange={(e) => updateTask(selectedTask.id, (t) => ({ ...t, defectNote: e.target.value }))}
                          placeholder="Mô tả vết nứt, cong vênh, trầy xước..."
                          rows={2}
                          style={{ width: '100%', borderRadius: '8px', border: '1px solid #fca5a5', padding: '8px', fontSize: '0.78rem', boxSizing: 'border-box' }}
                          value={selectedTask.defectNote}
                        />

                        {/* Camera Photo Picker */}
                        <div style={{ marginTop: '10px' }}>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: '#ffffff',
                              border: '1.5px dashed #ef4444',
                              borderRadius: '8px',
                              padding: '10px',
                              color: '#dc2626',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              accept="image/*"
                              capture="environment"
                              disabled={selectedTask.submitted || uploadingPhotoKey === 'inspectionPhoto'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCameraCapture(file, 'inspectionPhoto');
                                e.target.value = '';
                              }}
                              style={{ display: 'none' }}
                              type="file"
                            />
                            <span>
                              📷{' '}
                              {uploadingPhotoKey === 'inspectionPhoto'
                                ? 'Đang tải ảnh lên Cloudinary...'
                                : selectedTask.inspectionPhoto || selectedTask.inspectionPhotoData
                                  ? 'Chụp / Chọn lại ảnh khác'
                                  : 'Chụp ảnh ngoại quan qua Camera *'}
                            </span>
                          </label>

                          {(selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto) && (
                            <div style={{ marginTop: '8px', textAlign: 'center', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                              <a
                                href={selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <img
                                  alt="Ảnh ngoại quan"
                                  src={selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto}
                                  style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                              </a>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>
                                  ✓ Đã lưu ảnh ngoại quan
                                </span>
                                {!selectedTask.submitted && (
                                  <button
                                    onClick={handleRemoveInspectionPhoto}
                                    style={{
                                      background: '#fee2e2',
                                      border: '1px solid #fca5a5',
                                      color: '#dc2626',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    type="button"
                                  >
                                    🗑 Xóa ảnh
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Customer Consent Details & Technician On-site Consent Box */}
                        <TechnicianInspectionConsentBox
                          disabled={selectedTask.submitted}
                          isMobile={true}
                          onSubmitConsent={handleTechnicianConsentSubmit}
                          task={selectedTask}
                        />

                        {inspectionSaveSuccess && (
                          <div
                            style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: '#ecfdf5',
                              border: '1.5px solid #10b981',
                              color: '#065f46',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textAlign: 'center',
                            }}
                          >
                            ✓ Đã lưu thành công biên bản ngoại quan (Không đạt) vào CSDL!
                          </div>
                        )}

                        <button
                          className="button button-primary"
                          disabled={selectedTask.submitted || !selectedTask.defectNote?.trim() || isSavingInspection}
                          onClick={() => handleSaveInspection(selectedTask)}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            background: inspectionSaveSuccess ? '#059669' : '#dc2626',
                            borderColor: inspectionSaveSuccess ? '#047857' : '#b91c1c',
                            padding: '10px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          type="button"
                        >
                          {isSavingInspection ? (
                            <span>Đang lưu vào CSDL...</span>
                          ) : inspectionSaveSuccess ? (
                            <span>✓ Đã lưu thành công vào CSDL!</span>
                          ) : (
                            <span>💾 Lưu kết quả ngoại quan (Không đạt) vào CSDL</span>
                          )}
                        </button>
                      </div>
                    )}

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="button button-primary"
                        disabled={!inspectionCanProceed(selectedTask)}
                        onClick={() => setActiveStepTab('steps')}
                        style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                        type="button"
                      >
                        Sang Bước 2 (Quy trình) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Các bước quy trình */}
                {activeStepTab === 'steps' && (
                  <div className="mobile-section-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>Bước 2: Quy trình ({selectedTask.service})</h3>
                      <button
                        onClick={() => setIsOscProcedureModalOpen(true)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          borderRadius: '12px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                        type="button"
                      >
                        🔬 Xem chi tiết
                      </button>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#64748b' }}>
                      {selectedTask.procedure} · {selectedTask.environment}
                    </p>

                    {/* Nhập Nhiệt độ & Độ ẩm thực tế lưu vào calibration_records */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        marginBottom: '10px',
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', fontWeight: 600, color: '#334155' }}>
                        <span>🌡️ Nhiệt độ (°C)</span>
                        <input
                          disabled={selectedTask.submitted}
                          inputMode="decimal"
                          onChange={(e) => setEnvironmentField('environment_temp', e.target.value)}
                          placeholder="VD: 23.5"
                          step="0.1"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}
                          type="number"
                          value={selectedTask.environment_temp ?? ''}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', fontWeight: 600, color: '#334155' }}>
                        <span>💧 Độ ẩm (%RH)</span>
                        <input
                          disabled={selectedTask.submitted}
                          inputMode="decimal"
                          onChange={(e) => setEnvironmentField('environment_humidity', e.target.value)}
                          placeholder="VD: 48.0"
                          step="0.1"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}
                          type="number"
                          value={selectedTask.environment_humidity ?? ''}
                        />
                      </label>
                    </div>

                    {(selectedTask.environment?.includes('30 phút') || selectedTask.service?.toLowerCase().includes('hiện sóng')) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          color: '#92400e',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          marginBottom: '10px',
                        }}
                      >
                        <span>⏱️</span>
                        <span>
                          <strong>Làm nóng 30 phút:</strong> Bật nguồn thiết bị và Fluke 5520A tối thiểu 30 phút trước khi chạy Self-Cal.
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedTask.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          style={{
                            background: step.done ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${step.done ? '#bbf7d0' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                                {idx + 1}. {step.title.replace(/^\d+\.\s*/, '')}
                              </strong>
                            </div>

                            <input
                              disabled={selectedTask.submitted}
                              onChange={(e) => setStepNote(step.id, e.target.value)}
                              placeholder="Ghi chú bước thực hiện..."
                              style={{
                                width: '100%',
                                marginTop: '6px',
                                padding: '5px 8px',
                                fontSize: '0.72rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                              }}
                              type="text"
                              value={step.note || ''}
                            />

                            {step.evidence && (
                              <div style={{ marginTop: '6px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700, cursor: 'pointer', display: 'inline-block' }}>
                                  <input
                                    accept="image/*"
                                    capture="environment"
                                    disabled={selectedTask.submitted || uploadingPhotoKey === `step-${step.id}`}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleStepEvidenceCapture(step.id, file);
                                      e.target.value = '';
                                    }}
                                    style={{ display: 'none' }}
                                    type="file"
                                  />
                                  📷{' '}
                                  {uploadingPhotoKey === `step-${step.id}`
                                    ? 'Đang tải lên Cloudinary...'
                                    : step.file || step.fileData
                                      ? 'Chụp / Chọn lại ảnh minh chứng'
                                      : 'Chụp ảnh minh chứng qua camera'}
                                </label>

                                {(step.fileData || step.file) && (
                                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {(step.fileData ||
                                      /^https?:\/\//i.test(step.file) ||
                                      step.file?.startsWith('/uploads/') ||
                                      step.file?.startsWith('data:')) && (
                                      <a href={step.fileData || step.file} rel="noreferrer" target="_blank">
                                        <img
                                          alt="Minh chứng"
                                          src={step.fileData || step.file}
                                          style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                      </a>
                                    )}
                                    <span style={{ fontSize: '0.66rem', color: '#166534', fontWeight: 600 }}>
                                      ✓ Đã đính kèm ảnh
                                    </span>
                                    {!selectedTask.submitted && (
                                      <button
                                        onClick={() => handleRemoveStepEvidence(step.id)}
                                        style={{
                                          background: '#fee2e2',
                                          border: '1px solid #fca5a5',
                                          color: '#dc2626',
                                          borderRadius: '6px',
                                          padding: '2px 7px',
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                        type="button"
                                      >
                                        🗑 Xóa ảnh
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '2px' }}>
                            <input
                              checked={step.done}
                              disabled={selectedTask.submitted}
                              onChange={() => toggleStep(step.id)}
                              style={{ width: '20px', height: '20px' }}
                              type="checkbox"
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <button
                        className="button button-secondary"
                        disabled={selectedTask.submitted || isSavingRecord}
                        onClick={() => handleSaveProcedureProgress(false)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700 }}
                        type="button"
                      >
                        {isSavingRecord ? '⏳ Đang lưu...' : '💾 Lưu tiến độ bước quy trình vào CSDL'}
                      </button>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        className="small-action"
                        onClick={() => setActiveStepTab('inspect')}
                        type="button"
                      >
                        ← Quay lại
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => setActiveStepTab('measures')}
                        style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                        type="button"
                      >
                        Sang Bước 3 (Ghi số đo) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Kết quả đo kiểm */}
                {activeStepTab === 'measures' && (
                  <div className="mobile-section-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h3 style={{ margin: 0 }}>Bước 3: Nhập số đọc đo kiểm</h3>
                      <button
                        disabled={selectedTask.submitted || isSavingRecord}
                        onClick={() => handleSaveProcedureProgress(false)}
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                        type="button"
                      >
                        {isSavingRecord ? '⏳...' : '💾 Lưu điểm đo'}
                      </button>
                    </div>
                    <p>Hệ thống tự động tính sai số (&Delta; = Giá trị đo &minus; Chuẩn đối chứng) theo ISO 17025.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedTask.measurements.map((m, idx) => {
                        const dev = getDeviation(m);
                        const hint = getVerificationHint(m);
                        return (
                          <div
                            key={m.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                                  Điểm #{idx + 1}: {m.point}
                                </strong>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                  Chuẩn: <strong>{m.reference} {m.unit}</strong> · Dung sai: {m.tolerance}
                                </div>
                              </div>
                              {dev !== null && (
                                <span
                                  style={{
                                    background: hint === 'Cần xem xét' ? '#fef2f2' : '#f0fdf4',
                                    color: hint === 'Cần xem xét' ? '#dc2626' : '#16a34a',
                                    border: `1px solid ${hint === 'Cần xem xét' ? '#fecaca' : '#bbf7d0'}`,
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                  }}
                                >
                                  Δ = {dev} {m.unit}
                                </span>
                              )}
                            </div>

                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div style={{ flex: 1, display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                                <input
                                  disabled={selectedTask.submitted}
                                  inputMode="decimal"
                                  onChange={(e) => handleMeasurementChange(m.id, e.target.value)}
                                  placeholder="0.000"
                                  step="any"
                                  style={{
                                    flex: 1,
                                    border: 'none',
                                    padding: '8px 10px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    outline: 'none',
                                  }}
                                  type="number"
                                  value={m.measured}
                                />
                                <span style={{ padding: '8px 10px', background: '#f1f5f9', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                  {m.unit}
                                </span>
                              </div>

                              {!selectedTask.submitted && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => adjustMeasurement(m.id, -0.01)}
                                    style={{ padding: '8px 10px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}
                                    type="button"
                                  >
                                    -0.01
                                  </button>
                                  <button
                                    onClick={() => adjustMeasurement(m.id, +0.01)}
                                    style={{ padding: '8px 10px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}
                                    type="button"
                                  >
                                    +0.01
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        className="small-action"
                        onClick={() => setActiveStepTab('steps')}
                        type="button"
                      >
                        ← Quy trình
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => setActiveStepTab('sign')}
                        style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                        type="button"
                      >
                        Sang Bước 4 (Ký số) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Ký số điện tử */}
                {activeStepTab === 'sign' && (
                  <div className="mobile-section-box">
                    <h3>Bước 4: Ký số điện tử biên bản đo</h3>
                    <p>Xác nhận tính chính xác của số liệu và đính kèm chứng thư số nội bộ KTV (SHA-256).</p>

                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '0.74rem',
                        color: '#334155',
                        lineHeight: 1.6,
                        marginBottom: '16px',
                      }}
                    >
                      <div>• <strong>Kỹ thuật viên:</strong> {technicianName} ({technicianIdStr})</div>
                      <div>• <strong>Thiết bị:</strong> {selectedTask.device} ({selectedTask.model})</div>
                      <div>• <strong>Tiến độ:</strong> {selectedTask.steps.filter((s) => s.done).length}/{selectedTask.steps.length} bước · {selectedTask.measurements.filter((m) => m.measured !== '').length}/{selectedTask.measurements.length} điểm đo</div>
                      <div>
                        • <strong>Trạng thái mạng:</strong>{' '}
                        <span style={{ color: effectiveOnline ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                          {effectiveOnline ? 'Online (Đồng bộ ngay lên Web)' : 'Offline (Lưu trữ ngoại tuyến trên App)'}
                        </span>
                      </div>
                    </div>

                    <button
                      className="button button-primary mobile-sync-cta"
                      disabled={selectedTask.submitted || !isTaskReady(selectedTask)}
                      onClick={handleDigitalSign}
                      type="button"
                    >
                      {selectedTask.submitted ? '✓ ĐÃ KÝ SỐ VÀ TRÌNH PHÊ DUYỆT' : '✍ MỞ KHUNG KÝ SỐ ĐIỆN TỬ & HOÀN TẤT'}
                    </button>

                    <TechnicianSignedDetailsCard
                      currentUserName={technicianName}
                      effectiveOnline={effectiveOnline}
                      task={selectedTask}
                    />
                  </div>
                )}

                <TechnicianDigitalSignatureModal
                  effectiveOnline={effectiveOnline}
                  isSubmitting={isSavingRecord}
                  onClose={() => setMobileSignModalOpen(false)}
                  onConfirmSign={confirmMobileDigitalSign}
                  open={mobileSignModalOpen && Boolean(selectedTask)}
                  signerName={technicianName}
                  task={selectedTask}
                />
              </div>
            )}

            {/* ─── TAB 3: TRUNG TÂM ĐỒNG BỘ HAI CHIỀU WEB ⇄ MOBILE ─── */}
            {activeTab === 'sync' && (
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                  Đồng bộ Web ⇄ Mobile
                </h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 14px' }}>
                  Dữ liệu được lưu trữ ngoại tuyến trên điện thoại và tự động đẩy lên Web khi có mạng.
                </p>

                {/* Status Grid */}
                <div className="sync-stat-grid">
                  <div className="sync-stat-card">
                    <small>KẾT NỐI MẠNG</small>
                    <strong style={{ color: effectiveOnline ? '#16a34a' : '#d97706' }}>
                      {effectiveOnline ? '● Trực tuyến' : '● Ngoại tuyến'}
                    </strong>
                  </div>

                  <div className="sync-stat-card">
                    <small>CHỜ GỬI LÊN WEB</small>
                    <strong style={{ color: pendingCount > 0 ? '#ef4444' : '#1e293b' }}>
                      {pendingCount} bản ghi
                    </strong>
                  </div>
                </div>

                {/* Primary Sync Button */}
                <button
                  className="mobile-sync-cta"
                  disabled={!effectiveOnline || isSyncing}
                  onClick={handleSyncWithWeb}
                  type="button"
                >
                  <span>{isSyncing ? 'Đang gửi...' : '⟳'}</span>
                  <span>{isSyncing ? 'ĐANG ĐỒNG BỘ VỚI HỆ THỐNG WEB...' : 'ĐỒNG BỘ NGAY LÊN HỆ THỐNG WEB'}</span>
                </button>

                {/* Last Sync Info */}
                <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center', margin: '10px 0 16px' }}>
                  Đồng bộ lần cuối: {lastSyncedTime}
                </div>

                {/* Simulated Offline Toggle */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                      Mô phỏng mất mạng (Field Test Mode)
                    </strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#64748b' }}>
                      Bật để thử nghiệm nhập liệu khi ở phòng kín không có sóng
                    </p>
                  </div>
                  <input
                    checked={simulatedOffline}
                    onChange={(e) => setSimulatedOffline(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    type="checkbox"
                  />
                </div>

                {/* PWA Home Screen Installation */}
                {installPrompt && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.78rem', color: '#1e40af' }}>
                        Cài đặt App lên màn hình chính
                      </strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#3b82f6' }}>
                        Mở ứng dụng độc lập như app native từ Home Screen
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        installPrompt.prompt();
                        installPrompt.userChoice.then(() => setInstallPrompt(null));
                      }}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      Cài đặt
                    </button>
                  </div>
                )}

                {/* Sync Actions Queue */}
                <div style={{ marginTop: '14px' }}>
                  <strong style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                    Nhật ký thao tác cục bộ gần đây ({syncQueue.length}):
                  </strong>
                  <div className="sync-queue-list">
                    {syncQueue.map((item) => (
                      <div className="sync-queue-item" key={item.id}>
                        <div>
                          <strong>{item.type}</strong> · Nhiệm vụ: {item.taskId}
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{item.time}</span>
                      </div>
                    ))}

                    {syncQueue.length === 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                        Hàng đợi trống. Tất cả dữ liệu đã được đồng bộ khớp với Web.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: TÀI KHOẢN & ĐĂNG NHẬP NGOẠI TUYẾN (PROFILE) ── */}
            {activeTab === 'profile' && (
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 14px', color: '#0f172a' }}>
                  Tài khoản Kỹ thuật viên
                </h2>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '16px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div className="mobile-avatar-circle" style={{ width: '48px', height: '48px' }}>
                    {technicianInitials}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                      {technicianName}
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Email: {currentUser?.email || 'N/A'} · Mã: {technicianIdStr}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                      ● Đang đăng nhập (Lưu trữ ngoại tuyến an toàn)
                    </div>
                  </div>
                </div>

                {/* Offline Backup & PIN */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                    Sao lưu & Dữ liệu dự phòng:
                  </strong>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 10px' }}>
                    Xuất toàn bộ biên bản kiểm định, số đo và ảnh minh chứng lưu trên máy ra file JSON dự phòng.
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const dataStr = JSON.stringify(tasks, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `isocal_offline_backup_${Date.now()}.json`;
                        a.click();
                        setToastMessage('✓ Đã xuất tệp dữ liệu dự phòng JSON!');
                      }}
                      style={{
                        flex: 1,
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      📁 Xuất file JSON dự phòng
                    </button>
                  </div>
                </div>

                {/* Switch to Web Dashboard Link */}
                <button
                  onClick={() => navigate('/internal/technician')}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: '10px',
                  }}
                  type="button"
                >
                  Chuyển sang Giao diện Web Desktop ↗
                </button>

                {/* Logout / Switch Account Button */}
                <button
                  onClick={handleMobileLogout}
                  style={{
                    width: '100%',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1.5px solid #fecaca',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  type="button"
                >
                  → Đăng xuất / Đổi tài khoản khác
                </button>
              </div>
            )}
          </main>
        )}

        {/* ─── Bottom Navigation Bar (Shown when logged in) ─────────── */}
        {currentUser && (
          <nav className="mobile-bottom-nav">
            <button
              className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
              type="button"
            >
              <span className="mobile-nav-icon">📋</span>
              <span className="mobile-nav-label">Nhiệm vụ</span>
              {pendingCount > 0 && <span className="mobile-nav-badge">{pendingCount}</span>}
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'calibrate' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('calibrate');
                setActiveStepTab('inspect');
              }}
              type="button"
            >
              <span className="mobile-nav-icon">🔬</span>
              <span className="mobile-nav-label">Đo kiểm</span>
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'sync' ? 'active' : ''}`}
              onClick={() => setActiveTab('sync')}
              type="button"
            >
              <span className="mobile-nav-icon">⚡</span>
              <span className="mobile-nav-label">Đồng bộ</span>
              {pendingCount > 0 && <span className="mobile-nav-badge">{pendingCount}</span>}
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
              type="button"
            >
              <span className="mobile-nav-icon">👤</span>
              <span className="mobile-nav-label">KTV</span>
            </button>
          </nav>
        )}

        {/* ─── Modal Quy trình kỹ thuật Hiệu chuẩn Máy hiện sóng (6 bước) ─── */}
        <OscilloscopeProcedureModal
          isOpen={isOscProcedureModalOpen}
          onClose={() => setIsOscProcedureModalOpen(false)}
          onApplyToWorkbench={handleApplyOscilloscopeTask}
        />
      </div>
    </div>
  );
}

export default MobileTechnicianApp;
