export class RealtimeService {
  private static eventSource: EventSource | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;

  static connect(userId: string) {
    if (typeof window === 'undefined') return;

    // Close existing connection
    this.disconnect();

    try {
      this.eventSource = new EventSource(`/api/sse?userId=${userId}`);

      this.eventSource.onopen = () => {
        console.log('SSE connection opened');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = () => {
        console.error('SSE connection error');
        this.eventSource?.close();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(userId);
          }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
        }
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
    }
  }

  static disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private static handleMessage(data: any) {
    switch (data.type) {
      case 'order_update':
        this.showNotification('Order Update', {
          body: data.message,
          icon: '/icon-192x192.png',
          data: { orderId: data.orderId }
        });
        break;

      case 'reservation_update':
        this.showNotification('Reservation Update', {
          body: data.message,
          icon: '/icon-192x192.png',
          data: { reservationId: data.reservationId }
        });
        break;

      case 'low_stock_alert':
        this.showNotification('Stock Alert', {
          body: `${data.productName} is running low! Only ${data.stock} left.`,
          icon: '/icon-192x192.png',
          data: { productId: data.productId }
        });
        break;

      case 'new_arrival':
        this.showNotification('New Arrival! 🐠', {
          body: `Check out our latest addition: ${data.productName}`,
          icon: '/icon-192x192.png',
          data: { productId: data.productId }
        });
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private static showNotification(title: string, options: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        notification.close();

        // Handle navigation based on notification data
        const data = options.data;
        if (data?.orderId) {
          window.location.href = `/client/orders/${data.orderId}`;
        } else if (data?.reservationId) {
          window.location.href = `/client/reservations`;
        } else if (data?.productId) {
          window.location.href = `/client/product/${data.productId}`;
        }
      };
    }
  }
}