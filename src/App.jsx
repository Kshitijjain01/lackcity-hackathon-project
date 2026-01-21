import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import HomePage from './components/HomePage.jsx'
import Interaction from './components/interaction.jsx'
import Maps from './components/maps.jsx'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/interaction" element={<Interaction />} />
          <Route path="/maps" element={<Maps />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
