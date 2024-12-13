import { BiMessageSquareDetail } from 'react-icons/bi'
import { ChatMessage } from '@renderer/service/WebSocketService'
import React, { useState } from 'react'
import { getAudioCaption, updateMessage } from '@renderer/axios/Request'
import { toast } from 'react-toastify'
import { Spin } from 'antd'

interface MessageItemProps {
  value: ChatMessage
  index: number
  currentUserId: string
}

const MessageItem: React.FC<MessageItemProps> = ({ value, index, currentUserId }) => {
  const [audioCaption, setAudioCaption] = useState<string | undefined>(value.caption)
  const [isAudioCaptionOpen, setIsAudioCaptionOpen] = useState<boolean>(false)
  const fetchAudioCaptions = async (message: ChatMessage) => {
    try {
      const response: { text: string } = await getAudioCaption({ url: value.content })
      if (response) {
        const caption = response.text
        const newMessage = {
          ...message,
          caption: caption
        }
        setAudioCaption(caption)
        value.caption = caption
        await updateMessage(newMessage)
      }
    } catch (e: any) {
      toast.error(e.response.data)
    }
  }

  const handleCaptionClick = () => {
    setIsAudioCaptionOpen((pre) => !pre)
    if (!audioCaption) {
      fetchAudioCaptions(value)
    }
  }

  return (
    <div
      key={index}
      className={`m-x-[16px] w-full flex ${value.senderId != currentUserId ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`w-fit min-w-[80px]  max-w-[50%]  drop-shadow relative block p-[12px] rounded-[8px] ${value.senderId != currentUserId ? 'bg-white' : 'bg-chat_me'}`}
      >
        {value.type == 'text' && (
          <pre className={`break-words  py-1 font-sans text-wrap`}>{value.content}</pre>
        )}
        {value.type == 'image' && (
          <div>
            <img className={`object-contain rounded`} src={value.content} alt={value.content} />
          </div>
        )}
        {value.type == 'audio' && (
          <div className={`flex flex-col gap-1`}>
            <div className={`flex gap-2 items-center`}>
              <audio className={`min-w-[250px] flex-1 !bg-inherit`} src={value.content} controls></audio>
              <div className={`flex justify-end`}>
                <BiMessageSquareDetail
                  onClick={handleCaptionClick}
                  className={`cursor-pointer`}
                  size={24}
                />
              </div>
            </div>
            <div
              className={`${isAudioCaptionOpen ? 'block': 'hidden'}`}
            >
              {!audioCaption ? (
                <div>
                  <Spin size="small" />
                </div>
              ) : (
                <p className={`opacity-70 `}>{audioCaption}</p>
              )}
            </div>
          </div>
        )}
        <p className={`text-[#476285] text-[12px]`}>
          {new Date(value.timestamp).getHours().toString().padStart(2, '0') +
            ':' +
            new Date(value.timestamp).getMinutes().toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  )
}

export default MessageItem
