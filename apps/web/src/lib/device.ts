/**
 * Mendapatkan DeviceID sedia ada atau mencipta UUID baharu.
 * Akan disimpan di localStorage supaya berterusan.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return ''; // SSR fallback
  }
  
  let deviceId = localStorage.getItem('crsr_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('crsr_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Mengetahui platform peranti pengguna berdasarkan User-Agent.
 * Mengembalikan: 'ios', 'android', atau 'unknown'
 */
export function detectDevicePlatform(): 'ios' | 'android' | 'unknown' {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const ua = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  
  // Mac fallback: sometimes iPads claim to be macOS in modern Safari
  if (ua.includes('mac') && 'ontouchend' in document) {
    return 'ios';
  }

  return 'unknown';
}

/**
 * Dapatkan nama anggapan peranti untuk dipaparkan di Dashboard.
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Unknown Device';
  }

  const platform = detectDevicePlatform();
  if (platform === 'ios') return 'Apple Device';
  if (platform === 'android') return 'Android Device';
  
  return 'Desktop / Unknown';
}
