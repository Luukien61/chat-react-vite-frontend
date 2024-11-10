/* eslint-disable */
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { getAllConversations, getMessages, getParticipant, User } from '@renderer/axios/Request'
import { VscSend } from 'react-icons/vsc'
import { CiImageOn } from 'react-icons/ci'
import {
  ChatMessage,
  connectWebSocket,
  Conversation,
  Participant,
  sendMessage,
  subscribeToTopic
} from '@renderer/service/WebSocketService'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
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
  const [searchUser, setSearchUser] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentRecipient, setCurrentRecipient] = useState<Participant>()
  const [privateChats, setPrivateChats] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const [allQuickMessages, setAllQuickMessages] = useState<QuickMessage[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>()
  const navigate = useNavigate()

  const onPrivateMessage = (payload: ChatMessage) => {
    const isDup=privateChats.some(item=>item.id===payload.id)
    if(!isDup){
      setPrivateChats((prevState) => [...prevState, payload])
      handleScroll()
      updateQuickMessage(payload)
    }
  }

  const handleScroll = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }

  const getAllConversation = async (userId: string) => {
    try {
      const conversations: Conversation[] = await getAllConversations(userId)
      const quickMessagePromises = conversations.map(async (value) => {
        let participantId: string = value.user2Id
        if (value.user1Id !== userId) {
          participantId = value.user1Id
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

  const updateQuickMessage = (payload: ChatMessage) => {
    allQuickMessages.forEach((message) => {
      if (message.conversationId == payload.conversationId) {
        message.text = payload.content
        message.time = payload.timestamp
        message.type = payload.type
      }
    })
    // @ts-ignore
    const updateQuickMessage = allQuickMessages.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    setAllQuickMessages(updateQuickMessage)
  }

  const getMessageByConversationId = async (conversationId: string) => {
    let messages: ChatMessage[] = await getMessages(conversationId)
    if (messages.length > 0) {
      messages = messages.reverse()
      messages = messages.filter(
        (element, index, self) => index === self.findIndex((e) => e.id === element.id)
      )
    }
    setPrivateChats(messages)
    handleScroll()
  }

  useEffect(() => {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const user: User = JSON.parse(rawUser)
      setLoginUser(user)
      setCurrentUserId(user.id)
      getAllConversation(user.id)
    } else {
      navigate('/login', { replace: true })
    }
  }, [])
  const handleClickQuickMessage = async (conversationId: string, participantId: string) => {
    const participant: Participant = await getParticipant(participantId)
    setCurrentRecipient(participant)
    setCurrentConversationId(conversationId)
    // @ts-ignore
    if (!currentRecipient || currentRecipient.id != participantId) {
      connectWebSocket(() => {
        subscribeToTopic(`/user/${currentUserId}/private`, onPrivateMessage)
      })
      getMessageByConversationId(conversationId)
      handleScroll()
    }
    handleScroll()
  }

  useEffect(() => {
    handleScroll()
  }, [privateChats])
  const sendMessages = (message: string | null) => {
    let type: string = 'image'
    console.log('message', message)
    if (message == null) {
      message = typingMessage
      type = 'text'
    }
    if (message.trim() !== '' && currentRecipient && currentConversationId && loginUser) {
      console.log(type)
      const messageItem: ChatMessage = {
        id: new Date().getTime().toString(),
        content: message,
        timestamp: new Date(),
        recipientId: currentRecipient.id,
        senderId: loginUser.id,
        conversationId: currentConversationId,
        type: type
      }
      sendMessage('/app/private-message', messageItem)
      setTypingMessage('')
      setPrivateChats((prevState) => [...prevState, messageItem])
      handleScroll()
      updateQuickMessage(messageItem)
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
  const handleLogOut=()=>{
    localStorage.removeItem("user")
    navigate('/login')
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
            <div className={`flex gap-4 rounded-full`}>
              <img className={`w-[80px] rounded-full `} src={loginUser?.avatar} alt={'avatar'} />
              <div className={`flex items-center justify-start truncate`}>
                <p className={`font-bold text-[18px]`}>{loginUser ? loginUser.userName : ''}</p>
              </div>
            </div>
          </div>
          <div className={`w-full pr-3`}>
            <input
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className={`w-full text-[16px] text-black p-2 rounded bg-gray-200 outline-none border `}
              placeholder={'Search contacts here...'}
              spellCheck={false}
            />
          </div>
        </div>
        <div className={`overflow-y-auto`}>
          {/*item*/}
          {allQuickMessages.map((value, index) => (
            <div
              key={index}
              onClick={() => handleClickQuickMessage(value.conversationId, value.recipientId)}
              className={`px-2 mt-1 hover:bg-gray-100 cursor-pointer rounded py-3  flex gap-x-2 ${currentRecipient && currentRecipient.id == value.recipientId ? 'bg-[#E5EFFF]' : 'bg-white'}`}
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
          <div>
            <button onClick={handleLogOut}>Log out</button>
          </div>
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
    </div>
  )
}

export default Message
