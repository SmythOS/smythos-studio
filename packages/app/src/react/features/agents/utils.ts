export const accquireLock = async (id) => {
  const response = await fetch(`/api/page/agent_settings/lock`, {
    method: 'POST',
    body: JSON.stringify({ agentId: id }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
    },
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message);

  return {
    lockId: result?.lock?.id,
  };
};

export const releaseLock = async (agentId, lockId) => {
  const response = await fetch(`/api/page/agent_settings/release-lock`, {
    method: 'PUT',
    body: JSON.stringify({ lockId, agentId }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
    },
  });
  const result = await response.json();
  if (result.success) {
    return {
      success: true,
      message: 'Lock released',
    };
  }
};

export function processAvatar(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);

        canvas.width = 512;
        canvas.height = 512;

        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          512,
          512,
        );

        // Convert canvas to File
        canvas.toBlob(
          (blob) => {
            const processedFile = new File([blob], 'avatar.png', { type: 'image/png' });
            resolve(processedFile);
          },
          'image/png',
          0.7,
        ); // Reduce quality slightly to reduce size
      };
      img.src = e.target.result as string;
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}
