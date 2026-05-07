
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function AnimalDetail() {
  const { id } = useParams()

  const [animal, setAnimal] = useState(null)
  const [loading, setLoading]= useState(true)
  const [error, setError]         = useState('')

  // Стан форми відгуку
  const [author, setAuthor] = useState('')
  const [text, setText]  = useState('')
  const [rating, setRating] = useState(5)
  const [hoverStar, setHoverStar] = useState(0)
  const [formError, setFormError] = useState('')

  // Відгуки та скарга
  const storageKey = `reviews_${id}`
  const neglectKey = `neglect_${id}`
  const [reviews, setReviews] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || [] }
    catch { return [] }
  })
  const [neglected, setNeglected] = useState(() => {
    return localStorage.getItem(neglectKey) === 'true'
  })

  useEffect(() => {
    fetch('/animals.json')
      .then(res => res.text())
      .then(text => {
        const data = JSON.parse(text)               // JSON.parse
        const found = data.find(a => a.id === Number(id))
        if (!found) setError('Тварину не знайдено')
        else setAnimal(found)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reviews))
  }, [reviews, storageKey])

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!author.trim() || !text.trim()) {
      setFormError("Будь ласка, заповніть ім'я та текст відгуку")
      return
    }
    const newReview = {
      id: Date.now(),
      author: author.trim(),
      text: text.trim(),
      rating,
      date: new Date().toLocaleDateString('uk-UA'),
    }
    setReviews(prev => [newReview, ...prev])
    setAuthor(''); setText(''); setRating(5); setFormError('')
  }

  function toggleNeglect() {
    const next = !neglected
    setNeglected(next)
    localStorage.setItem(neglectKey, String(next))
  }

  function deleteReview(reviewId) {
    setReviews(prev => prev.filter(r => r.id !== reviewId))
  }

  if (loading) return <div style={s.center}>Завантаження...</div>
  if (error)   return <div style={{ ...s.center, color: '#ff4d6d' }}>{error}</div>

  return (
    <>
      <header style={s.header}>
        <Link to="/" style={s.backLink}>← Назад до списку</Link>
        <span style={s.muted}>Зоопарк</span>
      </header>

      <main style={s.main}>
        <div style={s.hero}>
          <img style={s.heroImg} src={animal.photo} alt={animal.name} />
          <div style={s.heroInfo}>
            <div style={s.animalType}>{animal.type} · {animal.habitat}</div>
            <h1 style={s.animalName}>{animal.name}</h1>
            <p style={s.animalDesc}>{animal.description}</p>

            <div style={s.metaRow}>
              {avgRating && (
                <span style={s.avgBadge}>⭐ {avgRating} / 5 ({reviews.length} відгуків)</span>
              )}
            </div>
            <button
              style={{ ...s.neglectBtn, ...(neglected ? s.neglectActive : {}) }}
              onClick={toggleNeglect}
            >
              {neglected ? 'Ви повідомили про погане утримання' : 'Погано доглядають'}
            </button>
            {neglected && (
              <p style={s.neglectNote}>Дякуємо! Адміністрацію повідомлено. Натисніть ще раз, щоб скасувати.</p>
            )}
          </div>
        </div>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Залишити відгук</h2>
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Ваше ім'я</label>
                <input
                  style={s.inputEl}
                  placeholder="Ім'я..."
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Оцінка</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(star => (
                    <span
                      key={star}
                      style={{
                        fontSize: '1.8rem',
                        cursor: 'pointer',
                        color: star <= (hoverStar || rating) ? '#f0c040' : '#2a2a35',
                        transition: 'color .15s',
                      }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverStar(star)}
                      onMouseLeave={() => setHoverStar(0)}
                    >★</span>
                  ))}
                </div>
              </div>

              <div style={{ ...s.formGroup, gridColumn: '1/-1' }}>
                <label style={s.label}>Відгук</label>
                <textarea
                  style={{ ...s.inputEl, minHeight: 90, resize: 'vertical' }}
                  placeholder="Поділіться враженнями..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
              </div>
            </div>

            {formError && <p style={{ color: '#ff4d6d', fontSize: '0.85rem', marginBottom: 10 }}>{formError}</p>}
            <button type="submit" style={s.submitBtn}>Надіслати відгук →</button>
          </form>
        </section>
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Відгуки {reviews.length > 0 && `(${reviews.length})`}</h2>
          {reviews.length === 0
            ? <p style={{ color: '#6b6b85' }}>Ще немає відгуків.</p>
            : reviews.map(r => (
                <div key={r.id} style={s.reviewCard}>
                  <div style={s.reviewHeader}>
                    <div>
                      <span style={s.reviewAuthor}>{r.author}</span>
                      <span style={s.reviewDate}> · {r.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#f0c040', letterSpacing: 2 }}>
                        {'★'.repeat(r.rating)}<span style={{ color: '#2a2a35' }}>{'★'.repeat(5 - r.rating)}</span>
                      </span>
                      <button style={s.deleteBtn} onClick={() => deleteReview(r.id)} title="Видалити">🗑</button>
                    </div>
                  </div>
                  <p style={s.reviewText}>{r.text}</p>
                </div>
              ))
          }
        </section>
      </main>
    </>
  )
}

// Стилі
const s = {
  center: { textAlign: 'center', padding: 60, color: '#6b6b85' },
  header: {
    background: '#18181f',
    borderBottom: '1px solid #2a2a35',
    padding: '14px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: { color: '#f0c040', fontSize: '0.9rem', fontWeight: 600 },
  muted: { color: '#6b6b85', fontSize: '0.82rem' },
  main: { maxWidth: 860, margin: '0 auto', padding: '32px 20px' },

  hero: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
    marginBottom: 40,
    '@media(maxWidth:600px)': { gridTemplateColumns: '1fr' },
  },
  heroImg: { width: '100%', height: 340, objectFit: 'cover', borderRadius: 16, display: 'block' },
  heroInfo: { display: 'flex', flexDirection: 'column', gap: 12 },
  animalType: { color: '#6b6b85', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  animalName: { fontFamily: 'Unbounded, sans-serif', fontSize: '2rem', color: '#e8e8f0', lineHeight: 1.2 },
  animalDesc: { color: '#c0c0d0', lineHeight: 1.7, fontSize: '0.95rem' },
  metaRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  avgBadge: {
    background: '#18181f',
    border: '1px solid #2a2a35',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: '0.85rem',
    color: '#f0c040',
  },
  neglectBtn: {
    marginTop: 8,
    padding: '10px 18px',
    background: 'transparent',
    border: '1px solid #ff4d6d',
    borderRadius: 8,
    color: '#ff4d6d',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'Inter, sans-serif',
    transition: 'all .2s',
    alignSelf: 'flex-start',
  },
  neglectActive: { background: '#ff4d6d', color: 'white' },
  neglectNote: { fontSize: '0.8rem', color: '#6b6b85' },

  section: { marginBottom: 36 },
  sectionTitle: {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: '0.95rem',
    color: '#f0c040',
    marginBottom: 18,
  },

  form: { background: '#18181f', border: '1px solid #2a2a35', borderRadius: 14, padding: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.78rem', color: '#6b6b85', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputEl: {
    background: '#0f0f13',
    border: '1px solid #2a2a35',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e8e8f0',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
    width: '100%',
  },
  submitBtn: {
    padding: '11px 24px',
    background: '#f0c040',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'Unbounded, sans-serif',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },

  reviewCard: {
    background: '#18181f',
    border: '1px solid #2a2a35',
    borderRadius: 12,
    padding: '16px 20px',
    marginBottom: 12,
  },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewAuthor: { fontWeight: 600, fontSize: '0.92rem' },
  reviewDate: { color: '#6b6b85', fontSize: '0.8rem' },
  reviewText: { color: '#c0c0d0', fontSize: '0.9rem', lineHeight: 1.6 },
  deleteBtn: {
    background: 'none', border: 'none', color: '#6b6b85',
    cursor: 'pointer', fontSize: '1rem', padding: '2px 4px',
  },
}
