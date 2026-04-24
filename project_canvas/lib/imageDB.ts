import localforage from 'localforage';

const imageStore = localforage.createInstance({ name: 'CanvasImageStore' });

export const saveImageToDB   = (id: string, base64: string) => imageStore.setItem(id, base64);
export const loadImageFromDB = (id: string) => imageStore.getItem<string>(id);
export const deleteImageFromDB = (id: string) => imageStore.removeItem(id);
