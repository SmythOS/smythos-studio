export function addVoiceRecognitionToElement(
  element: HTMLTextAreaElement,
  micButton: HTMLButtonElement,
) {
  // Check if the provided element is valid
  if (!(element instanceof HTMLElement)) {
    console.error('Invalid DOM element provided.');
    return;
  }

  // Check for browser support
  if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
    console.error('Speech recognition is not supported in this browser.');
    return;
  }

  // Initialize speech recognition
  const SpeechRecognition = window['SpeechRecognition'] || window['webkitSpeechRecognition'];
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true; // Enable interim results
  recognition.lang = 'en-US';

  let isListening = false;
  // Store the original text content to preserve it
  let originalContent = '';

  // Event handler for speech recognition results
  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    // Process all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Update the textarea with the original content plus the latest transcript
    if (interimTranscript) {
      element.value = originalContent + finalTranscript + interimTranscript; // Progressive update with original content
    } else if (finalTranscript) {
      element.value = originalContent + finalTranscript; // Final update with original content
    }
  };

  // Event handler for errors
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopRecognition();
  };

  // Event handler for when recognition ends
  recognition.onend = () => {
    console.log('Speech recognition ended.');
    if (isListening) {
      recognition.start(); // Restart recognition if still listening
    }
  };

  // Toggle recognition on button click
  micButton.addEventListener('click', () => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  });

  // Start recognition
  function startRecognition() {
    try {
      // Save the current content of the textarea before starting recognition
      originalContent = element.value;

      recognition.start();
      isListening = true;

      micButton.classList.add('animate-ping', 'rounded-full', 'bg-red-500', 'h-3', 'w-3');
      micButton.querySelector('i').classList.add('hidden');
      console.log('Listening...');
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }

  // Stop recognition
  function stopRecognition() {
    recognition.stop();
    isListening = false;
    micButton.classList.remove('animate-ping', 'rounded-full', 'bg-red-500', 'h-3', 'w-3');
    micButton.querySelector('i').classList.remove('hidden');
    console.log('Stopped listening.');
  }
}
