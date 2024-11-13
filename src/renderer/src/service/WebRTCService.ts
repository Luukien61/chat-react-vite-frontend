// services/webrtc-service.ts
import { Client } from '@stomp/stompjs';
import { RTCSignal } from '@renderer/service/WebSocketService'


export class WebRTCService {
  private client: Client;
  private userId: string;
  private onSignalCallback?: (signal: RTCSignal) => void;

  constructor(client: Client, userId: string) {
    this.client = client;
    this.userId = userId;
    this.subscribeToWebRTC();
  }

  private subscribeToWebRTC(): void {
    this.client.subscribe(`/user/${this.userId}/webrtc`, (message) => {
      const signal: RTCSignal = JSON.parse(message.body);
      if (this.onSignalCallback) {
        this.onSignalCallback(signal);
      }
    });
  }

  public sendSignal(
    type: RTCSignal['type'],
    payload: RTCSignal['payload'],
    targetUserId: string,
  ): void {
    if (this.client.connected) {
      const signal: RTCSignal = {
        type,
        targetUserId,
        senderUserId: this.userId,
        payload
      };

      this.client.publish({
        destination: '/app/webrtc-signal',
        body: JSON.stringify(signal),
        skipContentLengthHeader: true
      });
    }
  }

  public setSignalHandler(callback: (signal: RTCSignal) => void): void {
    this.onSignalCallback = callback;
  }
}
