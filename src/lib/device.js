// src/lib/device.js
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('dm_device_id');
  if (!deviceId) {
    // 랜덤 문자열과 시간을 조합한 고유 ID 생성
    deviceId = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + new Date().getTime().toString(36);
    localStorage.setItem('dm_device_id', deviceId);
  }
  return deviceId;
};