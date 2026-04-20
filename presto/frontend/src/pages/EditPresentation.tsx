import React, { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './EditPresentation.css';


const BASE_URL = "https://z5557661-presto-be-deploy.vercel.app";

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'code';
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  // text
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  // image
  src?: string;
  alt?: string;
  // video
  videoUrl?: string;
  autoplay?: boolean;
  // code
  code?: string;
  codeFontSize?: number;
}

interface SlideBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientDirection?: string;
  imageSrc?: string;
}

interface Slide { elements: SlideElement[]; background?: SlideBackground; }

interface Presentation {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  slides: Slide[];
  defaultBackground?: SlideBackground;
}

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  slideRect: DOMRect;
  didMove: boolean;
}

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface ResizeState {
  elementId: string;
  corner: ResizeCorner;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  slideRect: DOMRect;
  didResize: boolean;
}

interface HistoryEntry {
  timestamp: number;
  slides: Slide[];
  defaultBackground?: SlideBackground;
}

function EditPresentation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('token');

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [allPresentations, setAllPresentations] = useState<Presentation[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [currentSlide, setCurrentSlide] = useState(() => {
    const raw = Number(searchParams.get('slide') || '1');
    return Number.isFinite(raw) && raw > 0 ? raw - 1 : 0;
  });
  const [error, setError] = useState('');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draftElements, setDraftElements] = useState<SlideElement[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);

  // Restart CSS animation on slide change
  const isFirstSlideRender = useRef(true);
  useEffect(() => {
    if (isFirstSlideRender.current) {
      isFirstSlideRender.current = false;
      return;
    }
    const el = slideRef.current;
    if (!el) return;
    el.classList.remove('edit-pres__slide--enter');
    void el.offsetWidth;
    el.classList.add('edit-pres__slide--enter');
  }, [currentSlide]);

  // Text modal
  const [showTextModal, setShowTextModal] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [textWidth, setTextWidth] = useState('25');
  const [textHeight, setTextHeight] = useState('15');
  const [textContent, setTextContent] = useState('');
  const [textFontSize, setTextFontSize] = useState('1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textFontFamily, setTextFontFamily] = useState('Arial');
  const [textX, setTextX] = useState('0');
  const [textY, setTextY] = useState('0');

  // Image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imgWidth, setImgWidth] = useState('30');
  const [imgHeight, setImgHeight] = useState('30');
  const [imgSrc, setImgSrc] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgX, setImgX] = useState('0');
  const [imgY, setImgY] = useState('0');

  // Video modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [vidWidth, setVidWidth] = useState('40');
  const [vidHeight, setVidHeight] = useState('30');
  const [vidUrl, setVidUrl] = useState('');
  const [vidAutoplay, setVidAutoplay] = useState(false);
  const [vidX, setVidX] = useState('0');
  const [vidY, setVidY] = useState('0');

  // Code modal
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [codeWidth, setCodeWidth] = useState('40');
  const [codeHeight, setCodeHeight] = useState('30');
  const [codeContent, setCodeContent] = useState('');
  const [codeFontSize, setCodeFontSize] = useState('0.8');
  const [codeX, setCodeX] = useState('0');
  const [codeY, setCodeY] = useState('0');

  // Background modal
  const [showBgModal, setShowBgModal] = useState(false);
  const [showSlidePanel, setShowSlidePanel] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Revision history
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const lastSnapshotTime = useRef<number>(0);

  const getHistoryKey = () => `presto-history-${id}`;

  const loadHistory = (): HistoryEntry[] => {
    try {
      const raw = localStorage.getItem(getHistoryKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  /** Capture a deep-copy snapshot of the current presentation state (throttled to 1 min). */
  const saveSnapshot = (pres: Presentation) => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastSnapshotTime.current < 60_000) return;
    lastSnapshotTime.current = now;

    const history = loadHistory();
    const entry: HistoryEntry = {
      timestamp: now,
      slides: JSON.parse(JSON.stringify(pres.slides)),
      defaultBackground: pres.defaultBackground
        ? JSON.parse(JSON.stringify(pres.defaultBackground))
        : undefined,
    };
    history.push(entry);

    try {
      localStorage.setItem(getHistoryKey(), JSON.stringify(history));
    } catch {
      // localStorage full — silently ignore
    }
  };

  /** Restore all slides from a history entry and save to backend. */
  const restoreFromHistory = async (entry: HistoryEntry) => {
    if (!presentation) return;
    try {
      const restored = allPresentations.map((p) =>
        p.id === id
          ? { ...p, slides: entry.slides, defaultBackground: entry.defaultBackground }
          : p
      );
      await saveStore(restored);
      lastSnapshotTime.current = 0;
      setCurrentSlide(0);
      setShowHistoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore.');
    }
  };
  const [bgType, setBgType] = useState<'solid' | 'gradient' | 'image'>('solid');
  const [bgColor, setBgColor] = useState('#1a1c22');
  const [bgGradColor1, setBgGradColor1] = useState('#1a1c22');
  const [bgGradColor2, setBgGradColor2] = useState('#7c5cff');
  const [bgGradDirection, setBgGradDirection] = useState('to bottom');
  const [bgImageSrc, setBgImageSrc] = useState('');
  const [bgIsDefault, setBgIsDefault] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    const loadData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/store`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to load data.'); return; }
        const presentations: Presentation[] = (data.store?.presentations || []).map(
          (p: Presentation) => ({
            ...p,
            slides: (p.slides || [{}]).map((s: Slide | object) =>
              'elements' in s ? s : { elements: [] }
            ),
          })
        );
        setAllPresentations(presentations);
        const found = presentations.find((p) => p.id === id);
        if (!found) { setError('Presentation not found.'); return; }
        setPresentation(found);
        setCurrentSlide((prev) => Math.max(0, Math.min(prev, found.slides.length - 1)));
      } catch { setError('Unable to connect to the server.'); }
    };
    loadData();
  }, []);

  // Sync slide number to URL
  useEffect(() => {
    setSearchParams({ slide: String(currentSlide + 1) }, { replace: true });
  }, [currentSlide, setSearchParams]);

  const saveStore = async (updatedList: Presentation[]) => {
    const res = await fetch(`${BASE_URL}/store`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ store: { presentations: updatedList } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed.');
    setAllPresentations(updatedList);
    const found = updatedList.find((p) => p.id === id);
    if (found) {
      setPresentation(found);
      saveSnapshot(found);
    }
  };

  const updateSlides = async (newSlides: Slide[]) => {
    await saveStore(allPresentations.map((p) => p.id === id ? { ...p, slides: newSlides } : p));
  };

  // --- Presentation actions ---
  const handleDelete = async () => {
    try { await saveStore(allPresentations.filter((p) => p.id !== id)); navigate('/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete.'); }
  };

  const handleTitleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) { setError('Title cannot be empty.'); return; }
    try {
      await saveStore(allPresentations.map((p) => p.id === id ? { ...p, name: editTitle.trim() } : p));
      setShowTitleModal(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update title.'); }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try { await saveStore(allPresentations.map((p) => p.id === id ? { ...p, thumbnail: reader.result as string } : p)); }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to update thumbnail.'); }
    };
    reader.readAsDataURL(file);
  };

  // --- Slide actions ---
  const totalSlides = presentation?.slides.length || 0;

  const handleAddSlide = async () => {
    if (!presentation) return;
    const newSlides = [...presentation.slides, { elements: [] }];
    try { await updateSlides(newSlides); setCurrentSlide(newSlides.length - 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to add slide.'); }
  };

  const handleDeleteSlide = async () => {
    if (!presentation) return;
    if (totalSlides <= 1) { setError('Cannot delete the only slide. Delete the presentation instead.'); return; }
    const newSlides = presentation.slides.filter((_, i) => i !== currentSlide);
    try { await updateSlides(newSlides); if (currentSlide >= newSlides.length) setCurrentSlide(newSlides.length - 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete slide.'); }
  };

  // --- Element helpers ---
  const currentSlideData: Slide | undefined = presentation?.slides[currentSlide];
  const elements = currentSlideData?.elements || [];
  const renderedElements = draftElements;
  const nextLayer = renderedElements.length > 0 ? Math.max(...renderedElements.map((el) => el.layer)) + 1 : 1;

  const saveElements = async (newElements: SlideElement[]) => {
    if (!presentation) return;
    const newSlides = presentation.slides.map((s, i) => i === currentSlide ? { ...s, elements: newElements } : s);
    await updateSlides(newSlides);
  };

  const handleDeleteElement = async (elId: string) => {
    try {
      await saveElements(renderedElements.filter((el) => el.id !== elId));
      setSelectedElementId((prev) => prev === elId ? null : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete element.');
    }
  };

  useEffect(() => {
    // Sync draft elements when slide or presentation changes
    setDraftElements(elements);  
    setSelectedElementId(null);
    setDragState(null);
  }, [currentSlide, presentation]);

  const clampElementPosition = (element: SlideElement, nextX: number, nextY: number): SlideElement => ({
    ...element,
    x: Math.max(0, Math.min(nextX, 100 - element.width)),
    y: Math.max(0, Math.min(nextY, 100 - element.height)),
  });

  const clampResizedElement = (
    element: SlideElement,
    nextX: number,
    nextY: number,
    nextWidth: number,
    nextHeight: number,
  ): SlideElement => {
    const minWidth = 1;
    const minHeight = 1;

    let x = nextX;
    let y = nextY;
    let width = Math.max(minWidth, nextWidth);
    let height = Math.max(minHeight, nextHeight);

    if (x < 0) {
      width += x;
      x = 0;
    }
    if (y < 0) {
      height += y;
      y = 0;
    }
    if (x + width > 100) {
      width = 100 - x;
    }
    if (y + height > 100) {
      height = 100 - y;
    }

    width = Math.max(minWidth, width);
    height = Math.max(minHeight, height);

    return {
      ...element,
      x,
      y,
      width,
      height,
    };
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if (!slideRef.current || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"]')) return;

    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    setDragState({
      elementId: el.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
      slideRect: slideRef.current.getBoundingClientRect(),
      didMove: false,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, el: SlideElement, corner: ResizeCorner) => {
    if (!slideRef.current || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    setResizeState({
      elementId: el.id,
      corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
      startWidth: el.width,
      startHeight: el.height,
      slideRect: slideRef.current.getBoundingClientRect(),
      didResize: false,
    });
  };

  const getResizeHandleStyle = (corner: ResizeCorner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 10,
      height: 10,
      background: '#ffffff',
      border: '1px solid #000000',
      zIndex: 9999,
      pointerEvents: 'auto',
    };

    if (corner === 'top-left') return { ...base, top: -5, left: -5, cursor: 'nwse-resize' };
    if (corner === 'top-right') return { ...base, top: -5, right: -5, cursor: 'nesw-resize' };
    if (corner === 'bottom-left') return { ...base, bottom: -5, left: -5, cursor: 'nesw-resize' };
    return { ...base, bottom: -5, right: -5, cursor: 'nwse-resize' };
  };

  // --- Text ---
  const openAddTextModal = () => {
    setEditingElementId(null); setTextWidth('25'); setTextHeight('15');
    setTextContent(''); setTextFontSize('1'); setTextColor('#ffffff');
    setTextFontFamily('Arial'); setTextX('0'); setTextY('0'); setShowTextModal(true);
  };
  const openEditTextModal = (el: SlideElement) => {
    setEditingElementId(el.id); setTextWidth(String(el.width)); setTextHeight(String(el.height));
    setTextContent(el.text || ''); setTextFontSize(String(el.fontSize || 1));
    setTextColor(el.color || '#ffffff'); setTextFontFamily(el.fontFamily || 'Arial');
    setTextX(String(el.x)); setTextY(String(el.y));
    setShowTextModal(true);
  };
  const handleTextSave = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(textWidth), h = parseFloat(textHeight), fs = parseFloat(textFontSize);
    const x = parseFloat(textX), y = parseFloat(textY);
    if ([w, h, fs, x, y].some((v) => isNaN(v))) { setError('Please enter valid numbers.'); return; }
    let newEls: SlideElement[];
    if (editingElementId) {
      newEls = renderedElements.map((el) => el.id === editingElementId ? { ...el, text: textContent, fontSize: fs, color: textColor, fontFamily: textFontFamily, x, y } : el);
    } else {
      newEls = [...renderedElements, { id: crypto.randomUUID(), type: 'text' as const, x: 0, y: 0, width: w, height: h, layer: nextLayer, text: textContent, fontSize: fs, color: textColor, fontFamily: textFontFamily }];
    }
    try { await saveElements(newEls); setShowTextModal(false); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save element.'); }
  };

  // --- Image ---
  const openAddImageModal = () => {
    setEditingImageId(null); setImgWidth('30'); setImgHeight('30');
    setImgSrc(''); setImgAlt(''); setImgX('0'); setImgY('0');
    setShowImageModal(true);
  };
  const openEditImageModal = (el: SlideElement) => {
    setEditingImageId(el.id); setImgWidth(String(el.width)); setImgHeight(String(el.height));
    setImgSrc(el.src || ''); setImgAlt(el.alt || '');
    setImgX(String(el.x)); setImgY(String(el.y));
    setShowImageModal(true);
  };
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImgSrc(reader.result as string); };
    reader.readAsDataURL(file);
  };
  const handleImageSave = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(imgWidth), h = parseFloat(imgHeight);
    const x = parseFloat(imgX), y = parseFloat(imgY);
    if ([w, h, x, y].some((v) => isNaN(v))) { setError('Please enter valid numbers.'); return; }
    if (!imgSrc.trim()) { setError('Please provide an image URL or upload a file.'); return; }
    let newEls: SlideElement[];
    if (editingImageId) {
      newEls = renderedElements.map((el) => el.id === editingImageId ? { ...el, src: imgSrc, alt: imgAlt, x, y } : el);
    } else {
      newEls = [...renderedElements, { id: crypto.randomUUID(), type: 'image' as const, x: 0, y: 0, width: w, height: h, layer: nextLayer, src: imgSrc, alt: imgAlt }];
    }
    try { await saveElements(newEls); setShowImageModal(false); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save element.'); }
  };

  // --- Video ---
  const openAddVideoModal = () => {
    setEditingVideoId(null); setVidWidth('40'); setVidHeight('30');
    setVidUrl(''); setVidAutoplay(false); setVidX('0'); setVidY('0');
    setShowVideoModal(true);
  };
  const openEditVideoModal = (el: SlideElement) => {
    setEditingVideoId(el.id); setVidWidth(String(el.width)); setVidHeight(String(el.height));
    setVidUrl(el.videoUrl || ''); setVidAutoplay(el.autoplay || false);
    setVidX(String(el.x)); setVidY(String(el.y));
    setShowVideoModal(true);
  };
  const handleVideoSave = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(vidWidth), h = parseFloat(vidHeight);
    const x = parseFloat(vidX), y = parseFloat(vidY);
    if ([w, h, x, y].some((v) => isNaN(v))) { setError('Please enter valid numbers.'); return; }
    if (!vidUrl.trim()) { setError('Please provide a YouTube embed URL.'); return; }
    let newEls: SlideElement[];
    if (editingVideoId) {
      newEls = renderedElements.map((el) => el.id === editingVideoId ? { ...el, videoUrl: vidUrl, autoplay: vidAutoplay, x, y } : el);
    } else {
      newEls = [...renderedElements, { id: crypto.randomUUID(), type: 'video' as const, x: 0, y: 0, width: w, height: h, layer: nextLayer, videoUrl: vidUrl, autoplay: vidAutoplay }];
    }
    try { await saveElements(newEls); setShowVideoModal(false); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save element.'); }
  };

  // --- Code ---
  const detectLanguage = (code: string): string => {
    if (/^\s*#\s*include\s|int\s+main\s*\(|printf\s*\(|scanf\s*\(|void\s+\w+\s*\(/.test(code)) return 'c';
    if (/^\s*(def |import |from |class \w+:|print\s*\(|if __name__|elif |^\s*#.*coding)/.test(code)) return 'python';
    return 'javascript';
  };

  const highlightCode = (code: string, lang: string): string => {
    let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Comments
    if (lang === 'python') {
      escaped = escaped.replace(/(#.*)/gm, '<span class="code-comment">$1</span>');
    } else {
      escaped = escaped.replace(/(\/\/.*)/gm, '<span class="code-comment">$1</span>');
    }

    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;|'.*?'|`.*?`|".*?")/g, '<span class="code-string">$1</span>');

    // Keywords
    let keywords: string[];
    if (lang === 'c') {
      keywords = ['int', 'float', 'double', 'char', 'void', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'struct', 'typedef', 'enum', 'const', 'static', 'include', 'define', 'NULL', 'sizeof'];
    } else if (lang === 'python') {
      keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'print', 'self', 'raise'];
    } else {
      keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'new', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'console'];
    }
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    escaped = escaped.replace(kwRegex, '<span class="code-keyword">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');

    return escaped;
  };

  const openAddCodeModal = () => {
    setEditingCodeId(null); setCodeWidth('40'); setCodeHeight('30');
    setCodeContent(''); setCodeFontSize('0.8'); setCodeX('0'); setCodeY('0');
    setShowCodeModal(true);
  };
  const openEditCodeModal = (el: SlideElement) => {
    setEditingCodeId(el.id); setCodeWidth(String(el.width)); setCodeHeight(String(el.height));
    setCodeContent(el.code || ''); setCodeFontSize(String(el.codeFontSize || 0.8));
    setCodeX(String(el.x)); setCodeY(String(el.y));
    setShowCodeModal(true);
  };
  const handleCodeSave = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(codeWidth), h = parseFloat(codeHeight), fs = parseFloat(codeFontSize);
    const x = parseFloat(codeX), y = parseFloat(codeY);
    if ([w, h, fs, x, y].some((v) => isNaN(v))) { setError('Please enter valid numbers.'); return; }
    let newEls: SlideElement[];
    if (editingCodeId) {
      newEls = renderedElements.map((el) => el.id === editingCodeId ? { ...el, code: codeContent, codeFontSize: fs, x, y } : el);
    } else {
      newEls = [...renderedElements, { id: crypto.randomUUID(), type: 'code' as const, x: 0, y: 0, width: w, height: h, layer: nextLayer, code: codeContent, codeFontSize: fs }];
    }
    try { await saveElements(newEls); setShowCodeModal(false); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save element.'); }
  };

  // --- Background ---
  const bgToStyle = (bg?: SlideBackground): React.CSSProperties => {
    if (!bg) return {};
    if (bg.type === 'solid') return { background: bg.color || '#1a1c22' };
    if (bg.type === 'gradient') return { background: `linear-gradient(${bg.gradientDirection || 'to bottom'}, ${bg.gradientColor1 || '#1a1c22'}, ${bg.gradientColor2 || '#7c5cff'})` };
    if (bg.type === 'image') return { backgroundImage: `url(${bg.imageSrc || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return {};
  };

  const getEffectiveBg = (slide?: Slide): SlideBackground | undefined => {
    if (slide?.background) return slide.background;
    return presentation?.defaultBackground;
  };

  const openBgModal = () => {
    const slideBg = currentSlideData?.background;
    const defBg = presentation?.defaultBackground;
    const bg = slideBg || defBg;
    setBgIsDefault(!slideBg);
    if (bg) {
      setBgType(bg.type);
      setBgColor(bg.color || '#1a1c22');
      setBgGradColor1(bg.gradientColor1 || '#1a1c22');
      setBgGradColor2(bg.gradientColor2 || '#7c5cff');
      setBgGradDirection(bg.gradientDirection || 'to bottom');
      setBgImageSrc(bg.imageSrc || '');
    } else {
      setBgType('solid');
      setBgColor('#1a1c22');
      setBgGradColor1('#1a1c22');
      setBgGradColor2('#7c5cff');
      setBgGradDirection('to bottom');
      setBgImageSrc('');
    }
    setShowBgModal(true);
  };

  const handleBgImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setBgImageSrc(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const buildBgFromState = (): SlideBackground => {
    if (bgType === 'solid') return { type: 'solid', color: bgColor };
    if (bgType === 'gradient') return { type: 'gradient', gradientColor1: bgGradColor1, gradientColor2: bgGradColor2, gradientDirection: bgGradDirection };
    return { type: 'image', imageSrc: bgImageSrc };
  };

  const handleBgSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!presentation) return;
    const newBg = buildBgFromState();
    try {
      if (bgIsDefault) {
        // Update the default background on the presentation, and apply to all slides that haven't been individually customized
        const newSlides = presentation.slides.map((s) => {
          if (!s.background) return s; // no individual override — will inherit the new default
          return s;
        });
        await saveStore(allPresentations.map((p) => p.id === id ? { ...p, defaultBackground: newBg, slides: newSlides } : p));
      } else {
        // Set individual slide background
        const newSlides = presentation.slides.map((s, i) => i === currentSlide ? { ...s, background: newBg } : s);
        await updateSlides(newSlides);
      }
      setShowBgModal(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save background.'); }
  };

  const handleBgReset = async () => {
    if (!presentation) return;
    try {
      // Remove individual slide background so it falls back to default
      const newSlides = presentation.slides.map((s, i) => {
        if (i !== currentSlide) return s;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const { background: _removed, ...rest } = s;
        return rest as Slide;
      });
      await updateSlides(newSlides);
      setShowBgModal(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reset background.'); }
  };

  // --- Double-click & keyboard ---
  const handleElementClick = (el: SlideElement) => {
    setSelectedElementId(el.id);
  };

  const handleElementDoubleClick = (el: SlideElement) => {
    if (el.type === 'text') openEditTextModal(el);
    else if (el.type === 'image') openEditImageModal(el);
    else if (el.type === 'video') openEditVideoModal(el);
    else if (el.type === 'code') openEditCodeModal(el);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && currentSlide > 0) setCurrentSlide((p) => p - 1);
      else if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) setCurrentSlide((p) => p + 1);
      else if (e.key === 'Escape') {
        setShowDeleteModal(false);
        setShowTitleModal(false);
        setShowTextModal(false);
        setShowImageModal(false);
        setShowVideoModal(false);
        setShowCodeModal(false);
        setShowBgModal(false);
        setShowSlidePanel(false);
        setShowHistoryModal(false);
        setSelectedElementId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides]);

  useEffect(() => {
    setDraftElements(elements);  
  }, [elements, currentSlide]);

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const pixelDeltaX = e.clientX - dragState.startMouseX;
      const pixelDeltaY = e.clientY - dragState.startMouseY;
      const deltaX = (pixelDeltaX / dragState.slideRect.width) * 100;
      const deltaY = (pixelDeltaY / dragState.slideRect.height) * 100;

      if (!dragState.didMove && (Math.abs(pixelDeltaX) > 2 || Math.abs(pixelDeltaY) > 2)) {
        setDragState((prev) => prev ? { ...prev, didMove: true } : prev);
      }

      setDraftElements((prev) => prev.map((el) => {
        if (el.id !== dragState.elementId) return el;
        return clampElementPosition(el, dragState.startX + deltaX, dragState.startY + deltaY);
      }));
    };

    const onMouseUp = async () => {
      setDragState(null);

      if (!dragState.didMove) {
        setSelectedElementId(dragState.elementId);
        setDraftElements(elements);
        return;
      }

      try {
        const movedElements = draftElements.map((el) => {
          if (el.id !== dragState.elementId) return el;
          return clampElementPosition(el, el.x, el.y);
        });
        await saveElements(movedElements);
        setSelectedElementId(dragState.elementId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move element.');
        setDraftElements(elements);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, draftElements, elements, saveElements]);

  useEffect(() => {
    if (!resizeState) return;

    const onMouseMove = (e: MouseEvent) => {
      const pixelDeltaX = e.clientX - resizeState.startMouseX;
      const pixelDeltaY = e.clientY - resizeState.startMouseY;
      const deltaX = (pixelDeltaX / resizeState.slideRect.width) * 100;
      const deltaY = (pixelDeltaY / resizeState.slideRect.height) * 100;

      if (!resizeState.didResize && (Math.abs(pixelDeltaX) > 2 || Math.abs(pixelDeltaY) > 2)) {
        setResizeState((prev) => prev ? { ...prev, didResize: true } : prev);
      }

      setDraftElements((prev) => prev.map((el) => {
        if (el.id !== resizeState.elementId) return el;

        let nextX = resizeState.startX;
        let nextY = resizeState.startY;
        let nextWidth = resizeState.startWidth;
        let nextHeight = resizeState.startHeight;

        if (resizeState.corner === 'top-left') {
          nextX = resizeState.startX + deltaX;
          nextY = resizeState.startY + deltaY;
          nextWidth = resizeState.startWidth - deltaX;
          nextHeight = resizeState.startHeight - deltaY;
        } else if (resizeState.corner === 'top-right') {
          nextY = resizeState.startY + deltaY;
          nextWidth = resizeState.startWidth + deltaX;
          nextHeight = resizeState.startHeight - deltaY;
        } else if (resizeState.corner === 'bottom-left') {
          nextX = resizeState.startX + deltaX;
          nextWidth = resizeState.startWidth - deltaX;
          nextHeight = resizeState.startHeight + deltaY;
        } else {
          nextWidth = resizeState.startWidth + deltaX;
          nextHeight = resizeState.startHeight + deltaY;
        }

        return clampResizedElement(el, nextX, nextY, nextWidth, nextHeight);
      }));
    };

    const onMouseUp = async () => {
      setResizeState(null);

      if (!resizeState.didResize) {
        setSelectedElementId(resizeState.elementId);
        setDraftElements(elements);
        return;
      }

      try {
        const resizedElements = draftElements.map((el) => {
          if (el.id !== resizeState.elementId) return el;
          return clampResizedElement(el, el.x, el.y, el.width, el.height);
        });
        await saveElements(resizedElements);
        setSelectedElementId(resizeState.elementId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resize element.');
        setDraftElements(elements);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizeState, draftElements, elements, saveElements]);

  // --- Render ---
  if (!presentation && !error) {
    return <main className="edit-pres"><p className="edit-pres__loading">Loading...</p></main>;
  }

  return (
    <main className="edit-pres">
      <header className="edit-pres__header">
        <button className="edit-pres__back-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <div className="edit-pres__title-group">
          <h1 className="edit-pres__title">{presentation?.name}</h1>
          <button className="edit-pres__edit-title-btn" onClick={() => { setEditTitle(presentation?.name || ''); setShowTitleModal(true); }} aria-label="Edit presentation title">✎</button>
        </div>
        <div className="edit-pres__header-right">
          <label className="edit-pres__thumb-btn">🖼 Thumbnail<input type="file" accept="image/*" onChange={handleThumbnailChange} hidden /></label>
          <button className="edit-pres__delete-btn" onClick={() => setShowDeleteModal(true)}>Delete Presentation</button>
        </div>
      </header>

      {error && (
        <div className="edit-pres__error" role="alert">
          <span>{error}</span>
          <button type="button" className="edit-pres__error-close" onClick={() => setError('')} aria-label="Close error message">✕</button>
        </div>
      )}

      <section className="edit-pres__content">
        {presentation && (
          <div className="edit-pres__slide-area">
            <div className="edit-pres__slide-toolbar">
              <button className="edit-pres__tool-btn" onClick={openAddTextModal}>T+ Add Text</button>
              <button className="edit-pres__tool-btn" onClick={openAddImageModal}>🖼+ Add Image</button>
              <button className="edit-pres__tool-btn" onClick={openAddVideoModal}>▶+ Add Video</button>
              <button className="edit-pres__tool-btn" onClick={openAddCodeModal}>&lt;/&gt; Add Code</button>
              <button className="edit-pres__tool-btn edit-pres__tool-btn--bg" onClick={openBgModal}>🎨 Background</button>
              <div className="edit-pres__toolbar-spacer" />
              <button className="edit-pres__tool-btn edit-pres__tool-btn--panel" onClick={() => setShowSlidePanel(true)} aria-label="Open slide control panel">☰ Slides</button>
              <button className="edit-pres__tool-btn" onClick={() => setShowHistoryModal(true)} aria-label="Version history">🕓 History</button>
              <button
                className="edit-pres__tool-btn"
                onClick={() => window.open(`/preview/${id}?slide=${currentSlide + 1}`, '_blank', 'noopener,noreferrer')}
                aria-label="Preview presentation"
              >
                ▶ Preview
              </button>
              <button className="edit-pres__delete-slide-btn" onClick={handleDeleteSlide}>🗑 Delete Slide</button>
              <button className="edit-pres__add-slide-btn" onClick={handleAddSlide}>+ New Slide</button>
            </div>
            <div className="edit-pres__slide-wrapper">
              {totalSlides > 1 && (
                <button className={`edit-pres__arrow edit-pres__arrow--left${currentSlide === 0 ? ' edit-pres__arrow--disabled' : ''}`} disabled={currentSlide === 0} onClick={() => setCurrentSlide((p) => p - 1)} aria-label="Previous slide">◀</button>
              )}
              <div
                className="edit-pres__slide"
                ref={slideRef}
                style={bgToStyle(getEffectiveBg(currentSlideData))}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => setSelectedElementId(null)}
              >
                <span className="edit-pres__slide-number">{currentSlide + 1}</span>
                {renderedElements.slice().sort((a, b) => a.layer - b.layer).map((el) => (
                  el.type === 'text' ? (
                    <div key={el.id} className={`slide-element slide-element--text${selectedElementId === el.id ? ' slide-element--selected' : ''}`} style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, fontSize: `${el.fontSize || 1}em`, color: el.color || '#ffffff', fontFamily: el.fontFamily || 'Arial', zIndex: el.layer, outline: selectedElementId === el.id ? '1px solid #ffffff' : 'none', overflow: 'visible', cursor: 'move' }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)} onClick={(e) => { e.stopPropagation(); handleElementClick(el); }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick(el); }} onContextMenu={(e) => { e.preventDefault(); handleDeleteElement(el.id); }}>
                      {el.text}
                      {selectedElementId === el.id && (
                        <>
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-right')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-right')} />
                        </>
                      )}
                    </div>
                  ) : el.type === 'image' ? (
                    <div key={el.id} className={`slide-element slide-element--image${selectedElementId === el.id ? ' slide-element--selected' : ''}`} style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer, outline: selectedElementId === el.id ? '1px solid #ffffff' : 'none', overflow: 'visible', cursor: 'move' }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)} onClick={(e) => { e.stopPropagation(); handleElementClick(el); }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick(el); }} onContextMenu={(e) => { e.preventDefault(); handleDeleteElement(el.id); }}>
                      <img src={el.src} alt={el.alt || ''} className="slide-element__img" />
                      {selectedElementId === el.id && (
                        <>
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-right')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-right')} />
                        </>
                      )}
                    </div>
                  ) : el.type === 'video' ? (
                    <div key={el.id} className={`slide-element slide-element--video${selectedElementId === el.id ? ' slide-element--selected' : ''}`} style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer, outline: selectedElementId === el.id ? '1px solid #ffffff' : 'none', overflow: 'visible', cursor: 'move' }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)} onClick={(e) => { e.stopPropagation(); handleElementClick(el); }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick(el); }} onContextMenu={(e) => { e.preventDefault(); handleDeleteElement(el.id); }}>
                      <iframe
                        src={`${el.videoUrl || ''}${el.autoplay ? (el.videoUrl?.includes('?') ? '&' : '?') + 'autoplay=1' : ''}`}
                        title="Video"
                        className="slide-element__video"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        style={{ pointerEvents: 'none' }}
                      />
                      {selectedElementId === el.id && (
                        <>
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-right')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-right')} />
                        </>
                      )}
                    </div>
                  ) : (
                    <div key={el.id} className={`slide-element slide-element--code${selectedElementId === el.id ? ' slide-element--selected' : ''}`} style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, fontSize: `${el.codeFontSize || 0.8}em`, zIndex: el.layer, outline: selectedElementId === el.id ? '1px solid #ffffff' : 'none', overflow: 'visible', cursor: 'move' }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)} onClick={(e) => { e.stopPropagation(); handleElementClick(el); }} onDoubleClick={(e) => { e.stopPropagation(); handleElementDoubleClick(el); }} onContextMenu={(e) => { e.preventDefault(); handleDeleteElement(el.id); }}>
                      <pre className="slide-element__pre"><code dangerouslySetInnerHTML={{ __html: highlightCode(el.code || '', detectLanguage(el.code || '')) }} /></pre>
                      {selectedElementId === el.id && (
                        <>
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('top-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'top-right')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-left')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-left')} />
                          <div data-resize-handle="true" style={getResizeHandleStyle('bottom-right')} onMouseDown={(e) => handleResizeMouseDown(e, el, 'bottom-right')} />
                        </>
                      )}
                    </div>
                  )
                ))}
                {renderedElements.length === 0 && <p className="edit-pres__slide-placeholder">Slide {currentSlide + 1}</p>}
              </div>
              {totalSlides > 1 && (
                <button className={`edit-pres__arrow edit-pres__arrow--right${currentSlide === totalSlides - 1 ? ' edit-pres__arrow--disabled' : ''}`} disabled={currentSlide === totalSlides - 1} onClick={() => setCurrentSlide((p) => p + 1)} aria-label="Next slide">▶</button>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Slide control panel */}
      {showSlidePanel && presentation && (
        <div className="modal-overlay" onClick={() => setShowSlidePanel(false)}>
          <div className="slide-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Slide control panel">
            <div className="slide-panel__header">
              <div>
                <h2 className="slide-panel__title">Slide control panel</h2>
                <p className="slide-panel__subtitle">Drag to reorder. Click to navigate.</p>
              </div>
              <button
                type="button"
                className="slide-panel__close"
                onClick={() => setShowSlidePanel(false)}
                aria-label="Close slide control panel"
              >
                ✕
              </button>
            </div>
            <div className="slide-panel__grid">
              {presentation.slides.map((slide, index) => {
                const bg = getEffectiveBg(slide);
                const sortedEls = [...(slide.elements || [])].sort((a, b) => a.layer - b.layer);
                return (
                  <div
                    key={`slide-panel-${index}`}
                    className={`slide-panel__item${index === currentSlide ? ' slide-panel__item--active' : ''}${dragOverIndex === index ? ' slide-panel__item--drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDragStartIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.classList.add('slide-panel__item--dragging');
                      }
                    }}
                    onDragEnd={(e) => {
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.classList.remove('slide-panel__item--dragging');
                      }
                      setDragStartIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragStartIndex !== null && dragStartIndex !== index) {
                        setDragOverIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverIndex((prev) => (prev === index ? null : prev));
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setDragOverIndex(null);
                      if (dragStartIndex === null || dragStartIndex === index) return;
                      const newSlides = [...presentation.slides];
                      const [moved] = newSlides.splice(dragStartIndex, 1);
                      newSlides.splice(index, 0, moved);
                      // Adjust currentSlide to follow the moved slide
                      let newCurrent = currentSlide;
                      if (currentSlide === dragStartIndex) {
                        newCurrent = index;
                      } else if (dragStartIndex < currentSlide && index >= currentSlide) {
                        newCurrent = currentSlide - 1;
                      } else if (dragStartIndex > currentSlide && index <= currentSlide) {
                        newCurrent = currentSlide + 1;
                      }
                      await updateSlides(newSlides);
                      setCurrentSlide(newCurrent);
                      setDragStartIndex(null);
                    }}
                    onClick={() => {
                      if (index !== currentSlide) {
                        setCurrentSlide(index);
                      }
                      setShowSlidePanel(false);
                    }}
                    aria-label={`Slide ${index + 1}`}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Mini-preview */}
                    <div className="slide-panel__preview" style={bgToStyle(bg)}>
                      {sortedEls.map((el) => (
                        el.type === 'text' ? (
                          <div
                            key={el.id}
                            className="slide-panel__el slide-panel__el--text"
                            style={{
                              left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`,
                              fontSize: `${(el.fontSize || 1) * 0.18}em`,
                              color: el.color || '#ffffff',
                              fontFamily: el.fontFamily || 'Arial',
                              zIndex: el.layer,
                            }}
                          >
                            {el.text}
                          </div>
                        ) : el.type === 'image' ? (
                          <img
                            key={el.id}
                            className="slide-panel__el slide-panel__el--img"
                            src={el.src}
                            alt={el.alt || ''}
                            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer }}
                          />
                        ) : el.type === 'code' ? (
                          <div
                            key={el.id}
                            className="slide-panel__el slide-panel__el--code"
                            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer }}
                          />
                        ) : (
                          <div
                            key={el.id}
                            className="slide-panel__el slide-panel__el--video"
                            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer }}
                          >▶</div>
                        )
                      ))}
                    </div>
                    <span className="slide-panel__item-label">Slide {index + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete presentation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Are you sure?</h2>
            <p className="modal__text">This will permanently delete the presentation.</p>
            <div className="modal__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setShowDeleteModal(false)}>No</button>
              <button className="modal__btn modal__btn--danger" onClick={handleDelete}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit title modal */}
      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Edit Title</h2>
            <form className="modal__form" onSubmit={handleTitleSave}>
              <label className="modal__label" htmlFor="edit-title-input">Presentation Title</label>
              <input className="modal__input" id="edit-title-input" type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowTitleModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Text element modal */}
      {showTextModal && (
        <div className="modal-overlay" onClick={() => setShowTextModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{editingElementId ? 'Edit Text' : 'Add Text'}</h2>
            <form className="modal__form" onSubmit={handleTextSave}>
              {!editingElementId && (
                <div className="modal__row">
                  <div className="modal__field"><label className="modal__label" htmlFor="text-w">Width (%)</label><input className="modal__input" id="text-w" type="number" min="1" max="100" step="1" value={textWidth} onChange={(e) => setTextWidth(e.target.value)} /></div>
                  <div className="modal__field"><label className="modal__label" htmlFor="text-h">Height (%)</label><input className="modal__input" id="text-h" type="number" min="1" max="100" step="1" value={textHeight} onChange={(e) => setTextHeight(e.target.value)} /></div>
                </div>
              )}
              <label className="modal__label" htmlFor="text-content">Text</label>
              <textarea className="modal__input modal__textarea" id="text-content" rows={3} value={textContent} onChange={(e) => setTextContent(e.target.value)} />
              <div className="modal__row">
                <div className="modal__field"><label className="modal__label" htmlFor="text-fs">Font Size (em)</label><input className="modal__input" id="text-fs" type="number" min="0.1" max="10" step="0.1" value={textFontSize} onChange={(e) => setTextFontSize(e.target.value)} /></div>
                <div className="modal__field"><label className="modal__label" htmlFor="text-color">Colour (HEX)</label><input className="modal__input" id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></div>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label className="modal__label" htmlFor="text-font">Font Family</label>
                  <select className="modal__input" id="text-font" value={textFontFamily} onChange={(e) => setTextFontFamily(e.target.value)}>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowTextModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">{editingElementId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image element modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{editingImageId ? 'Edit Image' : 'Add Image'}</h2>
            <form className="modal__form" onSubmit={handleImageSave}>
              {!editingImageId && (
                <div className="modal__row">
                  <div className="modal__field"><label className="modal__label" htmlFor="img-w">Width (%)</label><input className="modal__input" id="img-w" type="number" min="1" max="100" step="1" value={imgWidth} onChange={(e) => setImgWidth(e.target.value)} /></div>
                  <div className="modal__field"><label className="modal__label" htmlFor="img-h">Height (%)</label><input className="modal__input" id="img-h" type="number" min="1" max="100" step="1" value={imgHeight} onChange={(e) => setImgHeight(e.target.value)} /></div>
                </div>
              )}
              <label className="modal__label" htmlFor="img-url">Image URL</label>
              <input className="modal__input" id="img-url" type="text" placeholder="https://example.com/image.png" value={imgSrc} onChange={(e) => setImgSrc(e.target.value)} />
              <label className="modal__label" htmlFor="img-file">Or upload from file</label>
              <input className="modal__file-input" id="img-file" type="file" accept="image/*" onChange={handleImageFileChange} />
              {imgSrc && <img className="modal__thumb-preview" src={imgSrc} alt="Preview" />}
              <label className="modal__label" htmlFor="img-alt">Alt Text (description)</label>
              <input className="modal__input" id="img-alt" type="text" placeholder="Describe the image" value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} />
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowImageModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">{editingImageId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video element modal */}
      {showVideoModal && (
        <div className="modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{editingVideoId ? 'Edit Video' : 'Add Video'}</h2>
            <form className="modal__form" onSubmit={handleVideoSave}>
              {!editingVideoId && (
                <div className="modal__row">
                  <div className="modal__field"><label className="modal__label" htmlFor="vid-w">Width (%)</label><input className="modal__input" id="vid-w" type="number" min="1" max="100" step="1" value={vidWidth} onChange={(e) => setVidWidth(e.target.value)} /></div>
                  <div className="modal__field"><label className="modal__label" htmlFor="vid-h">Height (%)</label><input className="modal__input" id="vid-h" type="number" min="1" max="100" step="1" value={vidHeight} onChange={(e) => setVidHeight(e.target.value)} /></div>
                </div>
              )}
              <label className="modal__label" htmlFor="vid-url">YouTube Embed URL</label>
              <input className="modal__input" id="vid-url" type="text" placeholder="https://www.youtube.com/embed/dQw4w9WgXcQ" value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} />
              <label className="modal__checkbox-label">
                <input type="checkbox" checked={vidAutoplay} onChange={(e) => setVidAutoplay(e.target.checked)} />
                Auto-play video
              </label>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowVideoModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">{editingVideoId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Code element modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{editingCodeId ? 'Edit Code' : 'Add Code'}</h2>
            <form className="modal__form" onSubmit={handleCodeSave}>
              {!editingCodeId && (
                <div className="modal__row">
                  <div className="modal__field"><label className="modal__label" htmlFor="code-w">Width (%)</label><input className="modal__input" id="code-w" type="number" min="1" max="100" step="1" value={codeWidth} onChange={(e) => setCodeWidth(e.target.value)} /></div>
                  <div className="modal__field"><label className="modal__label" htmlFor="code-h">Height (%)</label><input className="modal__input" id="code-h" type="number" min="1" max="100" step="1" value={codeHeight} onChange={(e) => setCodeHeight(e.target.value)} /></div>
                </div>
              )}
              <label className="modal__label" htmlFor="code-content">Code</label>
              <textarea className="modal__input modal__textarea modal__textarea--code" id="code-content" rows={8} value={codeContent} onChange={(e) => setCodeContent(e.target.value)} spellCheck={false} />
              <div className="modal__row">
                <div className="modal__field">
                  <label className="modal__label" htmlFor="code-fs">Font Size (em)</label>
                  <input className="modal__input" id="code-fs" type="number" min="0.1" max="5" step="0.1" value={codeFontSize} onChange={(e) => setCodeFontSize(e.target.value)} />
                </div>
                <div className="modal__field">
                  <label className="modal__label">Detected Language</label>
                  <p className="modal__detected-lang">{codeContent ? detectLanguage(codeContent).toUpperCase() : '—'}</p>
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowCodeModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">{editingCodeId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Background modal */}
      {showBgModal && (
        <div className="modal-overlay" onClick={() => setShowBgModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Slide Background</h2>
            <form className="modal__form" onSubmit={handleBgSave}>
              <div className="modal__row">
                <div className="modal__field">
                  <label className="modal__label">Apply to</label>
                  <select className="modal__input" value={bgIsDefault ? 'default' : 'slide'} onChange={(e) => setBgIsDefault(e.target.value === 'default')}>
                    <option value="slide">This slide only</option>
                    <option value="default">Default (all new &amp; unmodified slides)</option>
                  </select>
                </div>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label className="modal__label">Background Type</label>
                  <select className="modal__input" value={bgType} onChange={(e) => setBgType(e.target.value as 'solid' | 'gradient' | 'image')}>
                    <option value="solid">Solid Colour</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>

              {bgType === 'solid' && (
                <div className="modal__row">
                  <div className="modal__field">
                    <label className="modal__label" htmlFor="bg-color">Colour</label>
                    <input className="modal__input" id="bg-color" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                  </div>
                </div>
              )}

              {bgType === 'gradient' && (
                <>
                  <div className="modal__row">
                    <div className="modal__field">
                      <label className="modal__label" htmlFor="bg-grad1">Colour 1</label>
                      <input className="modal__input" id="bg-grad1" type="color" value={bgGradColor1} onChange={(e) => setBgGradColor1(e.target.value)} />
                    </div>
                    <div className="modal__field">
                      <label className="modal__label" htmlFor="bg-grad2">Colour 2</label>
                      <input className="modal__input" id="bg-grad2" type="color" value={bgGradColor2} onChange={(e) => setBgGradColor2(e.target.value)} />
                    </div>
                  </div>
                  <div className="modal__row">
                    <div className="modal__field">
                      <label className="modal__label" htmlFor="bg-dir">Direction</label>
                      <select className="modal__input" id="bg-dir" value={bgGradDirection} onChange={(e) => setBgGradDirection(e.target.value)}>
                        <option value="to bottom">Top → Bottom</option>
                        <option value="to right">Left → Right</option>
                        <option value="to bottom right">Top-Left → Bottom-Right</option>
                        <option value="to bottom left">Top-Right → Bottom-Left</option>
                        <option value="to top">Bottom → Top</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal__bg-preview" style={{ background: `linear-gradient(${bgGradDirection}, ${bgGradColor1}, ${bgGradColor2})` }} />
                </>
              )}

              {bgType === 'image' && (
                <>
                  <label className="modal__label" htmlFor="bg-img-url">Image URL</label>
                  <input className="modal__input" id="bg-img-url" type="text" placeholder="https://example.com/bg.jpg" value={bgImageSrc} onChange={(e) => setBgImageSrc(e.target.value)} />
                  <label className="modal__label" htmlFor="bg-img-file">Or upload from file</label>
                  <input className="modal__file-input" id="bg-img-file" type="file" accept="image/*" onChange={handleBgImageFile} />
                  {bgImageSrc && <div className="modal__bg-preview" style={{ backgroundImage: `url(${bgImageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                </>
              )}

              <div className="modal__actions">
                {currentSlideData?.background && (
                  <button type="button" className="modal__btn modal__btn--reset" onClick={handleBgReset}>Reset to Default</button>
                )}
                <button type="button" className="modal__btn modal__btn--cancel" onClick={() => setShowBgModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--create">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Revision history modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Revision history">
            <div className="history-modal__header">
              <div>
                <h2 className="history-modal__title">Revision History</h2>
                <p className="history-modal__subtitle">Click &quot;Restore&quot; to revert all slides to a previous state.</p>
              </div>
              <button type="button" className="slide-panel__close" onClick={() => setShowHistoryModal(false)} aria-label="Close history">✕</button>
            </div>
            <div className="history-modal__list">
              {(() => {
                const history = loadHistory();
                if (history.length === 0) return <p className="history-modal__empty">No revision history yet. History is captured automatically as you edit (at most once per minute).</p>;
                return [...history].reverse().map((entry) => {
                  const date = new Date(entry.timestamp);
                  const timeStr = date.toLocaleString();
                  return (
                    <div key={entry.timestamp} className="history-entry">
                      <div className="history-entry__info">
                        <span className="history-entry__time">{timeStr}</span>
                        <span className="history-entry__detail">{entry.slides.length} slide{entry.slides.length !== 1 ? 's' : ''}</span>
                      </div>
                      <button type="button" className="history-entry__restore" onClick={() => restoreFromHistory(entry)}>Restore</button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default EditPresentation;