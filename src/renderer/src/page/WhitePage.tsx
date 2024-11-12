import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const WhitePage = () => {
  const navigate = useNavigate();
  const location = window.location.href // Để lấy đường dẫn hiện tại
  const newUrl = location.replace('http://localhost:5173/google','http://localhost:5173/#/google')
  window.location.replace(newUrl);
  // useEffect(() => {
  //   navigate(newUrl)
  // },[newUrl])

  return (
    <div>
      <p>This is a white page</p>
    </div>
  )
}

export default WhitePage
