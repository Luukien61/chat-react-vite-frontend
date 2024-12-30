import { Client } from '@stomp/stompjs'

const Test = () => {
  let client: Client | null = null
  // Hàm kết nối WebSocket
  const connectWebSocket = (onConnected) => {
    client = new Client({
      brokerURL: `ws://localhost:8080/ws`,
      onConnect: onConnected,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    })

    client.onWebSocketError = (error) => {
      console.error('Error with websocket', error)
    }

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message'])
      console.error('Additional details: ' + frame.body)
    }

    client.activate()
  }

  const subscribeToTopic = () => {
    if (client) {
      client.subscribe('/topic/group/12345689', (message) => {
        console.log(JSON.parse(message.body))
      })
    }
  }

  const sendMessage = () => {
    const chatMessage = {
      id: "msg12345", // Unique ID cho tin nhắn
      senderId: "user1", // ID người gửi
      recipientId: "12345689", // ID người nhận (hoặc nhóm)
      conversationId: "12345689", // ID cuộc trò chuyện
      content: "This is the message content", // Nội dung tin nhắn
      timestamp: new Date().toISOString(), // Thời điểm gửi tin nhắn
      type: "text", // Loại tin nhắn (e.g., text, image, file, etc.)
      caption: "Optional caption for the content" // Chú thích cho nội dung (tùy chọn)
    };

    if (client) {
      client.publish({
        destination: '/app/group/12345689',
        body: JSON.stringify(chatMessage),
        skipContentLengthHeader: true
      })
    }
  }
  return (
    <div>
      <button
        onClick={() =>
          connectWebSocket(() => {
            console.log('Connected')
            subscribeToTopic()
          })
        }
      >
        Connect
      </button>
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}

export default Test
