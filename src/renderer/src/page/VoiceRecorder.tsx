import React, { useState } from 'react'
import { FiMic, FiStopCircle } from 'react-icons/fi'
import { IoMdCloseCircle } from 'react-icons/io'
import { FaCircleArrowUp } from 'react-icons/fa6'
import { sendVoice } from '@renderer/axios/Request'

interface VoiceRecorderProps {
  sendMessages: (message, type)=>void
}


const VoiceRecorder: React.FC<VoiceRecorderProps> = ({sendMessages}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioBlob(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
    }
  }

  const sendAudioToBackend = async () => {
    if (!audioBlob) return
    const fileName = new Date().getTime().toString()

    const formData = new FormData()
    formData.append('audio', audioBlob,`recording-${fileName}.wav`)

    try {
      const response: string = await sendVoice(formData)
      sendMessages(response, "audio")
      clearAudioBlob()
    } catch (error) {
      console.error('Error uploading audio:', error)
    }
  }

  const clearAudioBlob = () => {
    setAudioBlob(null)
  }

  return (
    <div className="flex items-center justify-center ">
      {!audioBlob && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="p-1  text-white rounded-full flex items-center justify-center relative"
        >
          {isRecording ? (
            <>
              <div className="absolute inset-0 animate-pulse bg-red-400  rounded-full opacity-50"></div>
              <FiStopCircle size={20} color={'black'} />
            </>
          ) : (
            <FiMic size={20} color={'black'} />
          )}
        </button>
      )}
      {audioBlob && (
        <div className="flex gap-2 items-center">
          <audio className={`h-5 w-[250px]`} src={URL.createObjectURL(audioBlob)} controls></audio>
          <button onClick={sendAudioToBackend} className="rounded">
            <FaCircleArrowUp size={20} color={'black'} />
          </button>
          <button onClick={clearAudioBlob} className="rounded">
            <IoMdCloseCircle size={23} color={'black'} />
          </button>
        </div>
      )}
    </div>
  )
}

export default VoiceRecorder
