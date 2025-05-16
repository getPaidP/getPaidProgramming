// Reference the HTML elements we'll interact with
const deviceInfo = document.getElementById('deviceInfo');
const visualizer = document.getElementById('visualizer').getContext('2d');

// Check for browser support
if (!navigator.mediaDevices) {
    deviceInfo.textContent = "No MediaDevices support.";
    throw new Error("No MediaDevices support.");
}

// Using getUserMedia to get the default audio input device information and stream
navigator.mediaDevices.getUserMedia({ audio: true })
.then(stream => {
    let audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
        const defaultDevice = audioTracks[0];
        deviceInfo.textContent = `Using audio input device: ${defaultDevice.label}`;

        // Now, enumerate all devices
        navigator.mediaDevices.enumerateDevices().then(devices => {
            let audioInputs = devices.filter(device => device.kind === 'audioinput' && device.deviceId !== 'default');
            if (audioInputs.length > 0) {
                audioInputs.forEach(device => deviceInfo.innerHTML += `<br>Connected: ${device.label}`);
            } else {
                deviceInfo.innerHTML += "<br>No other audio devices connected.";
            }
        }).catch(err => console.error('Error enumerating devices:', err));

        // Set up the audio context for visualization
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        drawVisualizer(analyser);

    } else {
        deviceInfo.textContent = "No Audio Device";
    }
})
.catch(err => {
    console.error('Error accessing media devices.', err);
    deviceInfo.textContent = "No Audio Device Accessible: " + err.message;
});

// Function to draw a visualizer
function drawVisualizer(analyser) {
    requestAnimationFrame(() => drawVisualizer(analyser));
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    visualizer.fillStyle = '#000';
    visualizer.fillRect(0, 0, visualizer.canvas.width, visualizer.canvas.height);

    const barWidth = (visualizer.canvas.width / bufferLength) * 2.5;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];

        visualizer.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        visualizer.fillRect(x, visualizer.canvas.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
    }
}


/*-------------------------audio recording--------------------------*/
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const recordingsList = document.getElementById('recordings');

let mediaRecorder;
let audioChunks = [];

// Helper function to convert Blob to ArrayBuffer for MP3 encoding
const blobToArrayBuffer = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
});

// Function to convert audio from WebM to MP3
async function convertToMp3(blob) {
    const arrayBuffer = await blobToArrayBuffer(blob);
    const audioContext = new AudioContext();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get PCM data from the audio buffer (mono-channel)
    const pcm = audioBuffer.getChannelData(0); // First channel (mono)

    // Convert Float32 PCM to 16-bit PCM
    const pcmInt16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Encode PCM data to MP3 using lame.js
    const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128); // Mono, 128kbps
    const mp3Data = mp3Encoder.encodeBuffer(pcmInt16);
    const mp3End = mp3Encoder.flush();

    // Combine MP3 data
    const mp3Blob = new Blob([new Uint8Array(mp3Data), new Uint8Array(mp3End)], { type: 'audio/mp3' });

    return mp3Blob;
}

startButton.onclick = async () => {
    startButton.disabled = true;
    stopButton.disabled = false;
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(audioChunks, { 'type' : 'audio/webm' });
        const mp3Blob = await convertToMp3(webmBlob);

        // Generate a downloadable link
        if (mp3Blob) {
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording_${new Date().toISOString()}.mp3`;
            a.innerText = "Download MP3";

            // Create an audio element for playback
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = url;

            // Add both elements to the page
            const container = document.createElement('div');
            container.appendChild(audio);
            container.appendChild(a);
            recordingsList.appendChild(container);

            // Clear chunks for next recording
            audioChunks = [];
        } else {
            console.log("failed to convert to mp3");
        }
    };
    mediaRecorder.start();
};

stopButton.onclick = () => {
    startButton.disabled = false;
    stopButton.disabled = true;
    mediaRecorder.stop();
};

