import { HashRouter, Route, Routes } from 'react-router-dom'
import Message from '@renderer/page/Message'
import LogIn from '@renderer/page/LogIn'
import Signup from '@renderer/page/SignUp'
import GoogleCode from '@renderer/page/GoogleCode'
import WhitePage from '@renderer/page/WhitePage'
import Test from '@renderer/test'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/message" element={<Message />} />
        <Route path="/login/*" element={<LogIn />} />
        <Route path="/signup" element={<Signup />} />
        <Route path={'/google'} element={<GoogleCode />} />
        <Route path={'/test'} element={<Test/>}/>
        <Route path={'*'} element={<WhitePage />} />
      </Routes>
    </HashRouter>
  )
}
