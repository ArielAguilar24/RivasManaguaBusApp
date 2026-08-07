import { HubConnectionBuilder, HttpTransportType, HubConnection } from '@microsoft/signalr';

export class SignalRService {
  private connection: HubConnection | null = null;

  async startConnection(): Promise<void> {
    this.connection = new HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/tracking', {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
    console.log('SignalR Hub connection established.');
  }

  async joinTrip(tripId: number): Promise<void> {
    if (this.connection) {
      await this.connection.invoke('JoinTripGroup', tripId.toString());
    }
  }

  async leaveTrip(tripId: number): Promise<void> {
    if (this.connection) {
      await this.connection.invoke('LeaveTripGroup', tripId.toString());
    }
  }

  onLocationUpdate(callback: (data: { tripId: string; latitude: number; longitude: number; status: string }) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveLocationUpdate'); // Avoid duplicate handlers
      this.connection.on('ReceiveLocationUpdate', callback);
    }
  }

  onCommentReceived(callback: (comment: { id: number; content: string; timestamp: string; username: string }) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveComment');
      this.connection.on('ReceiveComment', callback);
    }
  }

  onReportReceived(callback: (report: { id: number; statusReport: 'Left' | 'NotLeft' | 'Delayed'; delayMinutes: number; occupancy: 'Empty' | 'Medium' | 'Full'; timestamp: string; username: string }) => void): void {
    if (this.connection) {
      this.connection.off('ReceiveReport');
      this.connection.on('ReceiveReport', callback);
    }
  }

  stopConnection(): void {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
    }
  }
}

export const signalRService = new SignalRService();
