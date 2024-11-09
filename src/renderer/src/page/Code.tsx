import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Code = () => {
  const location = useLocation()
  console.log('Full URL search:', location.search)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    console.log(searchParams)
    const code = searchParams.get('code')

    if (code) {
      console.log('Authorization code:', code)
    } else {
      console.log('No code found in URL')
    }
  }, [])
  return (
    <div className={`min-h-screen flex justify-center rounded w-full`}>
      <div className={`bg-white rounded w-1/2 m-6`}></div>
    </div>
  )
}

export default Code
