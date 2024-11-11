import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const MainApp = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/message")
  },[])
  return <div>
    <p>this is a main page</p>
  </div>
}

export default MainApp
