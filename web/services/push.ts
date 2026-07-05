import { api } from './api';

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

        const { publicKey } = await api.getVapidKey();

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            await api.subscribeToPush(existing);
            return existing;
        }

        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
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
            await api.unsubscribeFromPush(subscription.endpoint);
            await subscription.unsubscribe();
        }
    }
};
