import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const WhitePage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    window.api.onUpdateCode((value) => {
      navigate(`/google?code=${value}`)
    })
  }, [])

  return <div></div>
}

export default WhitePage
