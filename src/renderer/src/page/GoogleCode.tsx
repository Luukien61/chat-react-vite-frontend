import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCode, loginWithGoogle, User } from '@renderer/axios/Request'
import { toast, ToastContainer } from 'react-toastify'
import { useEffect } from 'react'
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const GoogleCode = () => {
  const [searchParams] = useSearchParams() // Để lấy các search params
  const code = searchParams.get('code')
  const navigate = useNavigate()
  const type = localStorage.getItem('action')

  const handleCodeExchange = async (code: string) => {
    try {
      if (code) {
        let rawUserInfo: User | null = null
        if (type == 'signup') {
          rawUserInfo = await exchangeCode({ code: code })
        }
        if (type == 'login') {
          rawUserInfo = await loginWithGoogle({ code: code })
        }
        if (rawUserInfo) {
          localStorage.setItem('user', JSON.stringify(rawUserInfo))
          navigate('/message')
        }
      }
    } catch (e: any) {
      toast.error(e.response.data)
      await delay(1000)
      navigate('/signup')
    }
  }
  useEffect(() => {
    if (code) {
      handleCodeExchange(code)
    }
  }, [code])
  return (
    <div>
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
      />
    </div>
  )
}

export default GoogleCode
