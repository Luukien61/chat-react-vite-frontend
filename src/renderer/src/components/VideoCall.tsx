import React, { useEffect, useRef, useState } from 'react'
import { PhoneIcon, VideoIcon } from 'lucide-react'
import { PiMicrophone } from 'react-icons/pi'
import Peer from 'peerjs'
import { toast } from 'react-toastify'

interface VideoCallProps {
  userId: string
  targetUserId: string
  userName: string
  senderName: string
  senderAvatar: string
  display: boolean
}

export interface CallMetadata {
  callerName: string
  callerAvatar: string
}

const VideoCall: React.FC<VideoCallProps> = ({
  userId,
  targetUserId,
  userName,
  senderName,
  senderAvatar,
  display
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [, setRemoteStream] = useState<MediaStream | null>(null)
  const [start, setStart] = useState<boolean>(false)
  const [comingCall, setComingCall] = useState<boolean>(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<Peer | null>(null)
  const currentCallRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [callerName, setCallerName] = useState<string>(userName)
  const [callerAvatar, setCallerAvatar] = useState<string>('')
  const [muteVideo, setMuteVideo] = useState<boolean>(false)
  const [muteAudio, setMuteAudio] = useState<boolean>(false)
  // @ts-ignore
  const dataConnectionRef = useRef<Peer.DataConnection | null>(null)

  useEffect(() => {
    initPeer()
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy()
      }
    }
  }, [userId])

  const initPeer = () => {
    peerRef.current = new Peer(userId, {
      config: {
        iceServers: [
          {
            urls: [
              'turn:18.141.161.56:3478',
              'turn:18.141.161.56:3478?transport=udp',
              'turn:18.141.161.56:3478?transport=tcp'
            ],
            username: 'luukien',
            credential: '123456'
          },
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:global.relay.metered.ca:80',
            username: '805ce163d368042ff2c6a264',
            credential: 'yRP+qNFW9ae9vrxt'
          },
          {
            urls: 'turn:global.relay.metered.ca:443',
            username: '805ce163d368042ff2c6a264',
            credential: 'yRP+qNFW9ae9vrxt'
          }
        ]
      }
    })

    peerRef.current.on('call', async (call) => {
      const metadata = call.metadata as CallMetadata
      setComingCall(true)
      setCallerName(metadata.callerName)
      setCallerAvatar(metadata.callerAvatar)
      currentCallRef.current = call

      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
      })

      call.on('close', () => {
        clearVideoCall()
      })
    })

    peerRef.current.on('connection', (conn) => {
      dataConnectionRef.current = conn

      // @ts-ignore
      conn.on('data', (data: { type: string }) => {
        if (data.type === 'end-call') {
          clearVideoCall()
        }
      })
    })

    peerRef.current.on('error', (err) => {
      console.error('Peer error:', err)
    })
  }

  const initLocalStream = async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      setLocalStream(stream)
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      toast.error('Error accessing media devices: ' + err)
      throw err
    }
  }

  const startCall = async (): Promise<void> => {
    setStart(true)
    toast.success('Calling...')
    try {
      const stream = await initLocalStream()
      if (!peerRef.current) return

      const metadata: CallMetadata = {
        callerName: senderName,
        callerAvatar: senderAvatar
      }

      const call = peerRef.current.call(targetUserId, stream, { metadata })
      currentCallRef.current = call

      call.on('stream', (remoteStream) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setRemoteStream(remoteStream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
      })
      if (peerRef.current) {
        const conn = peerRef.current.connect(targetUserId)
        dataConnectionRef.current = conn

        // @ts-ignore
        conn.on('data', (data: { type: string }) => {
          if (data.type === 'end-call') {
            clearVideoCall()
          }
        })
      }
      initiateCall()
    } catch (err) {
      console.error('Error starting call:', err)
      clearVideoCall()
    }
  }

  const acceptCall = async () => {
    setStart(true)

    try {
      const stream = await initLocalStream()
      if (currentCallRef.current) {
        currentCallRef.current.answer(stream)
      }
    } catch (err) {
      console.error('Error accepting call:', err)
      clearVideoCall()
    }
  }

  const rejectCall = () => {
    stopCall()
  }

  const stopCall = async (): Promise<void> => {
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      dataConnectionRef.current.send({ type: 'end-call' })
    }
    if (currentCallRef.current) {
      currentCallRef.current.close()
    }
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close()
    }
    clearVideoCall()
  }

  const initiateCall = () => {
    timeoutRef.current = setTimeout(() => {
      toast.error('The user does not reply')
      stopCall()
    }, 10000)
  }

  const clearVideoCall = () => {
    setStart(false)
    setComingCall(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }

  const toggleAudio = (): void => {
    setMuteAudio((prevState) => !prevState)
    const audioTrack = localStream?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
    }
  }

  const toggleVideo = (): void => {
    setMuteVideo((prevState) => !prevState)
    const videoTrack = localStream?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
    }
  }

  return (
    <div className={`flex flex-col `}>
      {!start && !comingCall && (
        <button
          onClick={startCall}
          className={`flex ${!display && 'hidden'} items-center px-2 py-2 w-fit text-white rounded-full disabled:opacity-50 bg-green-500 hover:bg-green-600`}
        >
          <PhoneIcon className="w-5 h-5 mr-2" />
        </button>
      )}
      {!start && comingCall && (
        <div
          className={`backdrop-blur-sm bg-black px-6 gap-4 bg-opacity-60 flex flex-col overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full h-full max-h-full`}
        >
          <div className={`flex flex-col gap-4`}>
            <img
              src={callerAvatar}
              className={`w-64 rounded-full aspect-square object-cover`}
              alt={callerName}
            />
            <div className={`flex items-center justify-center text-[28px] text-white font-bold`}>
              {callerName}
            </div>
          </div>
          <div className={`flex gap-4`}>
            <button
              onClick={acceptCall}
              className={`flex items-center px-4 py-2 w-fit text-white rounded-full disabled:opacity-50 bg-green-500 hover:bg-green-600`}
            >
              <PhoneIcon className="w-5 h-5 mr-2" />
              Accept
            </button>
            <button
              onClick={rejectCall}
              className={`flex items-center px-4 py-2 w-fit text-white rounded-full disabled:opacity-50 bg-red-500 hover:bg-red-600`}
            >
              <PhoneIcon className="w-5 h-5 mr-2" />
              Reject
            </button>
          </div>
        </div>
      )}
      {start && (
        <div
          className={`backdrop-blur-sm bg-black px-6 gap-4 bg-opacity-60 flex flex-col overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full h-full max-h-full`}
        >
          <div className="grid grid-cols-12  gap-4">
            <div className="relative col-span-9">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full  rounded-lg bg-gray-900"
              />
              <span className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded">
                {callerName}
              </span>
            </div>
            <div className="relative col-span-3 flex items-end">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg bg-gray-900"
              />
              <span className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded">
                You
              </span>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <>
              <button
                onClick={stopCall}
                className={`flex items-center px-4 py-2  text-white rounded-full disabled:opacity-50 bg-red-500 hover:bg-red-600`}
              >
                <PhoneIcon className="w-5 h-5 mr-2" />
                Stop call
              </button>
              <button
                onClick={toggleAudio}
                className="p-3 bg-gray-600 w-fit text-white relative rounded-full hover:bg-gray-700"
              >
                <PiMicrophone className="w-5 h-5" />
                {muteAudio && (
                  <div className={`w-full h-[2px] bg-white absolute top-1/2 left-0 rotate-45`} />
                )}
              </button>

              <button
                onClick={toggleVideo}
                className="p-3 bg-gray-600 text-white relative rounded-full hover:bg-gray-700"
              >
                <VideoIcon className="w-5 h-5" />
                {muteVideo && (
                  <div className={`w-full h-[2px] bg-white absolute top-1/2 left-0 rotate-45`} />
                )}
              </button>
            </>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoCall
