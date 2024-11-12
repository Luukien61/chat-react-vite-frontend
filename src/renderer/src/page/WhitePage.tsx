import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WhitePage = () => {
  const [code] = useState<string>()
  const navigate = useNavigate()

  useEffect(() => {
    window.api.onUpdateCode((value) => {
      navigate(`/google?code=${value}`)
    })
  },[])


  return <div>
    {code}
  </div>
}

export default WhitePage
