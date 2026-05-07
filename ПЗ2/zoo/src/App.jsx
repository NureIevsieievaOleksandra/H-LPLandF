import { Routes, Route } from 'react-router-dom'
import AnimalList from './pages/AnimalList'
import AnimalDetail from './pages/AnimalDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/"           element={<AnimalList />} />
      <Route path="/animal/:id" element={<AnimalDetail />} />
    </Routes>
  )
}
