import { useCallback, useEffect, useState } from 'react';
import { getDashboardOverviewApi } from '../services/dashboard-service.js';

/**
 * Hook dùng chung cho các trang tổng quan: tải dữ liệu thật từ API,
 * expose trạng thái loading/error để trang hiển thị thông báo phù hợp.
 */
export default function useDashboardOverview(targetRole) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await getDashboardOverviewApi(targetRole);
      setData(overview ?? {});
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Không thể tải dữ liệu tổng quan từ máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }, [targetRole]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const overview = await getDashboardOverviewApi(targetRole);
        if (active) setData(overview ?? {});
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              'Không thể tải dữ liệu tổng quan từ máy chủ.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [targetRole]);

  return { data, error, loading, reload: load };
}
