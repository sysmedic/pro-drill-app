import { useState, useRef, useCallback } from 'react';

export default function useChartExport({ customer, isEditMode, setFeedback, setUtilityState }) {
  const [sharePreview, setSharePreview] = useState(null);
  const [shareFilename, setShareFilename] = useState('');
  const exportRef = useRef(null);

  // 💾 브라우저 이미지 다운로드 트리거
  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ message: '차트 이미지가 다운로드되었습니다.', tone: 'success' });
  }, [setFeedback]);

  // 모바일 웹 네이티브 공유 API 호출 및 실패 시 다운로드 우회
  const executeShare = useCallback(async () => {
    if (!sharePreview) return;
    const finalFilename = shareFilename.trim() || `${customer.name}_지공차트`;
    const file = new File([sharePreview], `${finalFilename}.png`, { type: 'image/png' });
    
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `${customer.name} 지공차트`, files: [file] });
        setFeedback({ message: '공유가 완료되었습니다.', tone: 'success' });
      } else {
        downloadBlob(sharePreview, `${finalFilename}.png`);
      }
    } catch (error) {
      console.warn('공유가 취소되었거나 지원하지 않아 다운로드로 대체합니다.', error);
      downloadBlob(sharePreview, `${finalFilename}.png`);
    } finally {
      setSharePreview(null);
    }
  }, [sharePreview, shareFilename, customer.name, downloadBlob, setFeedback]);

  // 📸 html-to-image 돔 캡처 엔진 구동 로직
  const handleShare = useCallback(async () => {
    if (isEditMode) {
      setFeedback({ message: '차트 보기 모드에서만 공유할 수 있습니다.', tone: 'warning' });
      setUtilityState('collapsed');
      return;
    }

    if (!exportRef.current) return;
    setUtilityState('collapsed');
    setFeedback({ message: '차트 이미지를 생성하고 있습니다...', tone: 'info' });

    const node = exportRef.current;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = '[data-exporting="true"] * { box-shadow: none !important; }';
    document.head.appendChild(styleEl);
    node.setAttribute('data-exporting', 'true');

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const htmlToImage = await import('html-to-image');
      
      const blob = await htmlToImage.toBlob(node, {
        backgroundColor: '#f8fafc',
        pixelRatio: 3,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { 
          margin: '0', 
          transform: 'scale(0.96)', 
          transformOrigin: 'top center' 
        }
      });

      if (!blob) throw new Error('Blob 생성 실패');

      setSharePreview(blob);
      setShareFilename(`${customer.name}_지공차트`);
      setFeedback(null);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      setFeedback({ message: '이미지 생성 중 오류가 발생했습니다.', tone: 'danger' });
    } finally {
      node.removeAttribute('data-exporting');
      document.head.removeChild(styleEl);
    }
  }, [isEditMode, customer.name, setFeedback, setUtilityState]);

  return {
    sharePreview,
    setSharePreview,
    shareFilename,
    setShareFilename,
    exportRef,
    handleShare,
    executeShare
  };
}