import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { IoPersonOutline } from 'react-icons/io5'
import { MdOutlineMail } from 'react-icons/md'
import { FiPhone } from 'react-icons/fi'
import { RiLockPasswordLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'
import { createUser, getCode, User } from '@renderer/axios/Request'
// @ts-ignore
import appLogo from '../assets/app-icon.jpg'
// @ts-ignore
import googleLogo from '../assets/google.png'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { googleLogin } from '@renderer/page/LogIn'

type CodeReturn = {
  code: string
  user: User
}
const Signup = () => {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePass, setRetypePass] = useState('')
  const [timer, setTimer] = useState<number>(60)
  const [expired, setExpired] = useState<boolean>(false)
  const [userCode, setUserCode] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  // @ts-ignore
  const [isDone, setIsDone] = useState<boolean>(false)
  const [phone, setPhone] = useState('')
  const navigate = useNavigate()
  const [sendCode, setSendCode] = useState<boolean>(false)
  const intervalTimer = useRef<NodeJS.Timeout | null>(null)
  const [signUpUser, setSignUpUser] = useState<User | null>(null)
  // @ts-ignore
  const [codeReturn, setCodeReturn] = useState<CodeReturn>()

  const generateRandomString = (length: number) => {
    let randomString = ''
    for (let i = 0; i < length; i++) {
      randomString += Math.floor(Math.random() * 10) // Chọn số ngẫu nhiên từ 0 đến 9
    }
    return randomString
  }

  useEffect(() => {
    if (timer === 0 && intervalTimer.current) {
      setExpired(true)
      clearInterval(intervalTimer.current)
      intervalTimer.current = null
    }
  }, [timer])

  const handleCreateUser = async () => {
    if (signUpUser) {
      const savedUser: User = await createUser(signUpUser)
      localStorage.setItem('user', JSON.stringify(savedUser))
      navigate('/message')
    }
  }

  const handleVerifyCode = () => {
    if (userCode.length === 6 && !expired) {
      if (userCode === verificationCode && !expired) {
        setTimeout(() => setIsDone(true), 1000)
        handleCreateUser()
      } else {
        toast.error('Either verification code or expired', {
          hideProgressBar: true,
          autoClose: 1000
        })
      }
    } else {
      toast.error('Either verification code or expired', { hideProgressBar: true, autoClose: 1000 })
    }
  }

  const handleSignup = async () => {
    if (userName && email && password && retypePass) {
      if (password != retypePass) {
        toast.error('Please confirm your password correctly')
      } else {
        const userId = generateRandomString(10)
        const user = {
          id: userId,
          userName: userName,
          email: email,
          password: password,
          phone: phone,
          avatar: 'https://cdn-icons-png.flaticon.com/512/3607/3607444.png'
        }
        try {
          const result: CodeReturn = await getCode(user)
          console.log(result)
          setVerificationCode(result.code)
          setSignUpUser(result.user)
          setSendCode(true)
          intervalTimer.current = setInterval(() => {
            setTimer((prev) => prev - 1)
          }, 1000)
        } catch (e: any) {
          toast.error(e.response.data, { hideProgressBar: true, autoClose: 1000 })
        }
      }
    } else {
      toast.error('Please fill the require fields')
    }
  }

  const handleForwardLogin = () => {
    navigate('/login', { replace: false })
  }

  const handleGoogleSignUp = async () => {
    localStorage.setItem('action', 'signup')
    googleLogin()
  }

  return (
    <div className={`flex justify-center rounded  min-h-screen `}>
      <div className={`w-full mt-2 flex justify-center `}>
        <div className={`w-2/3 rounded bg-white drop-shadow `}>
          <div className={`flex flex-col gap-y-2 justify-center items-center pb-3`}>
            {sendCode ? (
              <div className={`w-3/4 flex-col my-4`}>
                <div className={`flex justify-center`}>
                  <img className={`w-32`} src={appLogo} alt={`${userName}`} />
                </div>
                <div className={`flex flex-col gap-4`}>
                  <div className={`flex justify-center`}>
                    <p>Please check your email to verify this sign up request.</p>
                  </div>
                  <div className={`flex rounded border px-2 items-center py-2 gap-x-4`}>
                    <IoPersonOutline color={`green`} />
                    <input
                      value={userCode}
                      onChange={(e) => {
                        setUserCode(e.target.value)
                      }}
                      placeholder="Code"
                      spellCheck={false}
                      className={`outline-none text-black flex-1`}
                    />
                  </div>
                  <div className={`flex justify-center`}>
                    <p className={`mt-1 text-red-500 `}>
                      Valid timer:<span className={`font-bold`}>{timer}</span>
                    </p>
                  </div>
                  <div className={``}>
                    <button
                      onClick={handleVerifyCode}
                      type={`button`}
                      className={`w-full rounded hover:bg-green-600 text-white bg-green-500 py-2`}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`w-3/4 flex-col my-4`}>
                <div className={`flex justify-center`}>
                  <img className={`w-32`} src={appLogo} alt={`${userName} logo`} />
                </div>
                {/*name*/}
                <div>
                  <div>
                    <p>Your Name</p>
                  </div>
                  <div className={`flex rounded border px-2 items-center py-2 gap-x-4`}>
                    <IoPersonOutline color={`green`} />
                    <input
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value)
                      }}
                      placeholder="Your Name"
                      spellCheck={false}
                      className={`outline-none text-black flex-1`}
                    />
                  </div>
                </div>
                {/*email and phone*/}
                <div className={`flex my-4`}>
                  <div className={`w-1/2 pr-2`}>
                    <div>
                      <p>Email</p>
                    </div>
                    <div className={`flex rounded border px-2 items-center py-2 `}>
                      <MdOutlineMail color={`green`} />
                      <input
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                        }}
                        placeholder="Email"
                        spellCheck={false}
                        className={`outline-none text-black max-w-[90%] flex-1 pl-4`}
                      />
                    </div>
                  </div>
                  <div className={`w-1/2 pl-2`}>
                    <div>
                      <p>Phone</p>
                    </div>
                    <div className={`flex rounded border items-center py-2 px-2 `}>
                      <FiPhone color={`green`} />
                      <input
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                        }}
                        placeholder="Phone"
                        spellCheck={false}
                        className={`outline-none text-black max-w-[90%] flex-1 pl-4`}
                      />
                    </div>
                  </div>
                </div>
                {/*password*/}
                <div className={`my-4`}>
                  <div>
                    <p>Password</p>
                  </div>
                  <div className={`flex rounded border px-2 items-center py-2 gap-x-4`}>
                    <RiLockPasswordLine color={`green`} />
                    <input
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                      }}
                      type={`password`}
                      placeholder="Password"
                      spellCheck={false}
                      className={`outline-none text-black flex-1`}
                    />
                  </div>
                </div>
                {/*retype password*/}
                <div>
                  <div>
                    <p>Retype password</p>
                  </div>
                  <div className={`flex rounded border px-2 items-center py-2 gap-x-4`}>
                    <RiLockPasswordLine color={`green`} />
                    <input
                      value={retypePass}
                      onChange={(e) => {
                        setRetypePass(e.target.value)
                      }}
                      type={`password`}
                      placeholder="Retype password"
                      spellCheck={false}
                      className={`outline-none text-black flex-1`}
                    />
                  </div>
                </div>
                {/*Signup button*/}
                <div className={`mt-8 drop-shadow-2xl`}>
                  <button
                    onClick={handleSignup}
                    type={`button`}
                    className={`w-full rounded hover:bg-green-600 text-white bg-green-500 py-2`}
                  >
                    Sign up
                  </button>
                </div>
                <div className={`flex justify-center my-4`}>
                  <p className={`text-gray-500`}>
                    <i>or</i>
                  </p>
                </div>
                {/*Signup with Google*/}
                <div className={`flex items-center justify-center`}>
                  <button
                    onClick={handleGoogleSignUp}
                    type={`button`}
                    className=" flex  gap-x-3 items-center rounded-2xl bg-gray-100 p-2 hover:bg-gray-200"
                  >
                    <img className={`w-6`} src={googleLogo} alt={`Google Signup`} />
                    Sign up with Google
                  </button>
                </div>
                <div className={`flex items-center justify-center my-4 gap-x-1`}>
                  <p className={`text-[14px] text-gray-700`}>Already have an account? </p>
                  <p
                    onClick={handleForwardLogin}
                    className={`text-[14px] text-green-400 cursor-pointer hover:underline`}
                  >
                    Log in
                  </p>
                </div>
              </div>
            )}

            {/*verification*/}
          </div>
        </div>
      </div>
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

export default Signup

type InputProps = {
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  style?: string
  placeholder: string
}
export const Input: React.FC<InputProps> = ({ icon, value, onChange, placeholder, style }) => {
  return (
    <div className={`flex rounded border items-center py-2 px-2 `}>
      {icon}
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={`outline-none text-black max-w-[90%] flex-1 pl-4 ${style}`}
      />
    </div>
  )
}
