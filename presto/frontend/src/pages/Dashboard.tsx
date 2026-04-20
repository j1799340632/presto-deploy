import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const BASE_URL = "https://z5557661-presto-be-deploy.vercel.app";

interface Presentation {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  slides: object[];
}

interface StoreData {
  presentations: Presentation[];
}

function Dashboard() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    // Fetch directly to avoid lint warning about calling setState in effect
    const loadData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/store`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load presentations.');
          return;
        }
        const store: StoreData = data.store || { presentations: [] };
        setPresentations(store.presentations || []);
      } catch {
        setError('Unable to connect to the server.');
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewThumbnail(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName.trim()) {
      setError('Please enter a presentation name.');
      return;
    }

    const newPresentation: Presentation = {
      id: String(Date.now()),
      name: newName.trim(),
      description: newDescription.trim(),
      thumbnail: newThumbnail,
      slides: [{}],
    };

    const updated = [...presentations, newPresentation];

    try {
      const res = await fetch(`${BASE_URL}/store`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ store: { presentations: updated } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create presentation.');
        return;
      }
      setPresentations(updated);
      setShowModal(false);
      setNewName('');
      setNewDescription('');
      setNewThumbnail('');
    } catch {
      setError('Unable to connect to the server.');
    }
  };

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">
          <span aria-hidden="true">🪄</span> Presto
        </h1>
        <div className="dashboard__header-actions">
          <button
            className="dashboard__new-btn"
            onClick={() => setShowModal(true)}
          >
            + New Presentation
          </button>
          <button className="dashboard__logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard__error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="dashboard__error-close"
            onClick={() => setError('')}
            aria-label="Close error message"
          >
            ✕
          </button>
        </div>
      )}

      <section className="dashboard__content">
        {presentations.length === 0 ? (
          <p className="dashboard__empty">
            No presentations yet. Click &quot;+ New Presentation&quot; to get started.
          </p>
        ) : (
          <div className="dashboard__grid">
            {presentations.map((p) => (
              <div
                key={p.id}
                className="dashboard__card"
                onClick={() => navigate(`/presentation/${p.id}`)}
              >
                <div className="dashboard__card-thumb">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} />
                  ) : (
                    <div className="dashboard__card-thumb-empty" />
                  )}
                </div>
                <div className="dashboard__card-info">
                  <h3 className="dashboard__card-name">{p.name}</h3>
                  {p.description && (
                    <p className="dashboard__card-desc">{p.description}</p>
                  )}
                  <span className="dashboard__card-slides">
                    {p.slides.length} {p.slides.length === 1 ? 'slide' : 'slides'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal__title">New Presentation</h2>
            <form className="modal__form" onSubmit={handleCreate}>
              <label className="modal__label" htmlFor="pres-name">
                Name
              </label>
              <input
                className="modal__input"
                id="pres-name"
                type="text"
                placeholder="Presentation name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />

              <label className="modal__label" htmlFor="pres-desc">
                Description
              </label>
              <textarea
                className="modal__input modal__textarea"
                id="pres-desc"
                placeholder="Optional description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />

              <label className="modal__label" htmlFor="pres-thumb">
                Thumbnail
              </label>
              <input
                className="modal__file-input"
                id="pres-thumb"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
              />
              {newThumbnail && (
                <img
                  className="modal__thumb-preview"
                  src={newThumbnail}
                  alt="Thumbnail preview"
                />
              )}

              <div className="modal__actions">
                <button
                  type="button"
                  className="modal__btn modal__btn--cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal__btn modal__btn--create">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;