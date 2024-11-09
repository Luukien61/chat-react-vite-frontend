// WebSocketService.ts
import {Client, IMessage, StompSubscription} from "@stomp/stompjs";

export type Participant={
    id: string,
    name: string,
}
export type ChatMessage = {
    id: string
    senderId: string,
    recipientId: string,
    conversationId: string,
    content: string,
    timestamp: Date,
    // status: 'SENT'| "RECEIVED" | "DELIVERED"
}
export type  Conversation={
    id: string,
    user1Id: string,
    user2Id: string,
    modifiedAt: Date,
    lastMessage: string,
}

let client: Client | null = null;

// Hàm kết nối WebSocket
export const connectWebSocket = (
    onConnected: () => void
): void => {
    client = new Client({
        brokerURL: 'ws://localhost:8080/ws',
        onConnect: onConnected,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });


    client.onWebSocketError = (error) => {
        console.error('Error with websocket', error);
    };

    client.onStompError = (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
    };

    client.activate(); // Kích hoạt kết nối
};

// Hàm ngắt kết nối WebSocket
export const disconnectWebSocket = (): void => {
    if (client) {
        client.deactivate();
    }
};

// Hàm gửi tin nhắn đến server
export const sendMessage = (destination: string, message: ChatMessage): void => {
    if (client && client.connected) {
        client.publish({
            destination: destination,
            body: JSON.stringify(message),
            skipContentLengthHeader: true
        });
    }
};

// Hàm đăng ký nhận tin nhắn từ một endpoint cụ thể
export const subscribeToTopic = (
    destination: string,
    callback: (message: any) => void
): StompSubscription | undefined => {
    console.log("Client: ", client)
    console.log("Client connected: ", client?.connected)
    if (client && client.connected) {
        console.log("Subscribing to topic", destination);
        return client.subscribe(destination, (message: IMessage) => {
            callback(JSON.parse(message.body));
        },  );
    }
    return undefined;
};
