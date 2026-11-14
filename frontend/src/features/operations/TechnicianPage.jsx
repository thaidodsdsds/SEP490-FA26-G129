import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../app/providers.jsx';
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
import OscilloscopeProcedureModal from './OscilloscopeProcedureModal.jsx';
import { createOscilloscopeSampleTask } from './oscilloscopeProcedureData.js';
import {
  TechnicianDigitalSignatureModal,
  TechnicianSignedDetailsCard,
} from './TechnicianDigitalSignatureModal.jsx';
import TechnicianInspectionConsentBox from './TechnicianInspectionConsentBox.jsx';
import './operations.css';

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

function TechnicianPage() {
  const { session } = useAppContext();
  const currentUserId = session?.user?.id || 'guest';
  const currentUserName = session?.user?.full_name || session?.user?.name || 'Kỹ thuật viên ISOCAL';

  const tasksCacheKey = getTasksCacheKey(currentUserId);
  const queueCacheKey = getQueueCacheKey(currentUserId);
  const lastSyncCacheKey = getLastSyncCacheKey(currentUserId);

  // ─── Network & Offline States ─────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const effectiveOnline = isOnline && !simulatedOffline;

  const [syncQueue, setSyncQueue] = useState(() => {
    try {
      const cached = localStorage.getItem(queueCacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [lastSynced, setLastSynced] = useState(() => {
    return localStorage.getItem(lastSyncCacheKey) || null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);

  // ─── Mobile View State ────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  );
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Online / Offline Event Listeners ─────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Tasks State with LocalStorage Caching ───────────────────────────
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem(tasksCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t) => t.id !== 'task-osc-sample-01');
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc cache nhiệm vụ ngoại tuyến:', err);
    }
    return [];
  });

  const [selectedId, setSelectedId] = useState(() => tasks[0]?.id || '');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [isOscProcedureModalOpen, setIsOscProcedureModalOpen] = useState(false);

  // Reload user-scoped cache when logged-in user changes
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
  }, [tasksCacheKey]);

  // Persist tasks whenever changed
  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(tasksCacheKey, JSON.stringify(newTasks));
    } catch (err) {
      console.warn('Lỗi lưu cache nhiệm vụ:', err);
    }
  };

  // Record an offline action to queue
  const enqueueAction = (action) => {
    setSyncQueue((prev) => {
      const updated = [...prev, action];
      try {
        localStorage.setItem(queueCacheKey, JSON.stringify(updated));
      } catch (err) {
        console.warn('Lỗi lưu hàng đợi đồng bộ:', err);
      }
      return updated;
    });
  };

  // ─── Fetch remote tasks when online ───────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchRemote = async () => {
      if (!effectiveOnline) return;
      try {
        const remoteTasks = await getTechnicianTasksApi();
        if (isMounted && Array.isArray(remoteTasks)) {
          setTasks((currentLocal) => {
            // Merge remote tasks with local tasks preserving offline-modified ones for the same task id
            const localMap = new Map(currentLocal.map((t) => [t.id, t]));
            const merged = remoteTasks.map((rt) => {
              const local = localMap.get(rt.id);
              if (local && local.pendingSync) {
                return {
                  ...rt,
                  ...local,
                  service_request_item_id: rt.service_request_item_id,
                  assignment_id: rt.assignment_id,
                  service_type_id: rt.service_type_id,
                  procedure_id: rt.procedure_id,
                  steps: (local.steps?.length ? local.steps : rt.steps || []).map((ls, idx) => ({
                    ...(rt.steps?.[idx] || {}),
                    ...ls,
                    procedure_step_id: ls.procedure_step_id || rt.steps?.[idx]?.procedure_step_id,
                    step_no: ls.step_no || rt.steps?.[idx]?.step_no || idx + 1,
                  })),
                  measurements: (local.measurements?.length ? local.measurements : rt.measurements || []).map((lm, idx) => ({
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
                steps: rt.steps?.length ? rt.steps : local?.steps || [],
                measurements: rt.measurements?.length ? rt.measurements : local?.measurements || [],
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
      } catch (err) {
        // Silent catch: network error means offline mode continues smoothly
        console.info('Không thể tải từ máy chủ, tiếp tục sử dụng dữ liệu ngoại tuyến trên thiết bị.', err);
      }
    };

    fetchRemote();
    return () => {
      isMounted = false;
    };
  }, [effectiveOnline, tasksCacheKey]);

  // ─── Task Mutation Helpers ───────────────────────────────────────────
  const updateTask = (taskId, updater) => {
    setTasks((current) => {
      const updated = current.map((t) => {
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
        localStorage.setItem(tasksCacheKey, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    if (!effectiveOnline) {
      enqueueAction({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        taskId,
        type: 'UPDATE_TASK',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const toggleStep = (stepId) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((step) => {
        if (step.id === stepId) {
          const nextDone = !step.done;
          return {
            ...step,
            done: nextDone,
            status: nextDone ? 'Done' : 'Pending',
          };
        }
        return step;
      }),
    }));
  };

  const [uploadingPhotoKey, setUploadingPhotoKey] = useState('');

  const handleEvidencePhotoUpload = async (stepId, file) => {
    if (!selectedTask || !file) return;
    setUploadingPhotoKey(`step-${stepId}`);
    try {
      const base64 = await readFileAsDataUrl(file);
      let finalUrl = base64;
      let publicId = '';

      if (effectiveOnline) {
        try {
          setNotice('☁️ Đang tải ảnh minh chứng lên Cloudinary...');
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
          // Fallback to base64 if upload fails
        }
      }

      updateTask(selectedTask.id, (task) => ({
        ...task,
        steps: task.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                file: finalUrl,
                fileName: file.name,
                fileData: finalUrl,
                publicId,
                done: true,
              }
            : step,
        ),
      }));
      setNotice('✓ Đã tải ảnh minh chứng cho bước quy trình lên Cloudinary.');
    } catch {
      setNotice('Lỗi khi đọc tệp ảnh minh chứng.');
    } finally {
      setUploadingPhotoKey('');
    }
  };

  const handleRemoveEvidencePhoto = async (stepId) => {
    if (!selectedTask) return;
    const targetStep = selectedTask.steps.find((s) => s.id === stepId);
    const oldUrl = targetStep?.fileData || targetStep?.file || '';
    const oldPublicId = targetStep?.publicId || '';

    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((step) =>
        step.id === stepId
          ? { ...step, file: '', fileName: '', fileData: '', publicId: '' }
          : step,
      ),
    }));

    if (effectiveOnline && (oldPublicId || /^https?:\/\//i.test(oldUrl) || oldUrl.startsWith('/uploads/'))) {
      try {
        await deleteFileFromCloudApi({ public_id: oldPublicId, url: oldUrl });
      } catch {
        // ignore delete error
      }
    }
    setNotice('🗑 Đã xóa ảnh minh chứng của bước quy trình.');
  };

  const handleInspectionPhotoUpload = async (file) => {
    if (!selectedTask || !file) return;
    setUploadingPhotoKey('inspection');
    try {
      const base64 = await readFileAsDataUrl(file);
      let finalUrl = base64;
      let publicId = '';

      if (effectiveOnline) {
        try {
          setNotice('☁️ Đang tải ảnh kiểm tra ngoại quan lên Cloudinary...');
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
          // Fallback to base64
        }
      }

      const updated = {
        ...selectedTask,
        inspectionPhoto: finalUrl,
        inspectionPhotoName: file.name,
        inspectionPhotoData: finalUrl,
        inspectionPhotoPublicId: publicId,
      };
      updateTask(selectedTask.id, () => updated);
      setNotice('✓ Đã tải ảnh ngoại quan thiết bị lên hệ thống.');
      if (updated.inspection === 'Pass' || (updated.inspection === 'Fail' && updated.defectNote?.trim())) {
        handleSaveInspection(updated);
      }
    } catch {
      setNotice('Lỗi khi đọc ảnh chụp ngoại quan.');
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
        // ignore delete error
      }
    }
    setNotice('🗑 Đã xóa ảnh chụp ngoại quan đã chọn.');
  };

  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [inspectionSaveSuccess, setInspectionSaveSuccess] = useState(false);

  const handleSaveInspection = async (taskToSave = selectedTask) => {
    if (!taskToSave || !taskToSave.inspection) return;
    if (taskToSave.inspection === 'Fail' && !taskToSave.defectNote?.trim()) {
      setNotice('⚠️ Vui lòng nhập mô tả chi tiết lỗi ngoại quan khi đánh giá Không đạt.');
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
        const msg = `✓ Đã lưu kết quả ngoại quan (${taskToSave.inspection === 'Pass' ? 'Đạt' : 'Không đạt'}) vào CSDL hệ thống thành công!`;
        setNotice(msg);
        setInspectionSaveSuccess(true);
        setTimeout(() => setInspectionSaveSuccess(false), 5000);
      } catch (err) {
        setNotice(err?.response?.data?.error?.message || 'Lỗi khi lưu kết quả ngoại quan lên máy chủ.');
      } finally {
        setIsSavingInspection(false);
      }
    } else {
      setNotice('📶 Đã lưu ngoại tuyến kết quả ngoại quan. Sẽ tự động gửi khi có mạng.');
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
        setNotice('✓ Đã ghi nhận văn bản đồng ý của khách hàng & mở khóa bước hiệu chuẩn.');
      } catch (err) {
        setNotice(err?.response?.data?.error?.message || 'Lỗi khi lưu xác nhận lên máy chủ.');
      }
    } else {
      setNotice('📶 Đã lưu ngoại tuyến xác nhận của khách hàng. Sẽ đồng bộ khi có mạng.');
    }
  };

  const handleApplyOscilloscopeTask = () => {
    if (!selectedTask) {
      setNotice('⚠️ Vui lòng chọn một thiết bị được phân công để áp dụng quy trình máy hiện sóng.');
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
    setNotice(`✓ Đã áp dụng quy trình chuẩn máy hiện sóng (6 bước) vào thiết bị "${selectedTask.device}".`);
  };

  const setEnvironmentField = (field, value) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      [field]: value,
    }));
  };

  const setStepNote = (stepId, noteValue) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      steps: task.steps.map((s) => (s.id === stepId ? { ...s, note: noteValue } : s)),
    }));
  };

  const setMeasurement = (measurementId, value) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      measurements: task.measurements.map((m) =>
        m.id === measurementId ? { ...m, measured: value } : m,
      ),
    }));
  };

  const setMeasurementUncertainty = (measurementId, value) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, (task) => ({
      ...task,
      measurements: task.measurements.map((m) =>
        m.id === measurementId ? { ...m, uncertainty: value } : m,
      ),
    }));
  };

  const adjustMeasurement = (measurementId, delta) => {
    if (!selectedTask) return;
    const item = selectedTask.measurements.find((m) => m.id === measurementId);
    if (!item) return;
    const currentVal = item.measured === '' ? Number(item.reference) || 0 : Number(item.measured);
    const newVal = (currentVal + delta).toFixed(3);
    setMeasurement(measurementId, newVal);
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
      setNotice('📶 Đã lưu tiến độ quy trình kỹ thuật vào bộ nhớ ngoại tuyến trên thiết bị.');
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
        signer_name: targetTask.signedBy || currentUserName || null,
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
              signedBy: sig?.signer_name || t.signedBy || currentUserName,
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

      setNotice(
        submitFinal
          ? '✓ Đã ký số điện tử (SHA-256) và lưu toàn bộ biên bản vào CSDL thành công!'
          : '✓ Đã lưu tiến độ thực hiện quy trình kỹ thuật và kết quả điểm đo vào hệ thống.',
      );
    } catch (err) {
      setNotice(
        err?.response?.data?.error?.message ||
          'Không thể lưu trực tiếp lên máy chủ, dữ liệu đã được giữ an toàn trên máy.',
      );
    } finally {
      setIsSavingRecord(false);
    }
  };

  // ─── Manual / Automatic Sync Engine ──────────────────────────────────
  const handleSyncNow = async () => {
    if (!effectiveOnline) {
      setNotice('Không thể đồng bộ khi đang ngoại tuyến. Vui lòng kết nối mạng!');
      return;
    }
    setIsSyncing(true);
    try {
      const pendingTasks = tasks.filter((t) => t.pendingSync);
      await syncTechnicianTasksApi({
        tasks: pendingTasks.length > 0 ? pendingTasks : tasks,
        queue: syncQueue,
      });

      // Clear pendingSync status
      const syncedTasks = tasks.map((t) => ({ ...t, pendingSync: false }));
      saveTasks(syncedTasks);

      setSyncQueue([]);
      try {
        localStorage.removeItem(queueCacheKey);
      } catch (e) {
        console.warn(e);
      }

      const syncTime = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      setLastSynced(syncTime);
      localStorage.setItem(lastSyncCacheKey, syncTime);

      setNotice('Đồng bộ dữ liệu thành công lên máy chủ ISOCAL.');
    } catch (err) {
      setNotice(err?.response?.data?.error?.message || 'Đồng bộ thất bại. Dữ liệu vẫn được lưu an toàn trên máy.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Digital Signature & Submit ───────────────────────────────────────
  const handleSignAndSubmit = () => {
    if (!selectedTask || !isTaskReady(selectedTask)) {
      setNotice('Vui lòng hoàn tất kiểm tra ngoại quan, các bước quy trình và nhập đủ số liệu trước khi ký.');
      return;
    }
    setSignModalOpen(true);
  };

  const confirmDigitalSignature = async (signData = {}) => {
    if (!selectedTask) return;
    const nowIso = new Date().toISOString();
    const updatedTask = {
      ...selectedTask,
      signed: true,
      submitted: true,
      signedAt: nowIso,
      signedBy: signData.signerName || currentUserName,
      signatureHash: signData.previewHash || `SHA256:${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      signatureImage: signData.signatureImage || '',
      signatureNote: signData.signatureNote || '',
    };
    updateTask(selectedTask.id, () => updatedTask);

    if (effectiveOnline) {
      await handleSaveProcedureProgress(true, updatedTask);
      setSignModalOpen(false);
    } else {
      setSignModalOpen(false);
      setNotice('✓ Đã ký số điện tử và lưu trữ ngoại tuyến trên thiết bị. Hồ sơ sẽ tự động gửi khi có mạng.');
    }
  };

  // ─── Filtered Tasks List ─────────────────────────────────────────────
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
        (filter === 'in-progress' && !task.submitted && task.inspection) ||
        (filter === 'new' && !task.submitted && !task.inspection) ||
        (filter === 'submitted' && task.submitted) ||
        (filter === 'pending-sync' && task.pendingSync);

      return matchSearch && matchFilter;
    });
  }, [filter, search, tasks]);

  const selectedTask = tasks.find((t) => t.id === selectedId) || visibleTasks[0] || tasks[0];
  const completedCount = tasks.filter((t) => t.submitted).length;
  const activeCount = tasks.filter((t) => !t.submitted && t.inspection).length;
  const pendingSyncCount = tasks.filter((t) => t.pendingSync).length;

  return (
    <div className={`operations-page technician-page ${isMobile ? 'technician-mobile-view' : ''}`}>
      {/* ─── Top Header & Offline Connectivity Bar ─────────────────── */}
      <div className="operations-heading technician-header-row">
        <div>
          <p className="eyebrow">KHU VỰC KỸ THUẬT VIÊN HIỆN TRƯỜNG & LAB</p>
          <h1>Công việc của tôi</h1>
          <p className="operations-subtitle">
            Hỗ trợ ghi kết quả đo, chụp ảnh ngoại quan và ký số hồ sơ ngay cả khi mất mạng (Offline).
          </p>
        </div>

        {/* Connectivity Pill & Offline Manager Button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`technician-connection-pill ${effectiveOnline ? 'online' : 'offline'}`}
            onClick={() => setOfflineModalOpen(true)}
            title="Bấm để kiểm tra trạng thái lưu trữ ngoại tuyến và đồng bộ dữ liệu"
            type="button"
          >
            <span className="connection-dot" />
            <span className="connection-label">
              {effectiveOnline ? 'Trực tuyến (Online)' : 'Ngoại tuyến (Offline)'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="pending-badge">{pendingSyncCount} chờ gửi</span>
            )}
          </button>

          {effectiveOnline && pendingSyncCount > 0 && (
            <button
              className="technician-sync-quick-btn"
              disabled={isSyncing}
              onClick={handleSyncNow}
              title="Đồng bộ các thay đổi chưa gửi lên hệ thống"
              type="button"
            >
              {isSyncing ? 'Đang gửi...' : `Đồng bộ (${pendingSyncCount}) ⟳`}
            </button>
          )}

          <button
            className="small-action"
            onClick={() => window.open('/mobile/technician', '_blank')}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
            }}
            title="Mở giao diện ứng dụng trên điện thoại di động"
            type="button"
          >
            <span>📱</span> Mở App Di động ↗
          </button>

          <button
            className="small-action"
            onClick={() => setInstallGuideOpen(true)}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
            title="Xem mã QR và hướng dẫn cài đặt lên điện thoại"
            type="button"
          >
            <span>📥</span> Cài đặt lên điện thoại
          </button>

          <button
            className="small-action"
            onClick={() => setIsOscProcedureModalOpen(true)}
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
            }}
            title="Xem chi tiết Đặc tả Quy trình Kỹ thuật Hiệu chuẩn Máy hiện sóng (6 bước)"
            type="button"
          >
            <span>🔬</span> Quy trình Máy hiện sóng (6 bước)
          </button>
        </div>
      </div>

      {/* ─── Offline Banner Indicator ──────────────────────────────── */}
      {!effectiveOnline && (
        <div className="technician-offline-banner">
          <div className="offline-banner-content">
            <span className="offline-banner-icon" aria-hidden="true">
              📶
            </span>
            <div>
              <strong>Chế độ làm việc ngoại tuyến (Offline Mode) đang hoạt động</strong>
              <p>
                Mọi kết quả kiểm tra, số đo, ảnh chụp từ camera và chữ ký số được lưu an toàn trực tiếp trên điện thoại.
                Khi kết nối mạng trở lại, hệ thống sẽ tự động đồng bộ lên máy chủ.
              </p>
            </div>
          </div>
          <button
            className="small-action"
            onClick={() => setOfflineModalOpen(true)}
            style={{ whiteSpace: 'nowrap', alignSelf: 'center' }}
            type="button"
          >
            Xem bộ nhớ ({pendingSyncCount})
          </button>
        </div>
      )}

      {/* ─── Stats KPI Bar ─────────────────────────────────────────── */}
      <div className="operations-stats technician-stats">
        <article className="stat-card">
          <span className="stat-icon blue" aria-hidden="true">
            ▤
          </span>
          <div>
            <span>Được phân công</span>
            <strong>{tasks.length}</strong>
          </div>
          <small>Thiết bị cần thực hiện</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon amber" aria-hidden="true">
            ◷
          </span>
          <div>
            <span>Đang thực hiện</span>
            <strong>{activeCount}</strong>
          </div>
          <small>Đang đo tại Lab / Hiện trường</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon green" aria-hidden="true">
            ✓
          </span>
          <div>
            <span>Đã trình Review</span>
            <strong>{completedCount}</strong>
          </div>
          <small>Đã ký số & chuyển soát xét</small>
        </article>
      </div>

      {/* ─── Main Technician Workspace ─────────────────────────────── */}
      <div className={`technician-workspace ${isMobile ? 'mobile-active' : ''}`}>
        {/* ─── Left/List Panel: Task List ─────────────────────────── */}
        {(!isMobile || mobileView === 'list') && (
          <aside className="task-panel">
            <div className="task-panel-heading">
              <div>
                <h2>Danh sách nhiệm vụ</h2>
                <p>
                  {visibleTasks.length} thiết bị · {effectiveOnline ? 'Đồng bộ máy chủ' : 'Lưu trữ ngoại tuyến'}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <label className="search-field task-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Tìm trong lịch công việc"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm thiết bị, model, serial..."
                value={search}
              />
            </label>

            {/* Filter Pills */}
            <div className="task-filters">
              {[
                ['all', 'Tất cả'],
                ['new', 'Mới'],
                ['in-progress', 'Đang làm'],
                ['submitted', 'Đã xong'],
                ['pending-sync', `Chờ gửi (${pendingSyncCount})`],
              ].map(([value, label]) => (
                <button
                  aria-pressed={filter === value}
                  className={`task-filter${filter === value ? ' active' : ''}`}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Task Item Cards */}
            <div className="task-list">
              {visibleTasks.map((task) => (
                <button
                  aria-current={selectedId === task.id ? 'true' : undefined}
                  className={`task-list-item${selectedId === task.id ? ' current' : ''}`}
                  key={task.id}
                  onClick={() => {
                    setSelectedId(task.id);
                    setNotice('');
                    if (isMobile) setMobileView('detail');
                  }}
                  type="button"
                >
                  <span className="task-device-icon" aria-hidden="true">
                    ⌁
                  </span>
                  <span className="task-list-copy">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong>{task.device}</strong>
                      {task.pendingSync && (
                        <span className="task-offline-tag" title="Chưa đồng bộ lên máy chủ">
                          ⚡ Offline
                        </span>
                      )}
                    </div>
                    <small>{task.model} · SN: {task.serial}</small>
                    <small style={{ color: '#0284c7', fontWeight: 600 }}>{task.customer}</small>
                    <small>{task.scheduled} · {task.location}</small>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
                      <span
                        className={`status-badge ${task.submitted
                            ? 'status-submitted'
                            : task.inspection
                              ? 'status-progress'
                              : 'status-new'
                          }`}
                      >
                        {task.submitted
                          ? 'Đã trình Review'
                          : task.inspection
                            ? 'Đang đo kiểm'
                            : 'Chưa bắt đầu'}
                      </span>
                      {isMobile && <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>→</span>}
                    </div>
                  </span>
                </button>
              ))}

              {!visibleTasks.length && (
                <div className="task-empty">
                  <strong>Không có công việc nào</strong>
                  <span>Thử thay đổi từ khóa hoặc bộ lọc nhiệm vụ.</span>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ─── Right/Detail Panel: Calibration & Measurement ─────── */}
        {(!isMobile || mobileView === 'detail') && (
          selectedTask ? (
            <section aria-label="Chi tiết công việc" className="task-detail">
              {/* Mobile Back Button Bar */}
              {isMobile && (
                <div className="mobile-detail-top-nav">
                  <button
                    className="mobile-back-btn"
                    onClick={() => setMobileView('list')}
                    type="button"
                  >
                    ← Lịch công việc
                  </button>
                  <span className="mobile-task-title-small">
                    {selectedTask.workOrder} · {selectedTask.device}
                  </span>
                  <span className={`mobile-status-pill ${effectiveOnline ? 'on' : 'off'}`}>
                    {effectiveOnline ? '● Online' : '● Offline'}
                  </span>
                </div>
              )}

              {/* Task Detail Header */}
              <div className="task-detail-heading">
                <div>
                  <div className="detail-meta">
                    <span>{selectedTask.workOrder}</span>
                    <i>·</i>
                    <span>{selectedTask.scheduled}</span>
                    {selectedTask.pendingSync && (
                      <span className="offline-badge-pill">Lưu ngoại tuyến</span>
                    )}
                  </div>
                  <h2>{selectedTask.device}</h2>
                  <p>{selectedTask.customer}</p>
                </div>
                <span
                  className={`status-badge detail-status ${selectedTask.submitted
                      ? 'status-submitted'
                      : selectedTask.inspection
                        ? 'status-progress'
                        : 'status-new'
                    }`}
                >
                  {selectedTask.submitted
                    ? 'Đã trình duyệt'
                    : selectedTask.inspection
                      ? 'Đang thực hiện'
                      : 'Chưa bắt đầu'}
                </span>
              </div>

              {/* Device Summary Cards */}
              <div className="device-summary">
                <div>
                  <span>Model thiết bị</span>
                  <strong>{selectedTask.model}</strong>
                  <small>Serial: {selectedTask.serial}</small>
                </div>
                <div>
                  <span>Dịch vụ & Hình thức</span>
                  <strong>{selectedTask.kind}</strong>
                  <small>{selectedTask.service}</small>
                </div>
                <div>
                  <span>Địa điểm & Chuẩn đối chứng</span>
                  <strong>{selectedTask.location}</strong>
                  <small>Chuẩn: {selectedTask.master_standard || 'Phòng Lab'}</small>
                </div>
              </div>

              {/* Feedback Alert Notice */}
              {notice && (
                <div
                  className={`task-notice${selectedTask.submitted ? ' success' : ''}`}
                  role={selectedTask.submitted ? 'status' : 'alert'}
                >
                  <span aria-hidden="true">{selectedTask.submitted ? '✓' : 'ℹ'}</span>
                  {notice}
                </div>
              )}

              {/* ─── SECTION 1: Kiểm tra ngoại quan & Cổng ban đầu ─ */}
              <section className="workflow-section">
                <div className="section-title">
                  <span
                    className={`workflow-number ${selectedTask.inspection ? 'step-complete' : ''
                      }`}
                  >
                    1
                  </span>
                  <div>
                    <h3>Kiểm tra ban đầu & Ngoại quan</h3>
                    <p>Điều kiện tiên quyết trước khi thực hiện đo kiểm</p>
                  </div>
                  {selectedTask.inspection && (
                    <span
                      className={`status-badge ${selectedTask.inspection === 'Pass'
                          ? 'status-submitted'
                          : 'status-progress'
                        }`}
                    >
                      {selectedTask.inspection === 'Pass' ? 'Đạt ngoại quan' : 'Không đạt'}
                    </span>
                  )}
                </div>

                <p className="inspection-prompt">
                  Xác nhận tình trạng thiết bị không bị nứt vỡ, tem kiểm định còn nguyên vẹn và các phím chức năng hoạt động bình thường.
                </p>

                {/* Pass / Fail Buttons */}
                <div className="inspection-options" role="group" aria-label="Kết quả kiểm tra ban đầu">
                  <button
                    aria-pressed={selectedTask.inspection === 'Pass'}
                    className={`inspection-option${selectedTask.inspection === 'Pass' ? ' chosen pass' : ''}`}
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
                    <span className="option-check">✓</span>
                    <span>
                      <strong>Đạt yêu cầu</strong>
                      <small>Thiết bị hoàn hảo, đủ điều kiện đo</small>
                    </span>
                  </button>

                  <button
                    aria-pressed={selectedTask.inspection === 'Fail'}
                    className={`inspection-option${selectedTask.inspection === 'Fail' ? ' chosen fail' : ''}`}
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
                    <span className="option-check">!</span>
                    <span>
                      <strong>Có lỗi / Không đạt</strong>
                      <small>Cần chụp ảnh, ghi lỗi và xác nhận KH</small>
                    </span>
                  </button>
                </div>

                {selectedTask.inspection === 'Pass' && (
                  <div
                    style={{
                      marginTop: '12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#166534',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>✓</span>
                    <div>
                      <strong>Đã ghi nhận Đạt ngoại quan vào CSDL.</strong> Thiết bị đủ điều kiện thực hiện các bước quy trình & đo kiểm bên dưới.
                    </div>
                  </div>
                )}

                {/* Defect note & Photo attachment if Fail */}
                {selectedTask.inspection === 'Fail' && (
                  <div className="consent-box">
                    <p>
                      Ghi nhận lỗi và ảnh chụp tình trạng. Chỉ tiếp tục đo kiểm khi khách hàng có văn bản đồng ý.
                    </p>
                    <label className="defect-note-label" htmlFor={`defect-note-${selectedTask.id}`}>
                      Mô tả chi tiết lỗi ngoại quan <span>*</span>
                    </label>
                    <textarea
                      disabled={selectedTask.submitted}
                      id={`defect-note-${selectedTask.id}`}
                      onChange={(event) =>
                        updateTask(selectedTask.id, (task) => ({
                          ...task,
                          defectNote: event.target.value,
                        }))
                      }
                      placeholder="Mô tả vết nứt, cong vênh, đứt dây cáp nguồn..."
                      rows="2"
                      value={selectedTask.defectNote}
                    />

                    {/* Camera Photo Upload */}
                    <div style={{ marginTop: '10px' }}>
                      <label className="file-picker inspection-file-picker">
                        <input
                          accept="image/*"
                          capture="environment"
                          disabled={selectedTask.submitted || uploadingPhotoKey === 'inspection'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleInspectionPhotoUpload(file);
                            e.target.value = '';
                          }}
                          type="file"
                        />
                        <span aria-hidden="true">📷</span>
                        {uploadingPhotoKey === 'inspection'
                          ? '⏳ Đang tải ảnh lên Cloudinary...'
                          : selectedTask.inspectionPhoto || selectedTask.inspectionPhotoData
                            ? 'Chụp / Chọn lại ảnh khác'
                            : 'Chụp ảnh ngoại quan qua Camera *'}
                      </label>

                      {(selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto) && (
                        <div className="photo-preview-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {(selectedTask.inspectionPhotoData ||
                              /^https?:\/\//i.test(selectedTask.inspectionPhoto) ||
                              selectedTask.inspectionPhoto?.startsWith('/uploads/') ||
                              selectedTask.inspectionPhoto?.startsWith('data:')) ? (
                              <a
                                href={selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto}
                                rel="noreferrer"
                                target="_blank"
                                title="Bấm để mở xem ảnh kích thước đầy đủ"
                              >
                                <img
                                  alt="Ảnh ngoại quan"
                                  className="photo-thumbnail"
                                  src={selectedTask.inspectionPhotoData || selectedTask.inspectionPhoto}
                                />
                              </a>
                            ) : (
                              <span className="file-name">{selectedTask.inspectionPhoto}</span>
                            )}
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>
                                ✓ Đã đính kèm ảnh ngoại quan
                              </div>
                              <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                                Bấm vào ảnh để xem rõ hơn
                              </div>
                            </div>
                          </div>

                          {!selectedTask.submitted && (
                            <button
                              onClick={handleRemoveInspectionPhoto}
                              style={{
                                background: '#fee2e2',
                                border: '1px solid #fca5a5',
                                color: '#dc2626',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Xóa ảnh đã chọn"
                              type="button"
                            >
                              🗑 Xóa ảnh
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Customer Consent Details & Technician On-site Consent Box */}
                    <TechnicianInspectionConsentBox
                      disabled={selectedTask.submitted}
                      onSubmitConsent={handleTechnicianConsentSubmit}
                      task={selectedTask}
                    />

                    {/* Banner thông báo lưu thành công ngay bên trong khung kiểm tra ngoại quan */}
                    {inspectionSaveSuccess && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#ecfdf5',
                          border: '1.5px solid #10b981',
                          color: '#065f46',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
                          animation: 'fadeIn 0.2s ease-out',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>🎉</span>
                        <div>
                          Đã lưu thành công biên bản kiểm tra ngoại quan (Không đạt) vào CSDL hệ thống!
                        </div>
                      </div>
                    )}

                    <button
                      className="button button-primary"
                      disabled={selectedTask.submitted || !selectedTask.defectNote?.trim() || isSavingInspection}
                      onClick={() => handleSaveInspection(selectedTask)}
                      style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '10px 16px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: inspectionSaveSuccess ? '#059669' : '#dc2626',
                        borderColor: inspectionSaveSuccess ? '#047857' : '#b91c1c',
                        transition: 'all 0.2s ease',
                      }}
                      type="button"
                    >
                      {isSavingInspection ? (
                        <>
                          <span className="spinner-small" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                          <span>Đang lưu vào CSDL hệ thống...</span>
                        </>
                      ) : inspectionSaveSuccess ? (
                        <>
                          <span>✓</span>
                          <span>Đã lưu thành công vào CSDL!</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Lưu kết quả kiểm tra ngoại quan (Không đạt) vào CSDL</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </section>

              {/* ─── SECTION 2: Các bước quy trình chuẩn ───────────── */}
              <section className={`workflow-section${!inspectionCanProceed(selectedTask) ? ' section-locked' : ''}`}>
                <div className="section-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className={`workflow-number ${selectedTask.steps.every((step) => step.done) ? 'step-complete' : ''
                        }`}
                    >
                      2
                    </span>
                    <div>
                      <h3>Thực hiện quy trình kỹ thuật: {selectedTask.service}</h3>
                      <p>Mã quy trình chuẩn: <strong>{selectedTask.procedure}</strong> · ({selectedTask.steps.length} bước kỹ thuật)</p>
                    </div>
                  </div>
                  <button
                    className="button button-secondary"
                    disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask) || isSavingRecord}
                    onClick={() => handleSaveProcedureProgress(false)}
                    style={{ fontSize: '0.76rem', padding: '6px 12px', fontWeight: 700 }}
                    type="button"
                  >
                    {isSavingRecord ? '⏳ Đang lưu...' : '💾 Lưu tiến độ bước đo'}
                  </button>
                </div>

                <div className="environment-callout" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>⌂</span>
                      <div>
                        <strong>Điều kiện môi trường tiêu chuẩn ({selectedTask.service})</strong>
                        <span style={{ display: 'block' }}>{selectedTask.environment}</span>
                        {selectedTask.master_standard && (
                          <span style={{ display: 'block', fontSize: '0.74rem', color: '#1d4ed8', marginTop: '3px' }}>
                            ⚙ Chuẩn đối chứng được gán: <strong>{selectedTask.master_standard}</strong>
                          </span>
                        )}
                        {Array.isArray(selectedTask.required_equipment) && selectedTask.required_equipment.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {selectedTask.required_equipment.map((eq, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1e40af',
                                  fontWeight: 600,
                                }}
                              >
                                🛠 {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="environment-value">{selectedTask.location}</span>
                  </div>

                  {/* Nhập Nhiệt độ & Độ ẩm thực tế lưu vào bảng calibration_records */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #cbd5e1',
                    }}
                  >
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                      <span>🌡️ Nhiệt độ phòng thực tế (°C):</span>
                      <input
                        disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                        inputMode="decimal"
                        onChange={(e) => setEnvironmentField('environment_temp', e.target.value)}
                        placeholder="VD: 23.5"
                        step="0.1"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                        type="number"
                        value={selectedTask.environment_temp ?? ''}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                      <span>💧 Độ ẩm phòng thực tế (%RH):</span>
                      <input
                        disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                        inputMode="decimal"
                        onChange={(e) => setEnvironmentField('environment_humidity', e.target.value)}
                        placeholder="VD: 48.0"
                        step="0.1"
                        style={{
                          padding: '6px 10px',
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
                </div>

                {(selectedTask.environment?.includes('30 phút') || selectedTask.service?.toLowerCase().includes('hiện sóng')) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginTop: '10px',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                    <span>
                      <strong>Chuẩn bị bắt buộc:</strong> Bật nguồn làm nóng thiết bị và chuẩn Fluke 5520A trong vòng 30 phút trước khi tiến hành hiệu chuẩn.
                    </span>
                  </div>
                )}

                {!inspectionCanProceed(selectedTask) && (
                  <p className="locked-hint">
                    {selectedTask.inspection === 'Fail'
                      ? 'Cần mô tả lỗi, chụp ảnh và tích xác nhận của khách hàng trước khi mở quy trình.'
                      : 'Hoàn thành bước 1 (Kiểm tra ban đầu) để mở các bước thực hiện.'}
                  </p>
                )}

                <div className="procedure-steps">
                  {selectedTask.steps.map((step, index) => (
                    <article className={`procedure-step${step.done ? ' done' : ''}`} key={step.id}>
                      <span className="procedure-step-number">
                        {step.done ? '✓' : String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="procedure-step-content">
                        <div className="procedure-step-title">
                          <strong>{step.title}</strong>
                          {step.phase && (
                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', marginLeft: '6px' }}>
                              {step.phase}
                            </span>
                          )}
                          {step.evidence && <span className="evidence-required">Cần ảnh minh chứng</span>}
                        </div>

                        {step.evidence_hint && (
                          <div style={{ fontSize: '0.72rem', color: '#b45309', marginBottom: '6px' }}>
                            📷 {step.evidence_hint}
                          </div>
                        )}

                        <div style={{ marginTop: '6px' }}>
                          <input
                            disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                            onChange={(e) => setStepNote(step.id, e.target.value)}
                            placeholder="Ghi chú thực hiện bước kỹ thuật này (tùy chọn)..."
                            style={{
                              width: '100%',
                              padding: '5px 9px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                            }}
                            type="text"
                            value={step.note || ''}
                          />
                        </div>

                        {step.evidence && (
                          <div className="evidence-control">
                            <label className="file-picker">
                              <input
                                accept="image/*,.pdf"
                                capture="environment"
                                disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask) || uploadingPhotoKey === `step-${step.id}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleEvidencePhotoUpload(step.id, file);
                                  e.target.value = '';
                                }}
                                type="file"
                              />
                              <span aria-hidden="true">📷</span>
                              {uploadingPhotoKey === `step-${step.id}`
                                ? '⏳ Đang tải lên Cloudinary...'
                                : step.file || step.fileData
                                  ? 'Chụp / Chọn lại ảnh minh chứng'
                                  : 'Chụp ảnh / Đính kèm tệp minh chứng'}
                            </label>

                            {(step.fileData || step.file) && (
                              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {(step.fileData ||
                                  /^https?:\/\//i.test(step.file) ||
                                  step.file?.startsWith('/uploads/') ||
                                  step.file?.startsWith('data:')) ? (
                                  <a
                                    href={step.fileData || step.file}
                                    rel="noreferrer"
                                    target="_blank"
                                    title="Bấm để xem ảnh kích thước đầy đủ"
                                  >
                                    <img
                                      alt="Minh chứng"
                                      className="photo-thumbnail-small"
                                      src={step.fileData || step.file}
                                    />
                                  </a>
                                ) : null}
                                <span className="file-name">
                                  ✓ {step.fileName || (step.file?.startsWith('http') ? 'Ảnh minh chứng Cloudinary' : step.file)}
                                </span>
                                {!selectedTask.submitted && (
                                  <button
                                    onClick={() => handleRemoveEvidencePhoto(step.id)}
                                    style={{
                                      background: '#fee2e2',
                                      border: '1px solid #fca5a5',
                                      color: '#dc2626',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Xóa ảnh minh chứng này"
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

                      <label className="step-done-control">
                        <input
                          checked={step.done}
                          disabled={
                            selectedTask.submitted ||
                            !inspectionCanProceed(selectedTask) ||
                            (step.evidence && !step.file)
                          }
                          onChange={() => toggleStep(step.id)}
                          type="checkbox"
                        />
                        <span>{step.done ? 'Hoàn tất' : 'Xong'}</span>
                      </label>
                    </article>
                  ))}
                </div>
              </section>

              {/* ─── SECTION 3: Nhập số liệu đo kiểm thực tế ───────── */}
              <section className={`workflow-section${!inspectionCanProceed(selectedTask) ? ' section-locked' : ''}`}>
                <div className="section-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className={`workflow-number ${selectedTask.measurements.every((m) => m.measured !== '')
                          ? 'step-complete'
                          : ''
                        }`}
                    >
                      3
                    </span>
                    <div>
                      <h3>Ghi kết quả đo kiểm thực tế ({selectedTask.measurements.length} điểm đo)</h3>
                      <p>Nhập số đọc cho từng điểm đo theo quy trình <strong>{selectedTask.service}</strong></p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="measurement-unit-note">
                      Độ lệch Δ = Giá trị đo − Chuẩn
                    </span>
                    <button
                      className="button button-secondary"
                      disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask) || isSavingRecord}
                      onClick={() => handleSaveProcedureProgress(false)}
                      style={{ fontSize: '0.76rem', padding: '6px 12px', fontWeight: 700 }}
                      type="button"
                    >
                      {isSavingRecord ? '⏳ Đang lưu...' : '💾 Lưu bảng điểm đo'}
                    </button>
                  </div>
                </div>

                {/* Desktop View Table */}
                {!isMobile ? (
                  <div className="measurement-table-wrap">
                    <table className="measurement-table">
                      <thead>
                        <tr>
                          <th>Điểm đo & Thông số</th>
                          <th>Giá trị chuẩn</th>
                          <th>Giá trị đo (Thực tế)</th>
                          <th>Độ KĐBĐ (U)</th>
                          <th>Dung sai</th>
                          <th>Độ lệch (Δ)</th>
                          <th>Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTask.measurements.map((measurement) => {
                          const dev = getDeviation(measurement);
                          const hint = getVerificationHint(measurement);
                          return (
                            <tr key={measurement.id}>
                              <td>
                                <strong>{measurement.point}</strong>
                              </td>
                              <td>
                                {measurement.reference} <small>{measurement.unit}</small>
                              </td>
                              <td>
                                <label className="measurement-input">
                                  <input
                                    aria-label={`Giá trị đo ${measurement.point}`}
                                    disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                                    inputMode="decimal"
                                    onChange={(event) => setMeasurement(measurement.id, event.target.value)}
                                    placeholder="Nhập số đo"
                                    type="number"
                                    step="any"
                                    value={measurement.measured}
                                  />
                                  <span>{measurement.unit}</span>
                                </label>
                              </td>
                              <td>
                                <label className="measurement-input" style={{ maxWidth: '110px' }}>
                                  <input
                                    aria-label={`Độ không đảm bảo đo ${measurement.point}`}
                                    disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                                    inputMode="decimal"
                                    onChange={(event) => setMeasurementUncertainty(measurement.id, event.target.value)}
                                    placeholder="U"
                                    type="number"
                                    step="any"
                                    value={measurement.uncertainty ?? ''}
                                  />
                                </label>
                              </td>
                              <td>{measurement.tolerance}</td>
                              <td className={dev === null ? 'deviation-empty' : 'deviation-value'}>
                                {dev === null ? '—' : `${dev} ${measurement.unit}`}
                              </td>
                              <td>
                                {hint ? (
                                  <span
                                    className={`evaluation-hint ${hint === 'Gợi ý đạt' ? 'within-limit' : 'outside-limit'
                                      }`}
                                  >
                                    {hint === 'Gợi ý đạt' ? '✓ Đạt (Pass)' : '✕ Vượt ngưỡng'}
                                  </span>
                                ) : (
                                  <span className="deviation-empty">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Mobile-first Touch Cards for Measurements */
                  <div className="mobile-measurement-cards">
                    {selectedTask.measurements.map((m, idx) => {
                      const dev = getDeviation(m);
                      const hint = getVerificationHint(m);
                      return (
                        <div className="mobile-measurement-card" key={m.id}>
                          <div className="mobile-card-header">
                            <div>
                              <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                                Điểm #{idx + 1}: {m.point}
                              </strong>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                Chuẩn: <strong>{m.reference} {m.unit}</strong> · Dung sai: {m.tolerance}
                              </div>
                            </div>
                            {dev !== null && (
                              <span
                                className={`mobile-dev-pill ${hint === 'Cần xem xét' ? 'error' : 'success'
                                  }`}
                              >
                                Δ = {dev} {m.unit}
                              </span>
                            )}
                          </div>

                          <div className="mobile-card-input-row">
                            <label className="mobile-input-label">
                              <span>Số đo thực tế:</span>
                              <div className="mobile-input-wrapper">
                                <input
                                  disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                                  inputMode="decimal"
                                  onChange={(e) => setMeasurement(m.id, e.target.value)}
                                  placeholder="0.000"
                                  step="any"
                                  type="number"
                                  value={m.measured}
                                />
                                <span className="mobile-input-unit">{m.unit}</span>
                              </div>
                            </label>

                            {/* Quick adjustments */}
                            {!selectedTask.submitted && inspectionCanProceed(selectedTask) && (
                              <div className="mobile-stepper-btns">
                                <button
                                  className="stepper-btn"
                                  onClick={() => adjustMeasurement(m.id, -0.01)}
                                  type="button"
                                >
                                  -0.01
                                </button>
                                <button
                                  className="stepper-btn"
                                  onClick={() => adjustMeasurement(m.id, +0.01)}
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
                )}

                <p className="measurement-disclaimer">
                  Độ lệch (Δ) và đánh giá Pass/Fail được hệ thống lưu vào bảng <code>calibration_records</code>, <code>step_results</code> và <code>measurement_details</code> theo chuẩn ISO/IEC 17025.
                </p>
              </section>

              {/* ─── SECTION 4: Ký số điện tử & Trình soát xét ─────── */}
              <div className="submit-review-bar">
                <div>
                  <strong>
                    {selectedTask.submitted
                      ? '✓ Hồ sơ đã ký số và trình phê duyệt'
                      : 'Hoàn tất đo kiểm & Ký số nội bộ'}
                  </strong>
                  <span>
                    {selectedTask.submitted
                      ? `Đã ký bởi ${selectedTask.signedBy || currentUserName} (${new Date(selectedTask.signedAt || Date.now()).toLocaleTimeString('vi-VN')})`
                      : effectiveOnline
                        ? 'Ký số điện tử (SHA-256) và gửi trực tiếp tới tài khoản Reviewer.'
                        : 'Lưu trữ chữ ký số ngoại tuyến trên máy. Sẽ gửi tự động khi có mạng.'}
                  </span>
                </div>

                <button
                  className="button button-primary"
                  disabled={selectedTask.submitted || !isTaskReady(selectedTask)}
                  onClick={handleSignAndSubmit}
                  type="button"
                >
                  {selectedTask.submitted
                    ? '✓ Đã trình soát xét'
                    : effectiveOnline
                      ? '✍ Ký số & Trình duyệt'
                      : '✍ Ký số & Lưu ngoại tuyến'}
                </button>
              </div>

              <TechnicianSignedDetailsCard
                currentUserName={currentUserName}
                effectiveOnline={effectiveOnline}
                task={selectedTask}
              />

              {/* Mobile Fixed Bottom Action Bar */}
              {isMobile && (
                <div className="mobile-sticky-bottom-bar">
                  <div className="mobile-bottom-info">
                    <strong>
                      {isTaskReady(selectedTask) ? 'Sẵn sàng ký số' : 'Chưa hoàn tất bước'}
                    </strong>
                    <small>
                      {selectedTask.steps.filter((s) => s.done).length}/{selectedTask.steps.length} bước ·{' '}
                      {selectedTask.measurements.filter((m) => m.measured !== '').length}/
                      {selectedTask.measurements.length} điểm đo
                    </small>
                  </div>
                  <button
                    className="button button-primary mobile-sign-btn"
                    disabled={selectedTask.submitted || !isTaskReady(selectedTask)}
                    onClick={handleSignAndSubmit}
                    type="button"
                  >
                    {selectedTask.submitted ? '✓ Đã trình' : 'Ký số & Trình'}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section aria-label="Chi tiết công việc" className="task-detail task-detail-empty">
              <span aria-hidden="true">▤</span>
              <h2>Chọn công việc để bắt đầu</h2>
              <p>Chọn một thiết bị trong lịch công việc để xem quy trình và nhập kết quả đo.</p>
            </section>
          )
        )}
      </div>

      {/* ─── MODAL: Digital Signature Confirmation ─────────────────── */}
      <TechnicianDigitalSignatureModal
        effectiveOnline={effectiveOnline}
        isSubmitting={isSavingRecord}
        onClose={() => setSignModalOpen(false)}
        onConfirmSign={confirmDigitalSignature}
        open={signModalOpen && Boolean(selectedTask)}
        signerName={currentUserName}
        task={selectedTask}
      />

      {/* ─── MODAL: Offline Storage & Sync Control Center ──────────── */}
      {offlineModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setOfflineModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="technician-offline-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
                  Trung tâm Lưu trữ & Đồng bộ Ngoại tuyến (Offline Center)
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  Kiểm soát dữ liệu cục bộ trên điện thoại, đồng bộ khi có mạng
                </p>
              </div>
              <button
                onClick={() => setOfflineModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Connection Status Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: effectiveOnline ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${effectiveOnline ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>TÌNH TRẠNG KẾT NỐI</div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: effectiveOnline ? '#166534' : '#b45309',
                    marginTop: '2px',
                  }}
                >
                  {effectiveOnline ? '● Đang có mạng' : '● Ngoại tuyến (Offline)'}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>CHỜ ĐỒNG BỘ</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                  {pendingSyncCount} hồ sơ thay đổi
                </div>
              </div>
            </div>

            {/* Offline simulation toggle (For field testing) */}
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                  Chế độ mô phỏng mất mạng (Field Test)
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                  Bật công tắc này để kiểm thử thao tác như đang làm việc tại hầm/phòng kín không sóng
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  checked={simulatedOffline}
                  onChange={(e) => setSimulatedOffline(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  type="checkbox"
                />
              </label>
            </div>

            {/* Details of Cached Storage */}
            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
              <div>• <strong>Bộ nhớ cục bộ:</strong> Đang lưu trữ {tasks.length} nhiệm vụ và ảnh minh chứng.</div>
              <div>• <strong>Đồng bộ lần cuối:</strong> {lastSynced || 'Chưa thực hiện trong phiên này'}.</div>
              <div>• <strong>Bảo mật:</strong> Dữ liệu được mã hóa trong Local Storage của trình duyệt di động.</div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="small-action"
                onClick={async () => {
                  if (window.confirm('Bạn có chắc muốn xóa bộ nhớ ngoại tuyến và tải lại danh sách từ máy chủ?')) {
                    localStorage.removeItem(tasksCacheKey);
                    localStorage.removeItem(queueCacheKey);
                    setSyncQueue([]);
                    if (effectiveOnline) {
                      try {
                        const remote = await getTechnicianTasksApi();
                        saveTasks(Array.isArray(remote) ? remote : []);
                      } catch {
                        saveTasks([]);
                      }
                    } else {
                      saveTasks([]);
                    }
                    setNotice('Đã làm mới danh sách nhiệm vụ từ máy chủ.');
                    setOfflineModalOpen(false);
                  }
                }}
                style={{ color: '#ef4444' }}
                type="button"
              >
                Làm mới từ máy chủ
              </button>

              <button
                className="small-action"
                onClick={() => setOfflineModalOpen(false)}
                type="button"
              >
                Đóng
              </button>

              <button
                className="button button-primary"
                disabled={!effectiveOnline || isSyncing}
                onClick={handleSyncNow}
                style={{ padding: '8px 18px', fontWeight: 700 }}
                type="button"
              >
                {isSyncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ ngay lên máy chủ ⟳'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Mobile App Installation Guide (QR Code) ────────── */}
      {installGuideOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setInstallGuideOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  📱 Hướng dẫn cài đặt Ứng dụng ISOCAL Tech lên Điện thoại
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Cài đặt dưới dạng Progressive Web App (PWA) — Chạy offline như app tải từ App Store / CH Play
                </p>
              </div>
              <button
                onClick={() => setInstallGuideOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* QR Code & Direct Link */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <img
                  alt="QR Code"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? '192.168.1.8' : window.location.hostname}:${window.location.port}/mobile/technician`
                      : 'http://192.168.1.8:5173/mobile/technician',
                  )}`}
                  style={{ width: '130px', height: '130px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>
                  Quét bằng Camera điện thoại
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  1. Mở liên kết trên điện thoại (Cùng mạng Wifi):
                </div>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#0284c7',
                    fontWeight: 700,
                    wordBreak: 'break-all',
                    marginBottom: '8px',
                  }}
                >
                  {typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? '192.168.1.8' : window.location.hostname}:${window.location.port}/mobile/technician`
                    : 'http://192.168.1.8:5173/mobile/technician'}
                </div>
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined'
                      ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? '192.168.1.8' : window.location.hostname}:${window.location.port}/mobile/technician`
                      : 'http://192.168.1.8:5173/mobile/technician';
                    navigator.clipboard?.writeText(url);
                    alert('Đã sao chép liên kết vào bộ nhớ tạm!');
                  }}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                  type="button"
                >
                  📋 Sao chép liên kết
                </button>
              </div>
            </div>

            {/* Step-by-step for Android & iOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {/* Android */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.75rem',
                  color: '#166534',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🤖</span> Điện thoại Android (Chrome)
                </div>
                <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Mở link bằng <strong>Google Chrome</strong>.</li>
                  <li>Bấm vào biểu tượng <strong>ba chấm (⋮)</strong> ở góc trên bên phải.</li>
                  <li>Chọn <strong>"Cài đặt ứng dụng"</strong> (hoặc "Thêm vào màn hình chính").</li>
                  <li>Bấm <strong>Cài đặt</strong> để đưa biểu tượng app ra Home Screen.</li>
                </ol>
              </div>

              {/* iPhone iOS */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.75rem',
                  color: '#1e293b',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🍎</span> Điện thoại iPhone (Safari)
                </div>
                <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Mở link bằng trình duyệt <strong>Safari</strong>.</li>
                  <li>Bấm nút <strong>Chia sẻ (hình vuông có mũi tên ↑)</strong> ở thanh dưới.</li>
                  <li>Cuộn xuống chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</li>
                  <li>Bấm <strong>Thêm (Add)</strong> ở góc trên bên phải.</li>
                </ol>
              </div>
            </div>

            {/* Note on APK packaging */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.74rem',
                color: '#1e40af',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}
            >
              <strong>💡 Muốn xuất ra file cài đặt .APK độc lập (Android Studio)?</strong>
              <p style={{ margin: '4px 0 0' }}>
                Dự án đã sẵn sàng để xuất thành file <code>.apk</code> cài trực tiếp bằng <strong>Capacitor</strong>.
                Chỉ cần chạy lệnh: <code>npx cap init</code> và <code>npx cap add android</code> là có ngay file APK gửi qua Zalo cài vào máy!
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="button button-primary"
                onClick={() => setInstallGuideOpen(false)}
                style={{ padding: '8px 24px', fontWeight: 700 }}
                type="button"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oscilloscope Procedure Modal */}
      <OscilloscopeProcedureModal
        isOpen={isOscProcedureModalOpen}
        onApplyToWorkbench={handleApplyOscilloscopeTask}
        onClose={() => setIsOscProcedureModalOpen(false)}
      />
    </div>
  );
}

export default TechnicianPage;
