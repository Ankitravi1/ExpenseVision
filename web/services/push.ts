import { api } from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const pushService = {
    isSupported: () => 'serviceWorker' in navigator && 'PushManager' in window,

    subscribeUser: async () => {
        if (!pushService.isSupported()) {
            throw new Error('Push notifications are not supported in this browser.');
        }

        if (!VAPID_PUBLIC_KEY) {
            throw new Error('VAPID Public Key is missing.');
        }

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send subscription to backend
            await api.subscribeToPush(subscription);
            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            throw error;
        }
    },

    unsubscribeUser: async () => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            // TODO: Notify backend to delete subscription (optional)
        }
    }
};
