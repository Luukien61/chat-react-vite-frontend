/* eslint-disable */
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@renderer/components/ui/carousel'
import { Card, CardContent } from '@renderer/components/ui/card'
import { SlCamera } from 'react-icons/sl'
import {
  addGroupMember,
  ConversationRequest,
  createConversation,
  createGroup,
  deleteGroupMember,
  getAllConversations,
  getAllGroupsIdByUserId,
  getAllParticipants,
  getMessagesByConversationId,
  getParticipant,
  getUserProfile,
  searchConversationByUserIds,
  searchUserByEmail,
  updateProfile,
  User
} from '@renderer/axios/Request'
import { VscSend } from 'react-icons/vsc'
import { CiImageOn } from 'react-icons/ci'
import { debounce } from 'lodash'
import Autoplay from 'embla-carousel-autoplay'

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
import { delay } from '@renderer/page/GoogleCode'

// @ts-ignore
import zalo0 from '@renderer/assets/zalo-1_470158.png'
// @ts-ignore
import zalo1 from '@renderer/assets/quick-message-onboard-1.png'
// @ts-ignore
import zalo2 from '@renderer/assets/inapp-welcome-screen-03.png'
// @ts-ignore
import zalo3 from '@renderer/assets/inapp-welcome-screen-04.jpg'
import VideoCall from '@renderer/components/VideoCall'
import VoiceRecorder from '@renderer/page/VoiceRecorder'
import MessageItem from '@renderer/components/MessageItem'
import { MdOutlineExitToApp, MdOutlineGroupAdd } from 'react-icons/md'
import { Checkbox, Modal, Tooltip } from 'antd'
import { useParticipantStore } from '@renderer/state/AppState'

type QuickMessage = {
  id: string
  recipientId: string
  avatar: string
  text: string
  name: string
  time: Date
  conversationId: string
  type: string
  isGroup: boolean
}

type CarouselItemProps = {
  imageUrl: string
  message: string
}
const CarouselItems: CarouselItemProps[] = [
  {
    imageUrl: zalo0,
    message: 'Boots your business '
  },
  {
    imageUrl: zalo1,
    message: 'Message more, work less'
  },
  {
    imageUrl: zalo2,
    message: 'Stay connected and work on any devices'
  },
  {
    imageUrl: zalo3,
    message: 'Send files with chat'
  }
]

interface GroupCreationProps {
  name: string
  id: string
  senderId: string
  recipients: string[]
  createdAt: Date
}

const initialGroupCreationProps: GroupCreationProps = {
  name: '',
  id: '',
  senderId: '',
  createdAt: new Date(),
  recipients: []
}

const Message = () => {
  const [typingMessage, setTypingMessage] = useState<string>('')
  const [loginUser, setLoginUser] = useState<User | null>(null)
  const [searchUsers, setSearchUsers] = useState<Participant[]>([])
  const [searchUser, setSearchUser] = useState<string>('')
  const [searchUserGroup, setSearchUserGroup] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentRecipient, setCurrentRecipient] = useState<Participant>()
  const [privateChats, setPrivateChats] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const [allQuickMessages, setAllQuickMessages] = useState<QuickMessage[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>()
  const navigate = useNavigate()
  const [updateRequest, setUpdateRequest] = useState<boolean>(false)
  const [openModal, setOpenModal] = useState<boolean>(false)
  const [phone, setPhone] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [retypePass, setRetypePass] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userAvatar, setUserAvatar] = useState<string>('')
  const [isAvatarChange, setIsAvatarChange] = useState<boolean>(false)
  const [isGoogleAccount, setIsGoogleAccount] = useState<boolean>(false)
  const [isGroup, setIsGroup] = useState<boolean>(false)
  const groupParticipantsRef = useRef<Map<String, Participant>>()
  const [groupCreateRequest, setGroupCreateRequest] =
    useState<GroupCreationProps>(initialGroupCreationProps)
  const [isOpenGroup, setIsOpenGroup] = useState(false)
  const [isOpenAddMem, setIsOpenAddMem] = useState(false)
  const [addMembers, setAddMembers] = useState<string[]>([])
  const { clearParticipantStore } = useParticipantStore()
  const [isOpenExitGroup, setIsOpenExitGroup] = useState(false)

  const debouncedHandleSearching = useRef(
    debounce(
      async (
        value: string,
        userId: string,
        setState: React.Dispatch<React.SetStateAction<Participant[]>>
      ) => {
        if (value != '') {
          let response: Participant[] = await searchUserByEmail(value)
          response = response.filter((value1) => value1.id !== userId)
          setState(response)
        } else {
          setState([])
        }
      },
      500
    )
  ).current

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value: string = event.target.value
    setSearchUser(value)
    debouncedHandleSearching(value, currentUserId, setSearchUsers)
  }

  const handleAddGroupMemChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value: string = event.target.value
    setSearchUserGroup(value)
    debouncedHandleSearching(value, currentUserId)
  }

  const onPrivateMessage = async (payload: ChatMessage, isGroup?: boolean) => {
    updateAllQuickMessage(payload)
    setPrivateChats((prevChats) => {
      const isDup = prevChats.some((item) => item.id === payload.id)
      if (!isDup && prevChats[0] && payload.conversationId === prevChats[0].conversationId) {
        if (isGroup) {
          if (groupParticipantsRef.current) {
            const participant = groupParticipantsRef.current.get(payload.senderId)
            if (participant) {
              payload.senderName = participant.name
              payload.avatar = participant.avatar
            }
          }
        }
        const newChats = [...prevChats, payload]
        handleScroll()
        return newChats
      }
      return prevChats
    })
  }

  const onNotification = (groupId: string, _isGroup?: boolean, params?: any) => {
    subscribeToTopic(`/topic/group/${groupId}`, (groupMessage) => {
      onPrivateMessage(groupMessage, true)
    })
    getAllConversation(params)
  }

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
        handleClickQuickMessage(conversation.id, participantId, false)
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
          avatar: value.groupAvatar || participant.avatar,
          name: value.name || participant.name,
          text: value.lastMessage,
          recipientId: value.name ? value.id : participantId,
          conversationId: value.id,
          time: value.modifiedAt,
          type: value.type,
          isGroup: value.name != null || value.name != undefined
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

  const updateAllQuickMessage = async (payload: ChatMessage) => {
    const participant: Participant = await getParticipant(payload.senderId)
    setAllQuickMessages((prevState) => {
      let isExist = false
      const updatedMessages = prevState.map((message) => {
        if (message.conversationId === payload.conversationId) {
          isExist = true
          return {
            ...message,
            text: payload.content,
            time: payload.timestamp,
            type: payload.type
          }
        }
        return message
      })
      if (!isExist) {
        const newQuickMessage: QuickMessage = {
          id: payload.id,
          conversationId: payload.conversationId,
          recipientId: payload.recipientId,
          text: payload.content,
          name: participant.name,
          avatar: participant.avatar,
          time: payload.timestamp,
          type: payload.type,
          isGroup: false
        }
        updatedMessages.push(newQuickMessage)
      }
      return updatedMessages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    })
  }

  const getMessageByConversationId = async (
    conversationId: string,
    participants: Participant[]
  ) => {
    try {
      let messages: ChatMessage[] = await getMessagesByConversationId(conversationId)
      if (participants.length > 0) {
        messages = messages.map((message) => {
          for (const participant of participants) {
            if (message.senderId == participant.id) {
              return {
                ...message,
                avatar: participant.avatar,
                senderName: participant.name
              }
            }
          }
          return message
        })
      }
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
    const getLogInUser = async (userId: string) => {
      try {
        const user: User = await getUserProfile(userId)
        const id = user.id
        setLoginUser(user)
        setCurrentUserId(id)
        setUserAvatar(user.avatar)
        getAllConversation(id)
        setIsGoogleAccount(id.startsWith('google_'))
        connectWebSocket(() => {
          subscribeToTopic(`/user/${id}/private`, onPrivateMessage, false)
          subscribeToTopic(`/user/${id}/notification`, onNotification, true, id)
          fetchAllGroupIdByUserId(id)
        })
      } catch (e: any) {
        toast.error(e.response.data)
      }
    }
    if (rawUser) {
      const user: User = JSON.parse(rawUser)
      getLogInUser(user.id)
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  const handleClickQuickMessage = async (
    conversationId: string,
    participantId: string,
    isGroup: boolean,
    avatar?: string,
    name?: string
  ) => {
    setIsGroup(isGroup)
    if (isGroup) {
      const participants: Participant[] = await getAllParticipants(conversationId)
      groupParticipantsRef.current = new Map<string, Participant>(
        participants.map((participant) => [participant.id, participant])
      )
      await getMessageByConversationId(conversationId, participants)
      setCurrentConversationId(conversationId)
      if (avatar && name) {
        setCurrentRecipient({
          avatar: avatar,
          name: name,
          id: conversationId
        })
      }
    } else {
      const participant: Participant = await getParticipant(participantId)
      setCurrentRecipient(participant)
      setCurrentConversationId(conversationId)
      // @ts-ignore
      if (!currentRecipient || currentRecipient.id != participantId) {
        await getMessageByConversationId(conversationId, [])
      }
      groupParticipantsRef.current = undefined
      clearParticipantStore()
    }
    await delay(20)
    handleScroll()
  }

  useEffect(() => {
    handleScroll()
  }, [privateChats])

  const sendMessages = async (message: string | null, messageType: string | null) => {
    let type: string
    if (messageType) {
      type = messageType
    } else {
      type = 'text'
    }
    if (message == null) {
      message = typingMessage
      type = 'text'
    }

    if (message.trim() !== '' && currentRecipient && loginUser) {
      let conversationId = currentConversationId || ''
      let isConverExist = true
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
        setCurrentConversationId(conversationId)
        isConverExist = false
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
      if (isGroup) {
        sendMessage(`/app/group/${conversationId}`, messageItem)
      } else {
        sendMessage('/app/private-message', messageItem)
      }
      setTypingMessage('')
      setPrivateChats((prevState) => [...prevState, messageItem])
      handleScroll()
      updateAllQuickMessage(messageItem)
      setSearchUsers([])
      if (!isConverExist) getAllConversation(currentUserId)
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
  const fetchAllGroupIdByUserId = async (userId: string) => {
    try {
      const response: string[] = await getAllGroupsIdByUserId(userId)
      for (const groupId of response) {
        subscribeToTopic(`/topic/group/${groupId}`, onPrivateMessage, true)
      }
    } catch (e) {
      console.log(e)
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
              sendMessages(r, 'image')
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
      sendMessages(null, null)
    }
  }
  const handleLogOut = () => {
    localStorage.removeItem('user')
    localStorage.clear()
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

  const handleUpdateProfile = async () => {
    if ((password && retypePass && password === retypePass) || isGoogleAccount) {
      if (userName && loginUser) {
        let avatarUrl: string | null = userAvatar
        if (isAvatarChange) {
          try {
            avatarUrl = await imageUpload({ image: userAvatar })
          } catch (e: any) {
            toast.error(e.response.data)
          }
        }
        if (avatarUrl) {
          const user: User = {
            userName: userName,
            avatar: avatarUrl,
            phone: phone,
            email: loginUser?.email,
            password: password,
            id: loginUser.id
          }
          try {
            const updateUser: User = await updateProfile(user)
            localStorage.setItem('user', JSON.stringify(updateUser))
            setLoginUser(updateUser)
            setUpdateRequest(false)
          } catch (e: any) {
            toast.error(e.response.data)
          }
        }
      } else {
        toast.error('Please fill your name')
      }
    } else {
      toast.error('Please review your password')
    }
  }

  const handleOpenModal = () => {
    setOpenModal((prevState) => !prevState)
  }

  const handleExitClick = () => {
    if (loginUser) {
      setPassword(loginUser.password)
      // @ts-ignore
      setUserAvatar(loginUser.avatar)
      setRetypePass(loginUser.password)
      setUserName(loginUser.userName)
      setUpdateRequest(false)
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false)
    handleExitClick()
  }
  const handleUpdateRequest = () => {
    if (loginUser) {
      setPhone(loginUser.phone)
      setRetypePass(loginUser.password)
      setUserName(loginUser.userName)
      setPassword(loginUser.password)
      setUserAvatar(loginUser.avatar)
      setUpdateRequest(true)
    }
  }

  const onMemGroupChange = (e, value: QuickMessage) => {
    const isChecked = e.target.checked
    setGroupCreateRequest((prevState) => {
      const updatedRecipients = isChecked
        ? [...prevState.recipients, value.recipientId]
        : prevState.recipients.filter((id) => id !== value.recipientId)
      return {
        ...prevState,
        recipients: updatedRecipients
      }
    })
  }

  const handleCloseGroupCreate = () => {
    setGroupCreateRequest(initialGroupCreationProps)
    setIsOpenGroup(false)
  }

  const handleGroupCreate = async () => {
    if (groupCreateRequest.name) {
      if (groupCreateRequest.recipients.length > 1) {
        const request = groupCreateRequest
        request.senderId = currentUserId
        request.createdAt = new Date()
        request.id = new Date().getTime().toString()
        const response = await createGroup(request)
        if (response.status == 200) {
          handleCloseGroupCreate()
          getAllConversation(currentUserId)
        }
      } else {
        toast.error('Group members must have at least 2 recipients')
      }
    } else {
      toast.error('Please fill your group name')
    }
  }

  const onAddMemberGroupChange = (e, value: QuickMessage) => {
    const isChecked = e.target.checked
    setAddMembers((prevState) => {
      return isChecked
        ? [...prevState, value.recipientId]
        : prevState.filter((id) => id !== value.recipientId)
    })
  }

  const handleAddMembers = async () => {
    try {
      if (currentConversationId) {
        const response = await addGroupMember(currentConversationId, addMembers)
        if (response.status == 200) {
          setAddMembers([])
          setIsOpenAddMem(false)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }

  const onCancelAddGroupMem = () => {
    setIsOpenAddMem(false)
    setAddMembers([])
  }

  const handleDeleteChat = async () => {
    try {
      if (currentConversationId && currentUserId) {
        const response = await deleteGroupMember(currentConversationId, currentUserId)
        if (response.status == 200) {
          getAllConversation(currentUserId)
          setIsOpenExitGroup(false)
          setCurrentRecipient(undefined)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }

  // @ts-ignore
  // @ts-ignore
  return (
    <div className={`overflow-hidden `}>
      <div className={`flex text-[16px] overflow-hidden`}>
        {/*nav*/}
        <div
          className={`w-[25%] px-3 min-w-[300px] h-screen flex flex-col relative min-h-screen  z-10 bg-white border-r border-r-gray-400 border-gray  overflow-hidden `}
        >
          {/*current user*/}
          <div className={`border-b shadow sticky inset-0 z-20 bg-inherit pl-3 pb-3`}>
            <div className={`flex gap-4 pt-4 pl-0 pb-3`}>
              <div onClick={handleOpenModal} className={`flex gap-4 rounded-full cursor-pointer`}>
                <img
                  className={`w-[80px] rounded-full aspect-square object-cover`}
                  src={loginUser?.avatar}
                  alt={'avatar'}
                />
                <div className={`flex items-center justify-start truncate`}>
                  <p className={`font-bold text-[18px]`}>{loginUser ? loginUser.userName : ''}</p>
                </div>
              </div>
            </div>
            <div className={`w-full flex items-center pr-3`}>
              <input
                value={searchUser}
                onChange={handleSearchChange}
                className={`w-[80%] text-[16px] text-black p-2 rounded bg-gray-200 outline-none border `}
                placeholder={'Search email here...'}
                spellCheck={false}
              />
              <div className={`flex-1 flex items-center justify-center`}>
                <MdOutlineGroupAdd
                  onClick={() => setIsOpenGroup(true)}
                  className={`cursor-pointer`}
                  size={28}
                />
              </div>
            </div>
          </div>
          <div className={`overflow-y-scroll`}>
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
                        className={`h-[48px] aspect-square object-cover rounded-[100%]`}
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
                    onClick={() =>
                      handleClickQuickMessage(
                        value.conversationId,
                        value.recipientId,
                        value.isGroup,
                        value.avatar,
                        value.name
                      )
                    }
                    className={`px-2 mt-1 hover:bg-gray-100 border-t cursor-pointer rounded py-3  flex gap-x-2 ${currentRecipient && currentRecipient.id == value.recipientId ? 'bg-[#E5EFFF]' : 'bg-white'}`}
                  >
                    <div className={` flex items-center gap-x-3 w-[90%]`}>
                      <img
                        alt={'user'}
                        className={`h-[48px] aspect-square object-cover rounded-[100%]`}
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
                            {value.type == 'image' && '[Hình ảnh]'}
                            {value.type == 'audio' && '[Voice]'}
                            {value.type == 'text' && value.text}
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
        {currentRecipient ? (
          // content
          <div className={`flex-1 bg-[#EEF0F1] flex flex-col`}>
            {/*header*/}
            <div
              className={`bg-white border-b  transition-transform duration-300 px-3 py-2 flex gap-x-2 items-start`}
            >
              <img
                alt={'user'}
                className={`h-[48px] aspect-square object-cover rounded-[100%]`}
                src={currentRecipient.avatar}
              />
              <p className={`font-bold`}>{currentRecipient.name}</p>
              {!isGroup ? (
                <div  className={`flex-1 items-center gap-3 pr-3 flex justify-end`}>
                  <VideoCall
                    key={`${currentUserId}-${currentRecipient.id}`}
                    senderName={loginUser ? loginUser.userName : ''}
                    senderAvatar={loginUser ? loginUser.avatar : ''}
                    userName={currentRecipient.name}
                    userId={currentUserId}
                    targetUserId={currentRecipient && currentRecipient.id}
                    display={true}
                  />
                </div>
              ) : (
                <div className={`flex-1 h-full gap-4 flex pr-3 items-center justify-end`}>
                  <Tooltip title={'Add new members'}>
                    <MdOutlineGroupAdd
                      onClick={() => setIsOpenAddMem(true)}
                      className={`cursor-pointer`}
                      size={24}
                    />
                  </Tooltip>
                  <Tooltip title={'Exit group'}>
                    <MdOutlineExitToApp
                      onClick={() => setIsOpenExitGroup(true)}
                      className={`cursor-pointer`}
                      size={24}
                    />
                  </Tooltip>
                </div>
              )}
            </div>
            {/*content*/}
            <div className={`flex-1 overflow-hidden relative h-full w-full`}>
              <div className={`absolute inset-0 overflow-y-scroll overflow-x-hidden ml-3 pr-3`}>
                <div className={`min-h-[100%] flex pb-[28px] flex-col  justify-end`}>
                  <div className={`min-h-full flex pb-[48px] gap-y-4 flex-col justify-end `}>
                    {/*message card*/}
                    {privateChats.length > 0 &&
                      privateChats.map((value, index) => (
                        <MessageItem
                          currentUserId={currentUserId}
                          index={index}
                          value={value}
                          isGroup={isGroup}
                          senderName={value.senderName}
                          avatar={value.avatar}
                        />
                      ))}
                  </div>
                  <div className={`h-[14px] break-words `} ref={bottomRef}></div>
                </div>
              </div>
            </div>
            {/*type*/}
            <div className={`flex flex-col bg-white px-3`}>
              <div className={`flex items-center justify-start py-1 gap-3 border-b w-full`}>
                <label className="flex flex-col items-center justify-start w-fit h-full  rounded-lg cursor-pointer  ">
                  <CiImageOn size={26} />
                  <input
                    disabled={!currentRecipient}
                    onChange={handleImageChange}
                    id="dropzone-file"
                    type="file"
                    accept={'image/*'}
                    multiple={true}
                    className="hidden outline-none"
                  />
                </label>
                <VoiceRecorder sendMessages={sendMessages} />
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
                  onClick={() => sendMessages(null, null)}
                  className={`${currentRecipient ? 'cursor-pointer hover:text-green-500' : 'disabled'}`}
                >
                  <VscSend size={28} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // carousel
          <div className={`flex-1 bg-white flex flex-col  w-full`}>
            <div
              className={`flex-1 overflow-hidden  flex items-center justify-center relative h-full w-full`}
            >
             <div className={``}>
               <VideoCall
                 senderName={loginUser ? loginUser.userName : ''}
                 senderAvatar={loginUser ? loginUser.avatar : ''}
                 userName={""}
                 userId={currentUserId}
                 targetUserId={""}
                 display={false}
               />
             </div>
              <Carousel
                plugins={[
                  Autoplay({
                    delay: 2000
                  })
                ]}
                opts={{
                  loop: true
                }}
                className="w-[60%]"
              >
                <CarouselContent>
                  {CarouselItems.map((item, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex items-center flex-col gap-6 justify-center p-6">
                            <img src={item.imageUrl} alt={''} className={``} />
                            <div>
                              <p className={`text-blue-500 font-bold `}>{item.message}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>
        )}

        {/*modal*/}
        <div
          onClick={handleCloseModal}
          className={`backdrop-blur-sm bg-black bg-opacity-60 flex overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full h-full max-h-full ${openModal ? 'block' : 'hidden'}`}
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
                            <label className="flex flex-col  items-center justify-start w-fit h-full  rounded-lg cursor-pointer  ">
                              <div
                                className={`bg-gray-200 w-[30px] flex items-center justify-center border rounded-full aspect-square`}
                              >
                                <SlCamera size={16} />
                              </div>
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
                      {!isGoogleAccount && (
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
                      )}
                      {updateRequest && !isGoogleAccount && (
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
                          onClick={handleUpdateProfile}
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
                          onClick={handleUpdateRequest}
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
        <Modal
          onCancel={handleCloseGroupCreate}
          destroyOnClose={true}
          footer={null}
          open={isOpenGroup}
        >
          <div className={`w-full`}>
            <div className={`w-full flex flex-col gap-4`}>
              <div className={`flex gap-4 overflow-hidden items-center`}>
                <input
                  value={groupCreateRequest.name}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setGroupCreateRequest((prevState) => ({
                      ...prevState,
                      name: newValue
                    }))
                  }}
                  className={`flex-1 text-[16px] text-black p-2 rounded outline-none border-b `}
                  placeholder={'Enter group name '}
                  spellCheck={false}
                />
              </div>
              <input
                value={searchUserGroup}
                onChange={handleAddGroupMemChange}
                className={`w-full text-[16px] text-black p-2 rounded bg-gray-200 outline-none border `}
                placeholder={'Search members here...'}
                spellCheck={false}
              />

              <div className={`flex flex-col gap-2 mt-3`}>
                {allQuickMessages
                  .filter((value) => !value.isGroup)
                  .map((value, index) => (
                    <Checkbox key={index} onChange={(e) => onMemGroupChange(e, value)}>
                      <div className={`flex gap-2 items-center`}>
                        <img
                          alt={'user'}
                          className={`h-[32px] aspect-square object-cover rounded-[100%]`}
                          src={value.avatar}
                        />
                        <p className={`truncate max-w-full text-[#081C36]`}>{value.name}</p>
                      </div>
                    </Checkbox>
                  ))}
              </div>
              <div className={`w-full flex justify-end`}>
                <button
                  onClick={handleGroupCreate}
                  className={`p-1 px-2 rounded bg-blue-500 text-white font-bold hover:bg-blue-600`}
                >
                  Tạo nhóm
                </button>
              </div>
            </div>
          </div>
        </Modal>
        <Modal
          onCancel={onCancelAddGroupMem}
          destroyOnClose={true}
          footer={null}
          open={isOpenAddMem}
        >
          <div className={`w-full`}>
            <div className={`w-full flex flex-col gap-4`}>
              <input
                value={searchUserGroup}
                onChange={handleAddGroupMemChange}
                className={`w-[90%] text-[16px] text-black p-2 rounded bg-gray-200 outline-none border `}
                placeholder={'Search members here...'}
                spellCheck={false}
              />

              <div className={`flex flex-col gap-2 mt-3`}>
                {allQuickMessages
                  .filter((value) => !value.isGroup)
                  .map((value, index) => {
                    const isMember =
                      groupParticipantsRef.current &&
                      groupParticipantsRef.current.get(value.recipientId) != undefined
                    return (
                      <>
                        {isMember ? (
                          <Checkbox key={index} checked={isMember} disabled={isMember}>
                            <div className={`flex gap-2 items-center`}>
                              <img
                                alt={'user'}
                                className={`h-[32px] aspect-square object-cover rounded-[100%]`}
                                src={value.avatar}
                              />
                              <p className={`truncate max-w-full text-[#081C36]`}>{value.name}</p>
                            </div>
                          </Checkbox>
                        ) : (
                          <Checkbox key={index} onChange={(e) => onAddMemberGroupChange(e, value)}>
                            <div className={`flex gap-2 items-center`}>
                              <img
                                alt={'user'}
                                className={`h-[32px] aspect-square object-cover rounded-[100%]`}
                                src={value.avatar}
                              />
                              <p className={`truncate max-w-full text-[#081C36]`}>{value.name}</p>
                            </div>
                          </Checkbox>
                        )}
                      </>
                    )
                  })}
              </div>
              <div className={`w-full flex justify-end`}>
                <button
                  disabled={addMembers.length < 1}
                  onClick={handleAddMembers}
                  className={`p-1 px-2 rounded disabled:opacity-50 bg-blue-500 text-white font-bold hover:bg-blue-600`}
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </Modal>
        <Modal
          onCancel={() => setIsOpenExitGroup(false)}
          destroyOnClose={true}
          footer={null}
          open={isOpenExitGroup}
          width={400}
        >
          <div className={`w-full flex flex-col`}>
            <div className={`w-full pb-3  border-b`}>
              <p className={`font-bold text-[16px]`}>Leave and delete this conversation</p>
            </div>
            <div className={`py-2`}>
              <p>You won't be able to receive messages from this conversation after leaving.</p>
            </div>
            <div className={`w-full flex justify-end`}>
              <button
                onClick={handleDeleteChat}
                className={`p-1 px-2 rounded bg-red-500 text-white font-bold hover:bg-red-600`}
              >
                Rời nhóm
              </button>
            </div>
          </div>
        </Modal>
        <ToastContainer
          position="top-center"
          autoClose={1000}
          hideProgressBar={true}
          newestOnTop={true}
          closeOnClick
        />
      </div>
    </div>
  )
}

export default Message
