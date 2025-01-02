import React, { useEffect, useRef, useState } from 'react'
import { PhoneIcon, VideoIcon } from 'lucide-react'
import { PiMicrophone } from 'react-icons/pi'
import { RTCSignal, VideoCallProps } from '@renderer/service/WebSocketService'
import { WebRTCService } from '@renderer/service/WebRTCService'
import { delay } from '@renderer/page/GoogleCode'
import { toast } from 'react-toastify'

const VideoCall: React.FC<VideoCallProps> = ({
  userId,
  targetUserId,
  client,
  userName,
  senderName,
  senderAvatar
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const targetUserIds = useRef<string>(targetUserId)
  // @ts-ignore
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [start, setStart] = useState<boolean>(false)
  const [comingCall, setComingCall] = useState<boolean>(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const webRTCService = useRef<WebRTCService | null>(null)
  const [signal, setSignal] = useState<RTCSignal | null>()
  const localStreamRef = useRef<MediaStream | null>(null)
  const [, setIsCalling] = useState<boolean>(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [callerName, setCallerName] = useState<string>(userName)
  const [callerAvatar, setCallerAvatar] = useState<string>('')
  const [muteVideo, setMuteVideo] = useState<boolean>(false)
  const [muteAudio, setMuteAudio] = useState<boolean>(false)

  useEffect(() => {
    if (client) {
      webRTCService.current = new WebRTCService(client, userId)
      webRTCService.current.setSignalHandler(handleWebRTCSignal)
    }
  }, [userId, client])

  const handleWebRTCSignal = async (signal: RTCSignal): Promise<void> => {
    try {
      switch (signal.type) {
        case 'offer':
          setSignal(signal)
          targetUserIds.current = signal.senderUserId
          setCallerAvatar(signal.senderAvatar)
          setCallerName(signal.senderName)
          setComingCall(true)
          break

        case 'answer':
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          if (!peerConnection.current) return
          console.log('state', peerConnection.current.signalingState)
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          )

          break

        case 'ice-candidate':
          if (!peerConnection.current) return
          if (signal.payload) {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(signal.payload as RTCIceCandidateInit)
            )
            console.log('Add signal', signal)
          }
          break
        case 'call-rejected':
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          clearVideoCall()
          break
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err)
    }
  }

  const acceptCall = async () => {
    setStart(true)
    await delay(200)
    await initLocalStream()
    if (peerConnection.current && signal) {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
      )
      const answer = await peerConnection.current.createAnswer()
      await peerConnection.current.setLocalDescription(answer)
      webRTCService.current?.sendSignal(
        'answer',
        answer,
        targetUserIds.current,
        senderName,
        senderAvatar
      )
    }
  }

  const rejectCall = () => {
    webRTCService.current?.sendSignal(
      'call-rejected',
      {},
      targetUserIds.current,
      senderName,
      senderAvatar
    )
    setComingCall(false)
    setStart(false)
  }

  const initLocalStream = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      setLocalStream(stream)
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      } else {
        console.log('No local stream')
      }

      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          // {
          //   urls: [
          //     'turn:18.141.161.56:3478',
          //     'turn:18.141.161.56:3478?transport=udp',
          //     'turn:18.141.161.56:3478?transport=tcp'
          //   ],
          //   username: 'luukien',
          //   credential: '123456'
          // },
          { urls: 'stun:stun.l.google.com:19302' },
          // { urls: 'stun:stun.relay.metered.ca:80' },
          {
            urls: 'turn:global.relay.metered.ca:80',
            username: '805ce163d368042ff2c6a264',
            credential: 'yRP+qNFW9ae9vrxt'
          },
          // {
          //   urls: 'turn:global.relay.metered.ca:80?transport=tcp',
          //   username: '805ce163d368042ff2c6a264',
          //   credential: 'yRP+qNFW9ae9vrxt'
          // },
          // {
          //   urls: 'turn:global.relay.metered.ca:443',
          //   username: '805ce163d368042ff2c6a264',
          //   credential: 'yRP+qNFW9ae9vrxt'
          // },
          // {
          //   urls: 'turns:global.relay.metered.ca:443?transport=tcp',
          //   username: '805ce163d368042ff2c6a264',
          //   credential: 'yRP+qNFW9ae9vrxt'
          // }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      })

      stream.getTracks().forEach((track) => {
        if (peerConnection.current) {
          peerConnection.current.addTrack(track, stream)
        }
      })

      peerConnection.current.ontrack = (event: RTCTrackEvent) => {
        setRemoteStream(event.streams[0])
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      peerConnection.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          console.log('ICE Candidate:', event.candidate)
          webRTCService.current?.sendSignal(
            'ice-candidate',
            event.candidate.toJSON(),
            targetUserIds.current,
            senderName,
            senderAvatar
          )
        } else {
          console.log('All ICE candidates have been sent.')
        }
      }

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed:', peerConnection.current?.iceConnectionState)
        if (peerConnection.current?.iceConnectionState === 'failed') {
          console.log('ICE connection failed, troubleshooting required.')
          // Thực hiện các bước xử lý khi kết nối thất bại
        } else if (peerConnection.current?.iceConnectionState === 'disconnected') {
          console.log('ICE connection disconnected, checking network issues.')
          // Kiểm tra các vấn đề mạng
        } else if (peerConnection.current?.iceConnectionState === 'connected') {
          console.log('ICE connection established and connected.')
          // Kết nối thành công
        }
      }
    } catch (err) {
      toast.error('Error accessing media devices:' + err)
    }
  }

  const startCall = async (): Promise<void> => {
    setStart(true)
    toast.success('Calling...')
    await delay(100)
    try {
      await initLocalStream()
      if (!peerConnection.current) return
      const offer = await peerConnection.current.createOffer()
      await peerConnection.current.setLocalDescription(offer)
      webRTCService.current?.sendSignal(
        'offer',
        offer,
        targetUserIds.current,
        senderName,
        senderAvatar
      )
      initiateCall()
    } catch (err) {
      console.error('Error creating offer:', err)
    }
  }

  const stopCall = async (): Promise<void> => {
    webRTCService.current?.sendSignal(
      'call-rejected',
      {},
      targetUserIds.current,
      senderName,
      senderAvatar
    )
    await delay(200)
    clearVideoCall()
  }

  const initiateCall = () => {
    setIsCalling(true)

    // Bắt đầu timeout 15 giây
    timeoutRef.current = setTimeout(() => {
      toast.error('The user does not reply')
      handleCallTimeout()
    }, 10000) // 15 giây
  }

  const handleCallTimeout = () => {
    stopTime()
  }

  const stopTime = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    stopCall()
  }

  const clearVideoCall = () => {
    setStart(false)
    setComingCall(false)

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null // Gán null sau khi đã dừng tất cả các track
      }
      setLocalStream(null)

      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }

      // 4. Xóa video elements (nếu có)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
    } catch (err) {
      console.error('Error stopping call:', err)
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
    <div className="flex flex-col">
      {!start && !comingCall && (
        <button
          onClick={startCall}
          className={`flex items-center px-2 py-2 w-fit text-white rounded-full disabled:opacity-50 bg-green-500 hover:bg-green-600`}
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
          <div className="grid grid-cols-12 gap-4">
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
