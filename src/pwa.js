import { registerSW } from 'virtual:pwa-register';

export const setupPWA = (onNeedRefresh, onOfflineReady) => {
    const updateSW = registerSW({
        immediate: true,
        onNeedRefresh,
        onOfflineReady,
    });
    return updateSW;
};
