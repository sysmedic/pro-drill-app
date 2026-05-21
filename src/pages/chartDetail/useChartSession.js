import { useState, useEffect, useCallback, useRef } from 'react';
import { getCustomerChartProfile } from '../../lib/customerSchema.js';
import { createLocalId } from '../../lib/ids.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 

const createDefaultChartData = ({ handedness = 'right', isThumbless = false } = {}) => ({
  isThumbless,
  handedness,
  handCondition: { moisture: '', fingerStiffness: '', thumbStiffness: '' },
  midPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  ringPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  thumbPitch: { up: '', down: '', left: '', right: '' },
  thumbOffset: { left: '', right: '' },
  thumbDetails: { holeSize: '', ovalSize: '', slugType: '', holeCutSize: '' },
  bridge: '3/16',
  spanLeft: '',
  spanRight: '',
  spanType: '',
  ovalAngle: '',
  drillingGuide: { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
});

// 타임라인 로그 메시지 생성 로직 분리
const generateTimelineLogMessage = (isNewSession, currentData, originalData) => {
  if (isNewSession) return currentData.intent?.trim() || '등록된 상담 내용이 없습니다.';

  const currentLogs = Array.isArray(currentData.chartData?.maintenanceLogs) ? currentData.chartData.maintenanceLogs : [];
  const originalLogs = Array.isArray(originalData?.chartData?.maintenanceLogs) ? originalData.chartData.maintenanceLogs : [];
  const currentMemosList = Array.isArray(currentData.memos) ? currentData.memos : [];
  const originalMemosList = Array.isArray(originalData?.memos) ? originalData.memos : [];
  
  const currentIntentText = currentData.intent || '';
  const originalIntentText = originalData?.intent || '';

  if (currentLogs.length > originalLogs.length) return currentLogs[currentLogs.length - 1].text;
  if (currentIntentText.trim() !== originalIntentText.trim()) return '상담 내용 및 지공 의도 변경';
  if (currentMemosList.length > originalMemosList.length) return '새로운 메모 추가됨';
  return '차트 세부 수치 업데이트';
};

export default function useChartSession({
  customer, history, loading, maxChartsAllowed, currentChartsCount,
  userTier, refreshChartCount, memos, setMemos, saveRecord, setFeedback
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [chartData, setChartData] = useState(() => createDefaultChartData());
  const [customerInfo, setCustomerInfo] = useState(() => ({
    fingerStiff: '', thumbStiff: '', moisture: '', trackFlare: '',
    tilt: '', papX: '', papY: '', ballSpeed: '', rpm: ''
  }));
  const [ballName, setBallName] = useState('');
  const [layoutInfo, setLayoutInfo] = useState('');
  const [intent, setIntent] = useState('');
  const [, setSaveDate] = useState('');
  
  const [viewingRecord, _setViewingRecord] = useState(null);
  const viewingRecordRef = useRef(null);
  const setViewingRecord = useCallback((val) => { viewingRecordRef.current = val; _setViewingRecord(val); }, []);

  const [sessionRecordId, _setSessionRecordId] = useState(null);
  const sessionRecordIdRef = useRef(null);
  const setSessionRecordId = useCallback((val) => { sessionRecordIdRef.current = val; _setSessionRecordId(val); }, []);

  const [sessionRecordName, _setSessionRecordName] = useState('');
  const sessionRecordNameRef = useRef('');
  const setSessionRecordName = useCallback((val) => { sessionRecordNameRef.current = val; _setSessionRecordName(val); }, []);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModifyWarning, setShowModifyWarning] = useState(false); 
  const [hasWarnedModify, setHasWarnedModify] = useState(false);

  const loadedCustomerId = useRef(null);
  const historyLengthRef = useRef(0);

  useEffect(() => {
    if (loading) return;

    if (loadedCustomerId.current === customer.id && (historyLengthRef.current > 0 || history.length === 0)) {
        return; 
    }

    const profile = getCustomerChartProfile(customer);

    const initializeNewCustomer = () => {
      setIsEditMode(true);
      setChartData(createDefaultChartData(profile));
      setCustomerInfo({ fingerStiff: '', thumbStiff: '', moisture: '', trackFlare: '', tilt: '', papX: '', papY: '', ballSpeed: '', rpm: '' });
      setBallName(''); setLayoutInfo(''); setIntent(''); setMemos([]); setSaveDate('');
      setViewingRecord(null); setSessionRecordId(null); setSessionRecordName(''); setHasWarnedModify(false);
    };

    if (history && history.length > 0) {
      const latestRecord = history[0];
      const recordData = latestRecord.data || latestRecord;

      if (recordData.chartData) {
        setChartData({
          ...createDefaultChartData(profile),
          ...recordData.chartData,
          maintenanceLogs: [], 
          thumbOffset: recordData.chartData.thumbOffset || { left: '', right: '' },
          drillingGuide: recordData.chartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
          handedness: recordData.chartData.handedness ?? profile.handedness,
          isThumbless: recordData.chartData.isThumbless ?? profile.isThumbless,
        });
      }
      if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);

      setBallName(''); setLayoutInfo(''); setIntent(''); setSaveDate('');
      setViewingRecord(null); setSessionRecordId(null); setSessionRecordName('');
      setIsEditMode(false); setHasWarnedModify(false);
      
      setMemos(recordData.memos || []); 

      loadedCustomerId.current = customer.id;
      historyLengthRef.current = history.length;
    } else {
      initializeNewCustomer();
      loadedCustomerId.current = customer.id;
      historyLengthRef.current = 0;
    }

    setHasUnsavedChanges(false);
  }, [customer, loading, history, setMemos, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  useEffect(() => {
    if (hasUnsavedChanges && viewingRecord && !hasWarnedModify) {
      setShowModifyWarning(true);
      setHasWarnedModify(true);
    }
  }, [hasUnsavedChanges, viewingRecord, hasWarnedModify]);

  const handleSave = useCallback(async (silent = false) => {
    if (!hasUnsavedChanges) return true;

    const currentSessionId = sessionRecordIdRef.current;
    const currentSessionName = sessionRecordNameRef.current;
    const currentViewingRecord = viewingRecordRef.current;

    const isNewSession = !currentSessionId;
    const recordId = currentSessionId || createLocalId('record');

    if (isNewSession && maxChartsAllowed !== Infinity && currentChartsCount >= maxChartsAllowed) {
      setFeedback({ message: `${userTier.toUpperCase()} 등급은 최대 ${maxChartsAllowed}개의 차트만 저장할 수 있습니다.`, title: '저장 제한', tone: 'warning' });
      return false;
    }

    const nowObj = new Date();
    const nowTimestamp = nowObj.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const yy = String(nowObj.getFullYear()).slice(-2);
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;
    
    let finalRecordName = ballName ? `${ballName} ${dateStr}` : (currentSessionName || (currentViewingRecord ? currentViewingRecord.name : `차트 ${dateStr}`));
    
    if (isNewSession) {
      const existingNames = new Set(history.map(r => r.name || r.data?.name));
      if (existingNames.has(finalRecordName)) {
        let suffix = 1;
        while (existingNames.has(`${finalRecordName}-${suffix}`)) suffix++;
        finalRecordName = `${finalRecordName}-${suffix}`;
      }
    }

    // 🟢 수정된 부분: isNewSession일 때 배열을 강제로 초기화하던 덫을 제거했습니다.
    // 이제 화면에 있는 데이터(chartData)와 메모(memos)가 온전히 저장됩니다.
    const finalChartData = { ...chartData };
    const finalMemos = [...memos];
    
    const newRecord = {
      id: recordId,
      timestamp: nowTimestamp,
      name: finalRecordName,
      data: { chartData: finalChartData, customerInfo, ballName, layoutInfo, intent, memos: finalMemos },
    };

    const result = await saveRecord(newRecord);
    if (!result.ok) {
      if (!silent) setFeedback({ message: '클라우드 저장에 실패했습니다. 네트워크 상태를 확인해주세요.', title: '저장 실패', tone: 'danger' });
      return false;
    }

    try {
      if (customer?.id) {
        const customerRef = doc(db, 'customers', customer.id);
        const logAmpm = nowObj.getHours() >= 12 ? '오후' : '오전';
        const logHour = nowObj.getHours() % 12 || 12;
        const customTimelineTimestamp = `${nowObj.getFullYear()}년 ${mm}월 ${dd}일 ${logAmpm} ${logHour}시`;

        const originalRecord = history.find(r => r.id === currentViewingRecord?.id);
        
        const logMessage = generateTimelineLogMessage(
          isNewSession, 
          { chartData: finalChartData, intent, memos: finalMemos }, 
          originalRecord?.data
        );

        const newTimelineLog = {
          id: `log_${Date.now()}`,
          date: customTimelineTimestamp,
          chartId: recordId,
          ballName: finalRecordName, 
          layoutInfo: isNewSession ? (layoutInfo || '') : '', 
          actionType: isNewSession ? 'CREATE' : 'UPDATE',
          message: logMessage, 
        };

        const updatedLogs = [...(customer.activityLogs || []), newTimelineLog];
        if (updatedLogs.length > 15) updatedLogs.splice(0, updatedLogs.length - 15);

        await updateDoc(customerRef, { activityLogs: updatedLogs });
      }
    } catch (logError) {
      console.error('타임라인 로그 업데이트 실패:', logError);
    }

    if (isNewSession && refreshChartCount) {
      try { await refreshChartCount(); } catch(e) { console.error('카운트 갱신 중 오류:', e); }
    }

    setSaveDate(nowTimestamp);
    setSessionRecordId(newRecord.id); 
    setSessionRecordName(finalRecordName); 

    if (currentViewingRecord !== null) {
      setViewingRecord({ id: newRecord.id, name: finalRecordName, timestamp: nowTimestamp });
    }

    if (isNewSession) {
      setChartData(finalChartData); 
      setMemos(finalMemos);
    }

    setHasUnsavedChanges(false);
    if (!silent) setFeedback({ message: `${customer.name} 고객님의 기록이 저장되었습니다.`, tone: 'success' });
    
    return true;

  }, [hasUnsavedChanges, maxChartsAllowed, currentChartsCount, userTier, history, ballName, chartData, customerInfo, layoutInfo, intent, memos, saveRecord, customer, refreshChartCount, setFeedback, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const loadRecord = useCallback((record, asTemplate = false) => {
    const recordData = record.data || record;
    const profile = getCustomerChartProfile(customer);

    const loadedChartData = recordData.chartData || {};
    setChartData({
      ...loadedChartData,
      maintenanceLogs: asTemplate ? [] : (loadedChartData.maintenanceLogs || []), 
      thumbOffset: loadedChartData.thumbOffset || { left: '', right: '' },
      drillingGuide: loadedChartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
      handedness: loadedChartData.handedness ?? profile.handedness,
      isThumbless: loadedChartData.isThumbless ?? profile.isThumbless,
    });
    
    if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);
    
    if (asTemplate) {
      setBallName(''); setLayoutInfo(''); setIntent(''); setSaveDate('');
      setViewingRecord(null); setSessionRecordId(null); setSessionRecordName('');
    } else {
      setBallName(recordData.ballName || ''); setLayoutInfo(recordData.layoutInfo || ''); setIntent(recordData.intent || '');
      setSaveDate(record.timestamp || record.createdAt || '');
      setViewingRecord({ id: record.id, name: record.name || '불러온 기록', timestamp: record.timestamp || record.createdAt });
      setSessionRecordId(record.id); setSessionRecordName(record.name || '불러온 기록');
    }
    
    setIsEditMode(false); setHasUnsavedChanges(false); setHasWarnedModify(false);

    setMemos(asTemplate ? [] : (recordData.memos || []));
  }, [customer, setMemos, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const convertToTemplate = useCallback(() => {
    setBallName('');
    setLayoutInfo('');
    setIntent('');
    
    setChartData(prev => ({
      ...prev,
      maintenanceLogs: [] 
    }));         
    
    setSaveDate('');
    setViewingRecord(null);
    setSessionRecordId(null);
    setSessionRecordName('');
    
    setHasUnsavedChanges(false);
    setHasWarnedModify(false);
  }, [setMemos, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const handleChartDataChange = useCallback((newData) => {
    setHasUnsavedChanges(true);
    setChartData(newData);
  }, []);

  const updateCustomerInfo = useCallback((updater) => {
    setCustomerInfo(prev => typeof updater === 'function' ? updater(prev) : updater);
    setHasUnsavedChanges(true);
  }, []);

  const updateWorkField = useCallback((setter) => (value) => {
    setter(value);
    setHasUnsavedChanges(true);
  }, []);

  return {
    isEditMode, setIsEditMode, chartData, setChartData, customerInfo, setCustomerInfo, ballName, setBallName, layoutInfo, setLayoutInfo, intent, setIntent, viewingRecord, setViewingRecord, sessionRecordId, setSessionRecordId, sessionRecordName, setSessionRecordName, hasUnsavedChanges, setHasUnsavedChanges, showModifyWarning, setShowModifyWarning, hasWarnedModify, setHasWarnedModify, handleChartDataChange, updateCustomerInfo, updateWorkField, handleSave, loadRecord, convertToTemplate
  };
}