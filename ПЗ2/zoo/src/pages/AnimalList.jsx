// Рівні 1 & 2 у React-версії:
// fetch() завантажує animals.json → JSON.parse() → фільтрація масиву → рендер карток

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const styles = {
  header: {
    background: '#18181f',
    borderBottom: '1px solid #2a2a35',
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  h1: {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: '1.3rem',
    color: '#f0c040',
  },
  subtitle: { color: '#6b6b85', fontSize: '0.82rem' },
  main: { maxWidth: 960, margin: '0 auto', padding: '32px 20px' },

  filtersBar: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 28,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 200,
    padding: '10px 14px',
    background: '#18181f',
    border: '1px solid #2a2a35',
    borderRadius: 8,
    color: '#e8e8f0',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
  },
  select: {
    padding: '10px 14px',
    background: '#18181f',
    border: '1px solid #2a2a35',
    borderRadius: 8,
    color: '#e8e8f0',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem',
    minWidth: 160,
  },
  count: { color: '#6b6b85', fontSize: '0.82rem' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#18181f',
    border: '1px solid #2a2a35',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform .2s, border-color .2s',
    display: 'block',
  },
  cardImg: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  cardBody: { padding: '12px 16px' },
  cardName: { fontWeight: 600, fontSize: '1rem', color: '#e8e8f0' },
  cardMeta: { fontSize: '0.8rem', color: '#6b6b85', marginTop: 4 },
  cardArrow: {
    fontSize: '0.78rem',
    color: '#f0c040',
    marginTop: 8,
    display: 'inline-block',
  },
  empty: { textAlign: 'center', color: '#6b6b85', padding: '60px 0', gridColumn: '1/-1' },
}

export default function AnimalList() {
  const [animals, setAnimals]   = useState([])
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [hovered, setHovered]   = useState(null)

  //fetch + JSON.parse ──
  useEffect(() => {
    fetch('/animals.json')
      .then(res => res.text())
      .then(text => {
        const data = JSON.parse(text)
        setAnimals(data)
        setLoading(false)
      })
      .catch(err => {
        setError('Помилка завантаження: ' + err.message)
        setLoading(false)
      })
  }, [])

  //фільтрація масиву
  const filtered = animals.filter(animal => {
    const matchSearch = animal.name.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === '' || animal.type === typeFilter
    return matchSearch && matchType
  })

  // Унікальні типи для дропдауну
  const types = [...new Set(animals.map(a => a.type))]

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b6b85' }}>Завантаження...</div>
  if (error)   return <div style={{ textAlign: 'center', padding: 60, color: '#ff4d6d' }}>{error}</div>

  return (
    <>
      <header style={styles.header}>
        <h1 style={styles.h1}>Зоопарк</h1>
        <span style={styles.subtitle}>Оберіть тварину, щоб дізнатись більше</span>
      </header>

      <main style={styles.main}>
        <div style={styles.filtersBar}>
          <input
            style={styles.input}
            placeholder="Пошук за назвою..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={styles.select} value={typeFilter} onChange={e => setType(e.target.value)}>
            <option value="">Всі типи</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={styles.count}>Показано: {filtered.length} з {animals.length}</span>
        </div>

        <div style={styles.grid}>
          {filtered.length === 0
            ? <div style={styles.empty}>Нічого не знайдено</div>
            : filtered.map(animal => (
                <Link
                  key={animal.id}
                  to={`/animal/${animal.id}`}
                  style={{
                    ...styles.card,
                    transform: hovered === animal.id ? 'translateY(-5px)' : 'none',
                    borderColor: hovered === animal.id ? '#f0c040' : '#2a2a35',
                  }}
                  onMouseEnter={() => setHovered(animal.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <img style={styles.cardImg} src={animal.photo} alt={animal.name} />
                  <div style={styles.cardBody}>
                    <div style={styles.cardName}>{animal.name}</div>
                    <div style={styles.cardMeta}>{animal.type} · {animal.habitat}</div>
                    <span style={styles.cardArrow}>Детальніше →</span>
                  </div>
                </Link>
              ))
          }
        </div>
      </main>
    </>
  )
}
