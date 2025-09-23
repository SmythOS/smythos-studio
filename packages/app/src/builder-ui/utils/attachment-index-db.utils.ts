// Store large attachment in IndexedDB
export const storeAttachmentInIndexedDB = async (
  attachment: unknown,
  key: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatAttachment', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      if (db) {
        const transaction = db?.transaction(['attachment'], 'readwrite');
        const store = transaction?.objectStore('attachment');

        const putRequest = store?.add({ data: attachment }, key);
        putRequest.onsuccess = () => resolve(key);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('IndexedDB database connection failed.'));
      }
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('attachment')) {
        db.createObjectStore('attachment');
      }
    };
  });
};

// Retrieve from IndexedDB
export const getAttachmentFromIndexedDB = async (key: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatAttachment', 1);

    request.onsuccess = () => {
      const db = request.result;
      if (db && db?.objectStoreNames?.contains('attachment')) {
        const transaction = db?.transaction(['attachment'], 'readonly');
        const store = transaction?.objectStore('attachment');
        const getRequest = store?.get(key);

        getRequest.onsuccess = () => resolve(getRequest.result?.data || null);
        getRequest.onerror = () => reject(getRequest.error);
      } else {
        reject(new Error('IndexedDB database connection failed.'));
      }
    };

    request.onerror = () => reject(request.error);
  });
};

// Remove data from IndexedDB based on key
export const removeAttachmentFromIndexedDB = async (key: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatAttachment', 1);

    request.onsuccess = () => {
      const db = request.result;
      if (db) {
        const transaction = db?.transaction(['attachment'], 'readwrite');
        const store = transaction?.objectStore('attachment');
        const deleteRequest = store?.delete(key);

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      } else {
        reject(new Error('IndexedDB database connection failed.'));
      }
    };

    request.onerror = () => reject(request.error);
  });
};
