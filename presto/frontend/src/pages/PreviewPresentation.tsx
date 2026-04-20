import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './PreviewPresentation.css';

const BACKEND_PORT = 5500;
const BASE_URL = `http://localhost:${BACKEND_PORT}`;

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'code';
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  src?: string;
  alt?: string;
  videoUrl?: string;
  autoplay?: boolean;
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
  slides: Slide[];
  defaultBackground?: SlideBackground;
}

function escapeHtml(code: string) {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectLanguage(code: string) {
  if (/^\s*</.test(code)) return 'html';
  if (/\b(const|let|var|function|=>|console\.log|import|export)\b/.test(code)) return 'javascript';
  if (/\b(def|import |print\(|self|None|True|False)\b/.test(code)) return 'python';
  if (/\b(public|private|class|static|void|System\.out)\b/.test(code)) return 'java';
  if (/\bSELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE TABLE\b/i.test(code)) return 'sql';
  return 'plain';
}

function highlightCode(code: string, language: string) {
  let html = escapeHtml(code);
  if (language === 'javascript') {
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|new|class|extends|try|catch|throw|await|async)\b/g, '<span class="preview-code__kw">$1</span>');
    html = html.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="preview-code__str">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="preview-code__num">$1</span>');
  } else if (language === 'python') {
    html = html.replace(/\b(def|return|if|elif|else|for|while|import|from|as|class|try|except|raise|with|lambda|pass|True|False|None)\b/g, '<span class="preview-code__kw">$1</span>');
    html = html.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="preview-code__str">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="preview-code__num">$1</span>');
  } else if (language === 'html') {
    html = html.replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span class="preview-code__kw">$2</span>');
    html = html.replace(/([a-zA-Z-:]+)=/g, '<span class="preview-code__attr">$1</span>=');
    html = html.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="preview-code__str">$1</span>');
  }
  return html;
}

function bgToStyle(bg?: SlideBackground) {
  if (!bg) return { background: '#1a1c22' };
  if (bg.type === 'solid') return { background: bg.color || '#1a1c22' };
  if (bg.type === 'gradient') {
    return {
      background: `linear-gradient(${bg.gradientDirection || 'to bottom'}, ${bg.gradientColor1 || '#1a1c22'}, ${bg.gradientColor2 || '#7c5cff'})`,
    };
  }
  if (bg.type === 'image' && bg.imageSrc) {
    return {
      backgroundImage: `url(${bg.imageSrc})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return { background: '#1a1c22' };
}

export default function PreviewPresentation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('token');
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(() => {
    const raw = Number(searchParams.get('slide') || '1');
    return Number.isFinite(raw) && raw > 0 ? raw - 1 : 0;
  });
  const slideRef = useRef<HTMLDivElement>(null);

  /**
   * Restarts the CSS enter-animation by toggling the animation class.
   * Uses a forced reflow (reading offsetWidth) so the browser treats
   * the re-added class as a fresh animation.
   */
  const triggerTransition = () => {
    const el = slideRef.current;
    if (!el) return;
    el.classList.remove('preview-slide--enter');
    void el.offsetWidth;
    el.classList.add('preview-slide--enter');
  };

  /** Navigate to a specific slide index (no-op if already there). */
  const goToSlide = (next: number) => {
    if (next === currentSlide) return;
    setCurrentSlide(next);
  };

  // Trigger the enter animation on every slide change after the initial mount
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerTransition();
  }, [currentSlide]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchPresentation = async () => {
      try {
        const res = await fetch(`${BASE_URL}/store`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load presentation.');
          return;
        }
        const presentations: Presentation[] = (data.store?.presentations || []).map((p: Presentation) => ({
          ...p,
          slides: (p.slides || [{}]).map((s: Slide | object) => ('elements' in s ? s : { elements: [] })),
        }));
        const found = presentations.find((p) => p.id === id);
        if (!found) {
          setError('Presentation not found.');
          return;
        }
        setPresentation(found);
        setCurrentSlide((prev) => Math.max(0, Math.min(prev, found.slides.length - 1)));
      } catch {
        setError('Unable to connect to the server.');
      }
    };

    fetchPresentation();
  }, [id, navigate, token]);

  const totalSlides = presentation?.slides.length || 0;
  const currentSlideData = presentation?.slides[currentSlide];
  const elements = currentSlideData?.elements || [];

  const getEffectiveBg = (slide?: Slide) => slide?.background || presentation?.defaultBackground;

  // Sync slide number to URL
  useEffect(() => {
    setSearchParams({ slide: String(currentSlide + 1) }, { replace: true });
  }, [currentSlide, setSearchParams]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(prev + 1, Math.max(totalSlides - 1, 0)));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [totalSlides]);

  if (error) {
    return (
      <main className="preview-page preview-page--error">
        <div className="preview-error">
          <h1>Preview unavailable</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="preview-page">
      <div className="preview-topbar">
        <div className="preview-topbar__title-group">
          <h1 className="preview-topbar__title">{presentation?.name || 'Presentation Preview'}</h1>
          <p className="preview-topbar__meta">Slide {Math.min(currentSlide + 1, Math.max(totalSlides, 1))} of {Math.max(totalSlides, 1)}</p>
        </div>
        <button type="button" className="preview-topbar__close" onClick={() => window.close()}>
          Close Preview
        </button>
      </div>

      <section className="preview-stage">
        {totalSlides > 1 && (
          <button
            className={`preview-stage__arrow preview-stage__arrow--left${currentSlide === 0 ? ' preview-stage__arrow--disabled' : ''}`}
            type="button"
            onClick={() => goToSlide(Math.max(currentSlide - 1, 0))}
            disabled={currentSlide === 0}
            aria-label="Previous slide"
          >
            ◀
          </button>
        )}

        <div className="preview-slide-shell">
          <div
            ref={slideRef}
            className="preview-slide"
            style={bgToStyle(getEffectiveBg(currentSlideData))}
          >
            <span className="preview-slide__number">{currentSlide + 1}</span>
            {elements.slice().sort((a, b) => a.layer - b.layer).map((el) => (
              el.type === 'text' ? (
                <div
                  key={el.id}
                  className="preview-element preview-element--text"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    fontSize: `${el.fontSize || 1}em`,
                    color: el.color || '#ffffff',
                    fontFamily: el.fontFamily || 'Arial',
                    zIndex: el.layer,
                  }}
                >
                  {el.text}
                </div>
              ) : el.type === 'image' ? (
                <div
                  key={el.id}
                  className="preview-element preview-element--image"
                  style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer }}
                >
                  <img src={el.src} alt={el.alt || ''} className="preview-element__img" />
                </div>
              ) : el.type === 'video' ? (
                <div
                  key={el.id}
                  className="preview-element preview-element--video"
                  style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, zIndex: el.layer }}
                >
                  <iframe
                    src={`${el.videoUrl || ''}${el.autoplay ? (el.videoUrl?.includes('?') ? '&' : '?') + 'autoplay=1' : ''}`}
                    title="Video"
                    className="preview-element__video"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div
                  key={el.id}
                  className="preview-element preview-element--code"
                  style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, fontSize: `${el.codeFontSize || 0.8}em`, zIndex: el.layer }}
                >
                  <pre className="preview-element__pre"><code dangerouslySetInnerHTML={{ __html: highlightCode(el.code || '', detectLanguage(el.code || '')) }} /></pre>
                </div>
              )
            ))}
          </div>
        </div>

        {totalSlides > 1 && (
          <button
            className={`preview-stage__arrow preview-stage__arrow--right${currentSlide === totalSlides - 1 ? ' preview-stage__arrow--disabled' : ''}`}
            type="button"
            onClick={() => goToSlide(Math.min(currentSlide + 1, totalSlides - 1))}
            disabled={currentSlide === totalSlides - 1}
            aria-label="Next slide"
          >
            ▶
          </button>
        )}
      </section>
    </main>
  );
}