import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StarField from './components/StarField'
import Landing from './pages/Landing'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import Reflect from './pages/Reflect'
import Reveal from './pages/Reveal'

export default function App() {
  return (
    <BrowserRouter>
      <StarField />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/dashboard/:userId" element={<Dashboard />} />
        <Route path="/date/:dateId/reflect" element={<Reflect />} />
        <Route path="/date/:dateId/reveal" element={<Reveal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
