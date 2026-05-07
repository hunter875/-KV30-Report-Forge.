import { Navigate, Routes, Route } from 'react-router-dom'
import ReportEditor from '@/pages/ReportEditor'
import ReportLauncher from '@/pages/ReportLauncher'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportLauncher />} />
      <Route path="/kv30" element={<ReportEditor />} />
      <Route path="/reports" element={<ReportLauncher />} />
      <Route path="/reports/:id" element={<ReportEditor />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  )
}

export default App
