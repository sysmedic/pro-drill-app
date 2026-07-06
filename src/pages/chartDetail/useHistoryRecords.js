import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, query, where, orderBy, serverTimestamp, onSnapshot, getDoc, writeBatch, increment, collection } from 'firebase/firestore';
import { db, auth } from '../../firebase';
// 🌟 슈파베이스 클라이언트 및 모드 스위치 수입
import { supabase, dbMode } from '../../supabaseClient';

export default function useHistoryRecords(customer, { refreshChartCount, setFeedback, onRenameSuccess } = {}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); 

  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  useEffect(() => {
    if (!auth.currentUser || !customer?.id) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 🌟 Supabase 모드일 때 나스 DB의 chart_data 조회 분기
    if (dbMode === 'supabase') {
      const fetchSbCharts = async () => {
        const { data, error } = await supabase
          .from('drilling_charts')
          .select('*')
          .eq('userId', auth.currentUser.uid)
          .eq('customerId', customer.id)
          .order('createdAt', { ascending: false });

        if (!error && data) {
          setHistory(data.map(row => {
            const chData = row.chart_data || {};
            return {
              id: row.id, 
              ...chData,
              chartData: chData.chartData || chData.data?.chartData || chData.data || null,
              maintenanceLogs: chData.maintenanceLogs || chData.data?.chartData?.maintenanceLogs || null
            };
          }));
        } else {
          console.error("Supabase 차트 기록 불러오기 실패:", error);
        }
        setLoading(false);
      };
      fetchSbCharts();
      return;
    }

    const q = query(
      collection(db, 'drilling_charts'),
      where('userId', '==', auth.currentUser.uid),
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, 
          ...data,
          chartData: data.chartData || data.data || null,
          maintenanceLogs: data.maintenanceLogs || null
        };
      }));
      setLoading(false); 
    }, (error) => {
      console.error("차트 기록 불러오기 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [customer?.id]);

  // [C/U] 지공 차트 생성 및 갱신 파이프라인 (409 Conflict 완치 버전)
  const saveRecord = useCallback(async (record) => {
    if (!auth.currentUser) return { ok: false };

    try {
      const chartRef = doc(db, 'drilling_charts', record.id);
      const chartSnap = await getDoc(chartRef);
      
      // 💡 [오류 완치] 운영 모드(Switch)에 따라 신규 저장 유무를 네트워크 비용 없이 정밀 판별
      const isBrandNew = dbMode === 'supabase'
        ? !history.some(h => h.id === record.id)
        : !chartSnap.exists();

      const batch = writeBatch(db);
      
      const saveData = {
        ...record,
        userId: auth.currentUser.uid,
        customerId: customer.id,
      };

      const isoTimestamp = new Date().toISOString();
      let finalCreatedAtIso = isoTimestamp;

      // 파이어베이스 데이터 셋업 및 타임스탬프 추출
      if (dbMode !== 'supabase') {
        if (isBrandNew) {
          saveData.createdAt = serverTimestamp();
        } else {
          const oldData = chartSnap.data();
          saveData.createdAt = oldData?.createdAt || serverTimestamp();
          
          if (oldData?.createdAt) {
            finalCreatedAtIso = typeof oldData.createdAt.toDate === 'function'
              ? oldData.createdAt.toDate().toISOString()
              : new Date(oldData.createdAt).toISOString();
          }
        }
        // 파이어베이스 일괄 처리 배치 등록
        batch.set(chartRef, saveData);

        if (isBrandNew && auth.currentUser?.email) {
          const userRef = doc(db, 'users', auth.currentUser.email);
          batch.update(userRef, { chartCount: increment(1) });
        }
      }

      // 🌟 [Supabase 듀얼/단독 저장 레이어]
      if (dbMode === 'dual' || dbMode === 'supabase') {
        // 슈파베이스 단독 모드일 때 기존 데이터의 생성일 유지 보정
        if (dbMode === 'supabase' && !isBrandNew) {
          const existingRecord = history.find(h => h.id === record.id);
          if (existingRecord?.createdAt) {
            finalCreatedAtIso = new Date(existingRecord.createdAt).toISOString();
          }
        }

        const shadowSavePayload = {
          ...saveData,
          createdAt: finalCreatedAtIso,
          updatedAt: isoTimestamp
        };

        // 💡 [오류 완치] .insert() 후 캐치하던 방식에서 처음부터 .upsert()를 찔러 409 Conflict 원천 봉쇄
        const { error: supabaseUpsertErr } = await supabase
          .from('drilling_charts')
          .upsert({
            id: record.id, // 기본키 충돌 시 하단 옵션에 의해 자동으로 UPDATE 처리됨
            userId: auth.currentUser.uid,
            customerId: customer.id,
            name: record.name || '미지정 레이아웃 차트',
            timestamp: record.timestamp || isoTimestamp,
            ball_name: record.ballName || record.ball_name || '',
            intent: record.intent || '',
            layout_info: record.layoutInfo || record.layout_info || '',
            createdAt: finalCreatedAtIso,
            updatedAt: isoTimestamp,
            chart_data: shadowSavePayload // 원형 통주머니 100% 무결성 보존
          }, { onConflict: 'id' });

        if (supabaseUpsertErr) throw supabaseUpsertErr;

        // 신규 차트 등록 시 슈파베이스 users 카운터 테이블 연동 보정
        if (isBrandNew && auth.currentUser?.email) {
          if (dbMode === 'supabase') {
            const { data: sbUser } = await supabase.from('users').select('chartCount').eq('email', auth.currentUser.email).single();
            const currentCount = sbUser?.chartCount || 0;
            await supabase.from('users').update({ chartCount: currentCount + 1 }).eq('email', auth.currentUser.email);
          } else {
            const userRef = doc(db, 'users', auth.currentUser.email);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentCount = userSnap.data().chartCount || 0;
              await supabase.from('users').update({ chartCount: currentCount + 1 }).eq('email', auth.currentUser.email);
            }
          }
        }
      }

      // 파이어베이스 모드들이 켜져있을 때만 트랜잭션 커밋
      if (dbMode !== 'supabase') {
        await batch.commit();
      }
      
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 저장 실패:", error);
      return { ok: false };
    }
  }, [customer?.id, history]);

  // [D] 지공 차트 개별 영구 파괴 파이프라인
  const handleDeleteRecord = useCallback(async (id) => {
    try {
      if (dbMode !== 'supabase') {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'drilling_charts', id));

        if (auth.currentUser?.email) {
          const userRef = doc(db, 'users', auth.currentUser.email);
          batch.update(userRef, { chartCount: increment(-1) });
        }
        await batch.commit();
      }

      // 슈파베이스 동시 삭제 적용
      if (dbMode === 'dual' || dbMode === 'supabase') {
        const { error: supabaseDelErr } = await supabase
          .from('drilling_charts')
          .delete()
          .eq('id', id);

        if (supabaseDelErr) throw supabaseDelErr;

        if (auth.currentUser?.email) {
          if (dbMode === 'supabase') {
            const { data: sbUser } = await supabase.from('users').select('chartCount').eq('email', auth.currentUser.email).single();
            const currentCount = sbUser?.chartCount || 0;
            await supabase.from('users').update({ chartCount: Math.max(0, currentCount - 1) }).eq('email', auth.currentUser.email);
          } else {
            const userRef = doc(db, 'users', auth.currentUser.email);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentCount = userSnap.data().chartCount || 0;
              await supabase.from('users').update({ chartCount: Math.max(0, currentCount - 1) }).eq('email', auth.currentUser.email);
            }
          }
        }
      }

      if (refreshChartCount) await refreshChartCount();
      if (setFeedback) setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 삭제 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 삭제를 반영하지 못했습니다.', title: '삭제 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [refreshChartCount, setFeedback]);

  // [U] 지공 차트 공 이름 타이틀 단독 변경 파이프라인
  const handleRenameRecord = useCallback(async (nextName) => {
    const trimmedName = nextName?.trim();
    if (!trimmedName || !renameRequest) return { ok: false, reason: 'empty' };

    try {
      if (dbMode !== 'supabase') {
        await updateDoc(doc(db, 'drilling_charts', renameRequest.id), { name: trimmedName });
      }

      // 슈파베이스 업데이트 및 jsonb 내부 타이틀 스냅샷 정밀 동시 교정
      if (dbMode === 'dual' || dbMode === 'supabase') {
        let updatedChartPayload = {};
        let finalCreatedAtIso = new Date().toISOString();
        const isoTimestamp = new Date().toISOString();

        if (dbMode === 'supabase') {
          const target = history.find(h => h.id === renameRequest.id);
          if (target) {
            updatedChartPayload = { ...target, name: trimmedName, updatedAt: isoTimestamp };
            if (target.createdAt) finalCreatedAtIso = new Date(target.createdAt).toISOString();
          }
        } else {
          const chartRef = doc(db, 'drilling_charts', renameRequest.id);
          const chartSnap = await getDoc(chartRef);
          if (chartSnap.exists()) {
            const currentData = chartSnap.data();
            updatedChartPayload = { ...currentData, name: trimmedName };
            if (currentData.createdAt) {
              finalCreatedAtIso = typeof currentData.createdAt.toDate === 'function'
                ? currentData.createdAt.toDate().toISOString()
                : new Date(currentData.createdAt).toISOString();
            }
          }
        }

        updatedChartPayload.createdAt = finalCreatedAtIso;
        updatedChartPayload.updatedAt = isoTimestamp;

        // 💡 [오류 완치] .from('users')로 지정되어 있던 치명적 타깃 테이블 명칭 오타를 'drilling_charts'로 전격 정정
        const { error: supabaseRenameErr } = await supabase
          .from('drilling_charts') 
          .update({
            name: trimmedName,
            updatedAt: isoTimestamp,
            chart_data: updatedChartPayload
          })
          .eq('id', renameRequest.id);

        if (supabaseRenameErr) throw supabaseRenameErr;
      }

      if (onRenameSuccess) onRenameSuccess(renameRequest.id, trimmedName);
      setRenameRequest(null);
      if (setFeedback) setFeedback({ message: '저장 기록 이름을 변경했습니다.', tone: 'success' });
      return { ok: true };
    } catch (error) {
      console.error("차트 이름 변경 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 이름 변경을 반영하지 못했습니다.', title: '이름 변경 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [renameRequest, onRenameSuccess, setFeedback, history]);

  return {
    history, 
    loading, 
    historyConfirm, 
    setHistoryConfirm, 
    renameRequest, 
    setRenameRequest,
    deleteRequest, 
    setDeleteRequest, 
    saveRecord, 
    handleDeleteRecord, 
    handleRenameRecord,
  };
}