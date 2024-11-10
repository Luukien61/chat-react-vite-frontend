/* eslint-disable */
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { SlCamera } from 'react-icons/sl'
import {
  ConversationRequest,
  createConversation,
  getAllConversations,
  getMessagesByConversationId,
  getParticipant,
  searchConversationByUserIds,
  searchUserByEmail,
  User
} from '@renderer/axios/Request'
import { VscSend } from 'react-icons/vsc'
import { CiImageOn } from 'react-icons/ci'
import { debounce } from 'lodash'
import {
  ChatMessage,
  connectWebSocket,
  Conversation,
  Participant,
  sendMessage,
  subscribeToTopic
} from '@renderer/service/WebSocketService'
import { useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import { imageUpload } from '@renderer/service/Upload'

type QuickMessage = {
  id: string
  recipientId: string
  avatar: string
  text: string
  name: string
  time: Date
  conversationId: string
  type: string
}
const Message = () => {
  const [typingMessage, setTypingMessage] = useState<string>('')
  const [loginUser, setLoginUser] = useState<User | null>(null)
  const [searchUsers, setSearchUsers] = useState<Participant[]>([])
  const [searchUser, setSearchUser] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentRecipient, setCurrentRecipient] = useState<Participant>()
  const [privateChats, setPrivateChats] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const [allQuickMessages, setAllQuickMessages] = useState<QuickMessage[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>()
  const navigate = useNavigate()
  const [updateRequest, setUpdateRequest] = useState<boolean>(true)
  const [phone, setPhone] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [retypePass, setRetypePass] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userAvatar, setUserAvatar] = useState<string>('')
  const [isAvatarChange, setIsAvatarChange]= useState<boolean>(false)

  const debouncedHandleSearching = useRef(
    debounce(async (value: string, userId: string) => {
      if (value != '') {
        let response: Participant[] = await searchUserByEmail(value)
        response = response.filter((value1) => value1.id !== userId)
        console.log(response)
        setSearchUsers(response)
      } else {
        setSearchUsers([])
      }
    }, 500)
  ).current

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value: string = event.target.value
    setSearchUser(value)
    debouncedHandleSearching(value, currentUserId)
  }

  const onPrivateMessage = useCallback((payload: ChatMessage) => {
    setPrivateChats((prevChats) => {
      const isDup = prevChats.some((item) => item.id === payload.id)
      if (!isDup) {
        const newChats = [...prevChats, payload]
        updateQuickMessage(payload)
        handleScroll()
        return newChats
      }
      return prevChats
    })
  }, [])

  const handleScroll = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }

  const handleSearchConversationClick = async (participant: Participant) => {
    const participantId = participant.id
    try {
      const conversation: Conversation = await searchConversationByUserIds(
        currentUserId,
        participantId
      )
      if (conversation) {
        handleClickQuickMessage(conversation.id, participantId)
      }
    } catch (e: any) {
      setCurrentRecipient(participant)
      setPrivateChats([])
      setCurrentConversationId(undefined)
    }
  }

  const getAllConversation = async (userId: string) => {
    try {
      const conversations: Conversation[] = await getAllConversations(userId)
      const quickMessagePromises = conversations.map(async (value) => {
        const userIds = value.userIds
        let participantId: string = userIds[1]
        if (userIds[0] !== userId) {
          participantId = userIds[0]
        }
        const participant: Participant = await getParticipant(participantId)
        const quickMessage: QuickMessage = {
          id: value.id,
          avatar: participant.avatar,
          name: participant.name,
          text: value.lastMessage,
          recipientId: participantId,
          conversationId: value.id,
          time: value.modifiedAt,
          type: value.type
        }
        return quickMessage
      })
      const quickMessages = await Promise.all(quickMessagePromises)
      // @ts-ignore
      quickMessages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setAllQuickMessages(quickMessages)
    } catch (e: any) {
      toast.error(e.response.data)
    }
  }

  const updateQuickMessage = useCallback((payload: ChatMessage) => {
    setAllQuickMessages((prevState) => {
      prevState.forEach((message) => {
        if (message.conversationId == payload.conversationId) {
          message.text = payload.content
          message.time = payload.timestamp
          message.type = payload.type
        }
      })
      // @ts-ignore
      return prevState.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    })
  }, [])

  const getMessageByConversationId = async (conversationId: string) => {
    try {
      let messages: ChatMessage[] = await getMessagesByConversationId(conversationId)
      if (messages.length > 0) {
        messages = messages.reverse()
        messages = messages.filter(
          (element, index, self) => index === self.findIndex((e) => e.id === element.id)
        )
      }
      setPrivateChats(messages)
    } catch (e: any) {
      toast.error(e.response.data)
    }
  }

  useEffect(() => {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const user: User = JSON.parse(rawUser)
      setLoginUser(user)
      setCurrentUserId(user.id)
      getAllConversation(user.id)
      setPhone(user.phone)
      setUserName(user.userName)
      setUserAvatar(user.avatar)
      connectWebSocket(() => {
        subscribeToTopic(`/user/${user.id}/private`, onPrivateMessage)
      })
    } else {
      navigate('/login', { replace: true })
    }
    return () => {}
  }, [])

  const handleClickQuickMessage = async (conversationId: string, participantId: string) => {
    const participant: Participant = await getParticipant(participantId)
    setCurrentRecipient(participant)
    setCurrentConversationId(conversationId)
    // @ts-ignore
    if (!currentRecipient || currentRecipient.id != participantId) {
      await getMessageByConversationId(conversationId)
    }
    handleScroll()
  }

  useEffect(() => {
    handleScroll()
  }, [privateChats])

  const sendMessages = async (message: string | null) => {
    let type: string = 'image'
    if (message == null) {
      message = typingMessage
      type = 'text'
    }

    if (message.trim() !== '' && currentRecipient && loginUser) {
      let conversationId = currentConversationId || ''
      if (!currentConversationId) {
        conversationId = Date.now().toString()
        const request: ConversationRequest = {
          id: conversationId, //const uniqueId = uuidv4();
          message: message,
          type: type,
          recipientId: currentRecipient.id,
          senderId: currentUserId,
          createdAt: new Date()
        }
        await createNewConversation(request)
      }
      const messageItem: ChatMessage = {
        id: new Date().getTime().toString(),
        content: message,
        timestamp: new Date(),
        recipientId: currentRecipient.id,
        senderId: loginUser.id,
        conversationId: conversationId,
        type: type
      }
      console.log(messageItem)
      sendMessage('/app/private-message', messageItem)
      setTypingMessage('')
      setPrivateChats((prevState) => [...prevState, messageItem])
      handleScroll()
      updateQuickMessage(messageItem)
      setSearchUsers([])
      getAllConversation(currentUserId)
    }
  }

  const createNewConversation = async (request: ConversationRequest) => {
    try {
      setCurrentConversationId(request.id)
      await createConversation(request)
    } catch (e: any) {
      toast.error(e.response.data)
    }
  }
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          imageUpload({ image: reader.result as string }).then((r) => {
            if (r) {
              sendMessages(r)
            }
          })
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // @ts-ignore
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return
      }
      e.preventDefault()
      sendMessages(null)
    }
  }
  const handleLogOut = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }
  const handleModalClicks = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
  }, [])

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const file = files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setUserAvatar(reader.result as string)
        setIsAvatarChange(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProfile=async ()=>{
    if(password && retypePass && password===retypePass){
      if(userName && loginUser){
        let avatarUrl: string | null = userAvatar
        if(isAvatarChange){
          avatarUrl =await imageUpload({ image: userAvatar })
        }
        if(avatarUrl){
          const user : User ={
            userName: userName,
            avatar: avatarUrl,
            phone: phone,
            email: loginUser?.email,
            password: password,
            id: loginUser.id
          }
        }
      }
      else {
        toast.error("Please fill your name")
      }
    }else {
      toast.error("Please review your password")
    }
  }

  const handleExitClick=()=>{
    setPassword('')
    // @ts-ignore
    setUserAvatar(loginUser?.avatar)
    setPassword('')
    setRetypePass('')
    setUserName('')
    setUpdateRequest(false)
  }
  // @ts-ignore
  return (
    <div className={`flex text-[16px]`}>
      {/*nav*/}
      <div
        className={`w-[25%] min-w-[300px] relative min-h-screen overflow-hidden z-10 bg-white border-r border-r-gray-400 border-gray h-[100vh] overflow-y-auto `}
      >
        {/*current user*/}
        <div className={`border-b shadow sticky inset-0 z-20 bg-inherit pl-3 pb-3`}>
          <div className={`flex gap-4 pt-4 pl-0 pb-3`}>
            <div className={`flex gap-4 rounded-full cursor-pointer`}>
              <img className={`w-[80px] rounded-full `} src={loginUser?.avatar} alt={'avatar'} />
              <div className={`flex items-center justify-start truncate`}>
                <p className={`font-bold text-[18px]`}>{loginUser ? loginUser.userName : ''}</p>
              </div>
            </div>
          </div>
          <div className={`w-full pr-3`}>
            <input
              value={searchUser}
              onChange={handleSearchChange}
              className={`w-full text-[16px] text-black p-2 rounded bg-gray-200 outline-none border `}
              placeholder={'Search contacts here...'}
              spellCheck={false}
            />
          </div>
        </div>
        <div className={`overflow-y-auto`}>
          {/*item*/}
          {searchUsers.length > 0 ? (
            <>
              {searchUsers.map((user, index) => (
                <div
                  onClick={() => handleSearchConversationClick(user)}
                  key={index}
                  className={`px-2 mt-1 hover:bg-gray-100 border-t cursor-pointer rounded py-3  flex gap-x-2 bg-white`}
                >
                  <div className={` flex items-center gap-x-3 w-[90%]`}>
                    <img
                      alt={'user'}
                      className={`h-[48px] aspect-square rounded-[100%]`}
                      src={user.avatar}
                    />
                    <div className={`h-full w-full max-w-full overflow-hidden`}>
                      <div className={`flex`}>
                        <p className={`truncate max-w-full text-[#081C36]`}>{user.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {allQuickMessages.map((value, index) => (
                <div
                  key={index}
                  onClick={() => handleClickQuickMessage(value.conversationId, value.recipientId)}
                  className={`px-2 mt-1 hover:bg-gray-100 border-t cursor-pointer rounded py-3  flex gap-x-2 ${currentRecipient && currentRecipient.id == value.recipientId ? 'bg-[#E5EFFF]' : 'bg-white'}`}
                >
                  <div className={` flex items-center gap-x-3 w-[90%]`}>
                    <img
                      alt={'user'}
                      className={`h-[48px] aspect-square rounded-[100%]`}
                      src={value.avatar}
                    />
                    <div className={`h-full w-full max-w-full overflow-hidden`}>
                      <div className={`flex`}>
                        <p className={`truncate max-w-full text-[#081C36]`}>{value.name}</p>
                        <p className={`flex-1 text-gray-600 flex justify-end items-start`}>
                          {new Date(value.time).getHours().toString().padStart(2, '0') +
                            ':' +
                            new Date(value.time).getMinutes().toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div>
                        <p className={`truncate max-w-[90%] text-gray-500`}>
                          {value.type == 'image' ? '[Hình ảnh]' : value.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      {/*content*/}
      <div className={`flex-1 bg-[#EEF0F1] flex flex-col`}>
        {/*header*/}
        <div
          className={`bg-white transition-transform duration-300 px-3 py-2 flex gap-x-2 items-center`}
        >
          {currentRecipient && (
            <img
              alt={'user'}
              className={`h-[48px] aspect-square rounded-[100%]`}
              src={currentRecipient.avatar}
            />
          )}
          <p>{currentRecipient ? currentRecipient.name : ''}</p>
        </div>
        {/*content*/}
        <div className={`flex-1 overflow-hidden relative h-full w-full`}>
          <div className={`absolute inset-0 overflow-y-scroll overflow-x-hidden ml-3 pr-3`}>
            <div className={`min-h-[100%] flex pb-[28px] flex-col  justify-end`}>
              <div className={`min-h-full flex pb-[48px] gap-y-4 flex-col justify-end `}>
                {/*message card*/}
                {privateChats.length > 0 &&
                  privateChats.map((value, index) => (
                    <div
                      key={index}
                      className={`m-x-[16px] w-full flex ${value.senderId != loginUser?.id ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`w-fit min-w-[80px]  max-w-[50%]  drop-shadow relative block p-[12px] rounded-[8px] ${value.senderId != currentUserId ? 'bg-white' : 'bg-chat_me'}`}
                      >
                        {value.type == 'text' ? (
                          <pre className={`break-words  py-1 font-sans text-wrap`}>
                            {value.content}
                          </pre>
                        ) : (
                          <div>
                            <img
                              className={`object-contain rounded`}
                              src={value.content}
                              alt={value.content}
                            />
                          </div>
                        )}

                        <p className={`text-[#476285] text-[12px]`}>
                          {new Date(value.timestamp).getHours().toString().padStart(2, '0') +
                            ':' +
                            new Date(value.timestamp).getMinutes().toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <div className={`h-[14px] break-words `} ref={bottomRef}></div>
            </div>
          </div>
        </div>
        {/*type*/}
        <div className={`flex flex-col bg-white px-3`}>
          <div className={`flex items-center justify-start py-1 border-b w-full`}>
            <label className="flex flex-col items-center justify-start w-fit h-full  rounded-lg cursor-pointer  ">
              <CiImageOn size={26} />
              <input
                onChange={handleImageChange}
                id="dropzone-file"
                type="file"
                accept={'image/*'}
                multiple={true}
                className="hidden outline-none"
              />
            </label>
          </div>

          <div className={`bg-white  flex py-2 items-center gap-x-3`}>
            <textarea
              disabled={!currentRecipient}
              onKeyDown={handleKeyDown}
              value={typingMessage}
              onChange={(e) => setTypingMessage(e.target.value)}
              spellCheck={false}
              placeholder={'Nhập tin nhắn...'}
              className={`w-full px-3 py-2 outline-none resize-none flex-1 self-center !h-[50px]`}
            />
            <div
              onClick={() => sendMessages(null)}
              className={`cursor-pointer hover:text-green-500 `}
            >
              <VscSend size={28} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`backdrop-blur-sm bg-black bg-opacity-60 flex overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full h-full max-h-full `}
      >
        <div
          onClick={(event) => handleModalClicks(event)}
          className="relative p-4 max-w-[60%] max-h-full"
        >
          <div className="relative bg-[#f5f5f5] rounded-lg flex items-center justify-center min-h-60 shadow ">
            <div className={`overflow-hidden `}>
              <div className="bg-white border-b min-w-[400px] rounded-xl shadow p-5 px-0 relative z-10 min-h-4 ">
                <div className={`flex flex-col gap-3 `}>
                  <img
                    className={`w-[400px] h-[170px] object-cover `}
                    src={
                      'https://res.cloudinary.com/dmi3xizxq/image/upload/v1731252320/30_Gorgeous_Wallpapers_for_Your_Desktop_eguzdi.jpg'
                    }
                    alt={''}
                  />
                  <div className={`flex relative h-[50px] px-2`}>
                    <div className={`h-full relative w-1/4 min-w-[90px]`}>
                      <img
                        className={`absolute rounded-full object-cover  -top-[80%] w-[80px]  aspect-square`}
                        src={userAvatar}
                        alt={'avatar'}
                      />
                      {updateRequest && (
                        <div
                          className={`flex items-center absolute bottom-0 left-[50%] z-50 justify-start py-1  w-full`}
                        >
                          <label className="flex flex-col items-center justify-start w-fit h-full  rounded-lg cursor-pointer  ">
                            <SlCamera size={26} />
                            <input
                              onChange={handleAvatarUpload}
                              type="file"
                              accept={'image/*'}
                              multiple={false}
                              className="hidden outline-none"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    <div className={``}>
                      <p className={`text-black font-bold text-[18px]`}>{loginUser?.userName}</p>
                    </div>
                  </div>
                  <div className={`flex flex-col gap-4 text-[18px] px-3`}>
                    <div className={`flex gap-4 overflow-hidden`}>
                      <p className={`w-[75px]`}>Email: </p>
                      <p className={`truncate text-gray-600`}>{loginUser?.email}</p>
                    </div>
                    {updateRequest && (
                      <div className={`flex gap-4 overflow-hidden`}>
                        <p className={`w-[75px]`}>Name: </p>
                        <input
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          spellCheck={false}
                          className={`outline-none border px-1 text-black rounded `}
                        />
                      </div>
                    )}
                    <div className={`flex gap-4 overflow-hidden`}>
                      <p className={`w-[75px]`}>Phone: </p>

                      {updateRequest ? (
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          spellCheck={false}
                          className={`outline-none border px-1 text-black rounded `}
                        />
                      ) : (
                        <p className={`truncate text-gray-600`}>
                          {loginUser?.phone || 'No number yet'}
                        </p>
                      )}
                    </div>
                    <div className={`flex gap-4 overflow-hidden`}>
                      <p className={`w-[75px]`}>Password: </p>
                      {updateRequest ? (
                        <input
                          type={'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          spellCheck={false}
                          className={`outline-none border px-1 text-black rounded `}
                        />
                      ) : (
                        <p className={`truncate text-gray-600`}>*********</p>
                      )}
                    </div>
                    {updateRequest && (
                      <div className={`flex gap-4 overflow-hidden items-end`}>
                        <p className={`w-[75px]`}>Confirm password: </p>
                        <input
                          type={'password'}
                          value={retypePass}
                          onChange={(e) => setRetypePass(e.target.value)}
                          spellCheck={false}
                          className={`outline-none border px-1 h-fit text-black rounded `}
                        />
                      </div>
                    )}
                  </div>
                  {updateRequest ? (
                    <div className={`flex justify-end gap-4 px-3`}>
                      <button
                        className={`p-2 rounded bg-red-500 text-white font-bold hover:bg-red-600`}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={handleExitClick}
                        className={`p-2 rounded bg-blue-500 text-white font-bold hover:bg-blue-600`}
                      >
                        Exit
                      </button>
                    </div>
                  ) : (
                    <div className={`flex justify-end gap-4 px-3`}>
                      <button
                        onClick={()=>setUpdateRequest(true)}
                        className={`p-2 rounded bg-blue-500 text-white font-bold hover:bg-blue-600`}
                      >
                        Update
                      </button>
                      <button
                        onClick={handleLogOut}
                        className={`p-2 rounded bg-red-500 text-white font-bold hover:bg-red-600`}
                      >
                        LogOut
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

export default Message
