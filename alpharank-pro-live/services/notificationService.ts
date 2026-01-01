
export const notificationService = {
  // Check if browser supports notifications
  isSupported: (): boolean => {
    if (typeof window === 'undefined') return false;
    return "Notification" in window;
  },

  // Check current permission status
  getPermission: (): NotificationPermission => {
    if (!notificationService.isSupported()) return 'denied';
    return Notification.permission;
  },

  // Request permission from user
  requestPermission: async (): Promise<boolean> => {
    if (!notificationService.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Send a notification
  send: (title: string, body: string, tag?: string) => {
    if (notificationService.getPermission() === 'granted') {
      // Check if service worker is ready (for PWA) or use standard API
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3310/3310624.png',
            tag,
            vibrate: [200, 100, 200]
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3310/3310624.png',
          tag
        });
      }
    }
  }
};
