import { HashRouter, Route, Routes } from 'react-router-dom'
import Message from '@renderer/page/Message'
import LogIn from '@renderer/page/LogIn'
import Signup from '@renderer/page/SignUp'
import Code from '@renderer/page/Code'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Message />} />
        <Route path="/login/*" element={<LogIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path={'/google/code'} element={<Code />} />
      </Routes>
    </HashRouter>
  )
}
