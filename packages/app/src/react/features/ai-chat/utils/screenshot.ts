/**
 * Captures a screenshot using the browser's Screen Capture API.
 * User will be prompted to select a screen, window, or tab to capture.
 *
 * @returns Promise<File | null> - The captured screenshot as a PNG File, or null if cancelled/failed
 */
export const captureScreenshot = async (): Promise<File | null> => {
  let stream: MediaStream | null = null;

  try {
    // Request screen capture - browser will show native picker dialog
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' },
      audio: false,
    });

    // Get the video track
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    // Get track settings for dimensions
    const settings = videoTrack.getSettings();
    const width = settings.width || 1920;
    const height = settings.height || 1080;

    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = () => reject(new Error('Video loading failed'));
    });

    // Small delay to ensure frame is rendered
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create canvas and draw video frame
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // Stop all tracks immediately after capture
    stream.getTracks().forEach((track) => track.stop());
    stream = null;

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) return null;

    // Generate filename with timestamp
    const timestamp = generateTimestamp();
    const filename = `screenshot-${timestamp}.png`;

    // Create File from Blob
    return new File([blob], filename, { type: 'image/png' });
  } catch {
    // User cancelled or permission denied - silently return null
    return null;
  } finally {
    // Ensure stream is stopped even on error
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }
};

/**
 * Generates a formatted timestamp string for filename
 * Format: YYYY-MM-DD-HH-MM-SS
 */
const generateTimestamp = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
};
