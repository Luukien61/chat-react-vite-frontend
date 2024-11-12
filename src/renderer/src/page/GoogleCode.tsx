import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCode, loginWithGoogle, User } from '@renderer/axios/Request'
import { toast, ToastContainer } from 'react-toastify'
import { useEffect, useState } from 'react'

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const GoogleCode = () => {
  const [searchParams] = useSearchParams() // Để lấy các search params
  const code = searchParams.get('code')
  const navigate = useNavigate()
  const type = localStorage.getItem('action')
  console.log(code)
  const [ggcode]= useState(code)
  const [abc , setabc]= useState<number>(1)

  const handleCodeExchange = async (code: string) => {
    try {
      if (code) {
        setabc(2)
        delay(2000)
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
    if(code && code.length>10){
      handleCodeExchange(code)
    }
  }, [code])
  return (
    <div>
      <p>Exchange</p>
      <p>{ggcode}</p>
      <p>{abc}</p>
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
