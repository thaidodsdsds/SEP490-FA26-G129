import os from 'node:os';

const isPrivateIpv4 = (address: string): boolean =>
  address.startsWith('192.168.') ||
  address.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(address);

// Bỏ qua card ảo (VMware, WSL/Hyper-V, Docker, VPN...) — thường chạy trước Wi-Fi thật.
const isVirtualInterface = (name: string): boolean =>
  /vmware|virtual|vethernet|wsl|hyper-v|docker|loopback|tap|vpn/i.test(name);

/**
 * Chọn IP để điện thoại truy cập dịch vụ dev từ máy tính.
 *
 * Khi bật Mobile Hotspot của Windows, máy tính có thêm IP 192.168.137.1.
 * Điện thoại bắt hotspot sẽ ở mạng 192.168.137.x nên BẮT BUỘC dùng IP này,
 * không dùng IP Wi-Fi cũng như localhost (localhost trên điện thoại là chính điện thoại).
 */
const resolveLanInfo = (
  fallback = '192.168.1.7',
): { lanIp: string; hotspotActive: boolean } => {
  const candidates: Array<{ name: string; address: string }> = [];

  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (!list || isVirtualInterface(name)) continue;
    for (const details of list) {
      if (details.family === 'IPv4' && !details.internal && isPrivateIpv4(details.address)) {
        candidates.push({ name, address: details.address });
        break;
      }
    }
  }

  const hotspot = candidates.find(({ address }) => address.startsWith('192.168.137.'));
  if (hotspot) return { lanIp: hotspot.address, hotspotActive: true };

  const preferred =
    candidates.find(({ name }) => /wi-?fi|wireless|ethernet/i.test(name)) ?? candidates[0];

  return { lanIp: preferred?.address ?? fallback, hotspotActive: false };
};

export const getPreferredLanIp = (fallback = '192.168.1.7'): string =>
  resolveLanInfo(fallback).lanIp;

/**
 * Thông tin IP dùng cho QR cài đặt app lên điện thoại.
 * hotspotActive = true khi Windows Mobile Hotspot đang phát (có IP 192.168.137.x).
 */
export const getLanIpInfo = (fallback = '192.168.1.7') => resolveLanInfo(fallback);
