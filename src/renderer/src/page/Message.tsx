/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react'
import { getAllConversations, getMessages, getParticipant } from '@renderer/axios/Request'
import { VscSend } from 'react-icons/vsc'
import {
  ChatMessage,
  connectWebSocket,
  Conversation,
  Participant,
  sendMessage,
  subscribeToTopic
} from '@renderer/service/WebSocketService'
import { Label } from '@renderer/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { useNavigate } from 'react-router-dom'

const Kien: Participant = {
  name: 'Client A',
  id: '1'
}
type QuickMessage = {
  id: string
  recipientId: string
  avatar: string
  text: string
  name: string
  time: Date
  conversationId: string
}
const Message = () => {
  const [typingMessage, setTypingMessage] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>(Kien.id)
  const [currentRecipient, setCurrentRecipient] = useState<Participant>()
  const [privateChats, setPrivateChats] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const [allQuickMessages, setAllQuickMessages] = useState<QuickMessage[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>()
  const navigate = useNavigate()
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      navigate('/login')
    }
  }, [])

  const onPrivateMessage = (payload: ChatMessage) => {
    setPrivateChats((prevState) => [...prevState, payload])
    handleScroll()
    updateQuickMessage(payload)
  }
  const handleScroll = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }
  const getAllConversation = async () => {
    const conversations: Conversation[] = await getAllConversations(currentUserId)
    const quickMessagePromises = conversations.map(async (value) => {
      let participantId: string = value.user2Id
      if (value.user1Id !== currentUserId) {
        participantId = value.user1Id
      }

      const participant: Participant = await getParticipant(participantId)
      if (!currentRecipient) {
        setCurrentRecipient(participant)
      }
      const quickMessage: QuickMessage = {
        id: value.id,
        avatar:
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiXN9xSEe8unzPBEQOeAKXd9Q55efGHGB9BA&s',
        name: participant.name,
        text: value.lastMessage,
        recipientId: participantId,
        conversationId: value.id,
        time: value.modifiedAt
      }
      return quickMessage
    })
    const quickMessages = await Promise.all(quickMessagePromises)
    // @ts-ignore
    quickMessages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setAllQuickMessages(quickMessages)
  }
  const updateQuickMessage = (payload: ChatMessage) => {
    allQuickMessages.forEach((message) => {
      if (message.conversationId == payload.conversationId) {
        message.text = payload.content
        message.time = payload.timestamp
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
  const handleClickQuickMessage = async (conversationId: string, participantId: string) => {
    const participant: Participant = await getParticipant(participantId)
    setCurrentRecipient(participant)
    setCurrentConversationId(conversationId)
    // @ts-ignore
    if (currentRecipient.id != participantId) {
      connectWebSocket(() => {
        subscribeToTopic(`/user/${currentUserId}/private`, onPrivateMessage)
      })
      getMessageByConversationId(conversationId)
    }
    handleScroll()
  }
  useEffect(() => {
    getAllConversation()
  }, [currentUserId])
  useEffect(() => {
    handleScroll()
  }, [privateChats])
  const sendMessages = () => {
    if (typingMessage.trim() !== '' && currentRecipient && currentConversationId) {
      const messageItem: ChatMessage = {
        id: new Date().getMilliseconds().toString(),
        content: typingMessage,
        timestamp: new Date(),
        recipientId: currentRecipient.id,
        senderId: currentUserId,
        conversationId: currentConversationId
      }
      sendMessage('/app/private-message', messageItem)
      setTypingMessage('')
      setPrivateChats((prevState) => [...prevState, messageItem])
      handleScroll()
      updateQuickMessage(messageItem)
    }
  }

  // @ts-ignore
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendMessages()
    }
  }
  const handleCurrentUserChange = (id: string) => {
    setCurrentUserId(id)
  }

  // @ts-ignore
  return (
    <div className={`flex text-[16px]`}>
      {/*nav*/}
      <div
        className={`w-[408px] z-10 bg-white border-r border-r-gray-400 border-gray h-[100vh] pl-3 overflow-y-auto `}
      >
        {/*current user*/}
        <div>
          <RadioGroup
            onValueChange={(value) => handleCurrentUserChange(value)}
            className={`flex`}
            defaultValue="new"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem className={`text-green-500 border-green-500`} value="1" id="r1" />
              <Label htmlFor="r1">Kien</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem className={`text-green-500 border-green-500`} value="2" id="r2" />
              <Label htmlFor="r2">Nga</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem className={`text-green-500 border-green-500`} value="3" id="r3" />
              <Label htmlFor="r3">Dat</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
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
                <div className={`h-full w-full`}>
                  <div>
                    <p className={`truncate max-w-full text-[#081C36]`}>{value.name}</p>
                  </div>
                  <div>
                    <p className={`truncate max-w-full text-gray-500`}>{value.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/*content*/}
      <div className={`flex-1 bg-[#EEF0F1] flex flex-col`}>
        {/*header*/}
        <div className={`bg-white px-3 py-2 flex gap-x-2 items-center`}>
          <img
            alt={'user'}
            className={`h-[48px] aspect-square rounded-[100%]`}
            src={
              'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiXN9xSEe8unzPBEQOeAKXd9Q55efGHGB9BA&s'
            }
          />
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
                      className={`m-x-[16px] w-full flex ${value.senderId != currentUserId ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`w-fit min-w-[80px]  max-w-[50%]  drop-shadow relative block p-[12px] rounded-[8px] ${value.senderId != currentUserId ? 'bg-white' : 'bg-chat_me'}`}
                      >
                        <pre className={`break-words `}>{value.content} </pre>
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
        <div className={`bg-white px-3 flex py-2 items-center gap-x-3`}>
          <textarea
            value={typingMessage}
            onChange={(e) => setTypingMessage(e.target.value)}
            spellCheck={false}
            placeholder={'Nhap tin nhan...'}
            className={`w-full px-3 py-2 outline-none flex-1`}
          />
          <div onClick={sendMessages} className={`cursor-pointer hover:text-green-500 `}>
            <VscSend size={28} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Message
