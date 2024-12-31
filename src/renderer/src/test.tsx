import React, { useEffect, useRef, useState } from 'react'
import { VideoIcon, PhoneOffIcon } from 'lucide-react'
import { Button } from 'antd'

// Định nghĩa các loại tin nhắn WebSocket
type SignalingMessage = {
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'call-request'
    | 'call-accepted'
    | 'call-rejected'
    | 'call-ended'
  sender: string
  receiver: string
  data?: any
}

interface VideoCallProps {
  turnConfig: RTCConfiguration
  myId: string
  remoteId: string
  websocketUrl: string
  onCallEnded?: () => void
}

const VideocallParent = () => {
  const peerConfig = {
    iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: '805ce163d368042ff2c6a264',
        credential: 'yRP+qNFW9ae9vrxt'
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: '805ce163d368042ff2c6a264',
        credential: 'yRP+qNFW9ae9vrxt'
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: '805ce163d368042ff2c6a264',
        credential: 'yRP+qNFW9ae9vrxt'
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: '805ce163d368042ff2c6a264',
        credential: 'yRP+qNFW9ae9vrxt'
      }
    ]
  };
  return (
    <VideoCall
      turnConfig={peerConfig}
      myId="user1"
      remoteId="user2"
      websocketUrl="ws://your-signaling-server.com"
      onCallEnded={() => console.log('Call ended')}
    />
  )
}
export default VideocallParent

export const VideoCall: React.FC<VideoCallProps> = ({
  turnConfig,
  myId,
  remoteId,
  websocketUrl,
  onCallEnded
}) => {
  const [isCallStarted, setIsCallStarted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const websocket = useRef<WebSocket | null>(null)

  // Khởi tạo WebSocket connection
  const initWebSocket = () => {
    const ws = new WebSocket(websocketUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = async (event) => {
      const message: SignalingMessage = JSON.parse(event.data)

      if (message.receiver !== myId) return

      switch (message.type) {
        case 'call-request':
          // Hiển thị popup chấp nhận cuộc gọi
          const accepted = window.confirm(`Incoming call from ${message.sender}. Accept?`)
          sendSignalingMessage({
            type: accepted ? 'call-accepted' : 'call-rejected',
            sender: myId,
            receiver: message.sender
          })
          if (accepted) {
            setIsConnecting(true)
            await initLocalStream()
          }
          break

        case 'call-accepted':
          setIsConnecting(true)
          const stream = await initLocalStream()
          if (stream) {
            const pc = initPeerConnection(stream)
            // Tạo và gửi offer
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            sendSignalingMessage({
              type: 'offer',
              sender: myId,
              receiver: remoteId,
              data: offer
            })
          }
          break

        case 'call-rejected':
          alert('Call was rejected')
          endCall()
          break

        case 'offer':
          if (!peerConnection.current) {
            const stream = await initLocalStream()
            if (stream) {
              const pc = initPeerConnection(stream)
              await pc.setRemoteDescription(new RTCSessionDescription(message.data))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              sendSignalingMessage({
                type: 'answer',
                sender: myId,
                receiver: message.sender,
                data: answer
              })
            }
          }
          break

        case 'answer':
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(message.data)
            )
            setIsCallStarted(true)
            setIsConnecting(false)
          }
          break

        case 'ice-candidate':
          if (peerConnection.current) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.data))
          }
          break

        case 'call-ended':
          endCall()
          break
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Thử kết nối lại sau 5 giây
      setTimeout(initWebSocket, 5000)
    }

    websocket.current = ws
  }

  // Gửi tin nhắn qua WebSocket
  const sendSignalingMessage = (message: SignalingMessage) => {
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify(message))
    }
  }

  // Khởi tạo local stream
  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      return null
    }
  }

  // Khởi tạo peer connection
  const initPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(turnConfig)

    // Thêm local tracks vào peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    // Xử lý khi nhận được remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setRemoteStream(event.streams[0])
      }
    }

    // Xử lý ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          sender: myId,
          receiver: remoteId,
          data: event.candidate
        })
      }
    }

    // Xử lý thay đổi trạng thái kết nối
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        endCall()
      }
    }

    peerConnection.current = pc
    return pc
  }

  // Bắt đầu cuộc gọi
  const startCall = async () => {
    setIsConnecting(true)
    // Gửi yêu cầu gọi
    sendSignalingMessage({
      type: 'call-request',
      sender: myId,
      receiver: remoteId
    })
  }

  // Kết thúc cuộc gọi
  const endCall = () => {
    sendSignalingMessage({
      type: 'call-ended',
      sender: myId,
      receiver: remoteId
    })

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    setLocalStream(null)
    setRemoteStream(null)
    setIsCallStarted(false)
    setIsConnecting(false)
    onCallEnded?.()
  }

  // Khởi tạo WebSocket khi component mount
  useEffect(() => {
    initWebSocket()
    return () => {
      websocket.current?.close()
      endCall()
    }
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-white text-sm">You ({myId})</div>
        </div>
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 text-white text-sm">Remote ({remoteId})</div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {!isCallStarted && !isConnecting ? (
          <Button onClick={startCall} className="bg-green-500 hover:bg-green-600">
            <VideoIcon className="mr-2 h-4 w-4" />
            Start Call
          </Button>
        ) : isConnecting ? (
          <Button disabled>
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
            Connecting...
          </Button>
        ) : (
          <Button onClick={endCall}>
            <PhoneOffIcon className="mr-2 h-4 w-4" />
            End Call
          </Button>
        )}
      </div>
    </div>
  )
}
