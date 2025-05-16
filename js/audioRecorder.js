document.addEventListener("DOMContentLoaded", () => {

  const audioData = document.querySelector(".audioData");
  const canvas = document.querySelector("canvas");
  const canvasCtx = canvas.getContext('2d');

  const visualizer = document.getElementById('visualizer').getContext('2d');

  const audioDevices = document.querySelector(".audio-devices");
  const activeDevice = document.querySelector(".active-device");

  const bgColorInput = document.querySelector("#canvas-bg-color");
  const colorInput = document.querySelector("#canvas-color");

  const recordBtn = document.querySelector(".record");
  const stopBtn = document.querySelector(".stop");
  const playbackBtn = document.querySelector(".togglePlayback");

  const soundClips = document.querySelector(".sound-clips");

  // playback mode
  let isPlayback = true;

  // event listeners
  let playbackListener = null;
  let recordListener = null;
  let stopListener = null;

  // active audio context and array of audio nodes
  let currentAudioContext = null;
  let currentNodes = [];

  // try to get audio devices then add devices and set up audio context
  navigator?.mediaDevices?.getUserMedia({
    audio: {
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppresion: false,
      latency: 0,
      channelCount: 1
    }
  })
    .then(stream => {
      setupAudioDevices(stream);
      setupAudioContext(stream);
      setupRecording(stream);
    })
    .catch(error => {
      console.error('Error accessing the microphone:', error);
    });

  function setupAudioContext(stream) {
    // close previous audiocontext
    if (currentAudioContext) {
      currentAudioContext.close();
      currentNodes.forEach(node => node.disconnect());
      currentNodes = [];
    }
    // Remove old event listeners
    if (playbackListener) playbackBtn.removeEventListener("click", playbackListener);
    if (recordListener) recordBtn.removeEventListener("click", recordListener);
    if (stopListener) stopBtn.removeEventListener("click", stopListener);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    const source = audioContext.createMediaStreamSource(stream);

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1;

    const splitter = audioContext.createChannelSplitter(1);
    const merger = audioContext.createChannelMerger(2);

    splitter.connect(merger, 0, 0);
    splitter.connect(merger, 0, 1);

    source.connect(splitter);
    merger.connect(gainNode).connect(audioContext.destination);

    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    visualize(analyser);
    drawVisualizer(analyser);

    // save reference to audio nodes and currentAudioContext
    currentAudioContext = audioContext;
    currentNodes = [source, splitter, merger, gainNode];

    playbackListener = () => togglePlayback(gainNode);
    playbackBtn.addEventListener("click", playbackListener);
  }

  // toggle audio input playback
  function togglePlayback(gainNode) {
    if (isPlayback) {
      gainNode.gain.setValueAtTime(0, currentAudioContext.currentTime);
      isPlayback = false;
      playbackBtn.textContent = "PLAYBACK OFF";

    } else {
      gainNode.gain.setValueAtTime(1, currentAudioContext.currentTime);
      isPlayback = true;
      playbackBtn.textContent = "PLAYBACK ON";
    }
  }

  // add default and other devices to list
  function setupAudioDevices(stream) {
    let userDevices = stream.getAudioTracks();
    if (userDevices.length > 0) {
      // add default device
      const defaultDevice = userDevices[0];
      activeDevice.textContent = `Using audio input device: ${defaultDevice.label}`;

      // add each device
      navigator?.mediaDevices?.enumerateDevices()
        .then(devices => {
          let audioInputs = devices.filter(device => device.kind === 'audioinput' && device.deviceId !== 'default');
          if (audioInputs.length > 0) {
            audioInputs.forEach(device => {
              // create div for each device
              const deviceDiv = document.createElement("div");
              deviceDiv.classList.add("device");
              deviceDiv.innerHTML = device.label;
              deviceDiv.addEventListener("click", () => changeAudioDevice(device));
              audioDevices.appendChild(deviceDiv);
            })
          } else {
            audioDevices.textContent = "No other audio devices connected.";
          }
        })
        .catch(err => {
          console.error('Error enumerating devices:', err);
        })
    }
  }

  // onclick listener to switch input audio device
  function changeAudioDevice(device) {
    const constraints = {
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppresion: false,
        latency: 0,
        channelCount: 1,
        deviceId: { exact: device.deviceId } // Use the selected device
      }
    };
    // Stop any currently active tracks
    if (window.currentStream) {
      window.currentStream.getTracks().forEach(track => track.stop());
    }
    // Request a new stream with the selected device
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        // Save the stream for later use
        window.currentStream = stream;

        setupAudioContext(stream);
        setupRecording(stream);

        activeDevice.textContent = `Using audio input device: ${device.label}`;

        console.log("Switched to device:", device.label);
      })
      .catch(err => {
        console.error("Error switching audio device:", err);
      });
  }

  // handles set up for recording audio logic
  function setupRecording(stream) {

    // init stopBtn disabled
    stopBtn.disabled = true;

    let chunks = [];
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const clipName = prompt("Enter a name for your sound clip");

      const clipContainer = document.createElement("article");
      const clipLabel = document.createElement("p");
      const audio = document.createElement("audio");
      const deleteButton = document.createElement("button");
      const downloadButton = document.createElement("a");
      const loopButton = document.createElement("button");

      clipContainer.classList.add("clip");
      audio.setAttribute("controls", "");
      deleteButton.textContent = "Delete";
      downloadButton.textContent = "Download";
      clipLabel.textContent = clipName;
      loopButton.textContent = "Loop";

      const webmBlob = new Blob(chunks, { 'type': 'audio/webm' });
      const mp3Blob = await convertToMp3(webmBlob);

      // Generate a downloadable link
      if (mp3Blob) {
        const url = URL.createObjectURL(mp3Blob);
        downloadButton.href = url;
        downloadButton.download = `${clipName}.mp3`;

        audio.controls = true;
        audio.src = url;

        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(deleteButton);
        clipContainer.appendChild(downloadButton);
        clipContainer.appendChild(loopButton);
        soundClips.appendChild(clipContainer);

        // Clear chunks for next recording
        chunks = [];
      } else {
        console.log("failed to convert to mp3");
      }

      deleteButton.onclick = (e) => {
        let evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      };
      loopButton.onclick = () => {
        audio.loop = !audio.loop;
        loopButton.textContent = audio.loop ? "Disable Loop" : "Loop";
      }
    }

    recordListener = async () => {
      recordBtn.disabled = true;
      stopBtn.disabled = false;

      mediaRecorder.start();

      console.log("record started", mediaRecorder.state);
      recordBtn.style.background = "red";
      recordBtn.style.color = "white";
    }
    recordBtn.addEventListener("click", recordListener);

    stopListener = () => {
      recordBtn.disabled = false;
      stopBtn.disabled = true;

      mediaRecorder.stop();

      console.log("record stopped", mediaRecorder.state);
      recordBtn.style.background = "";
      recordBtn.style.color = "";
    }
    stopBtn.addEventListener("click", stopListener);
  }


  // analyze audio data
  function visualize(analyser) {
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      audioData.innerHTML = "";
      for (let i of dataArray) {
        const d = document.createElement("div");
        d.innerHTML = i;
        d.classList.add("data-div")
        audioData.appendChild(d);
      }
      paintAudio(bufferLength, dataArray);
    }

    draw();
  }

  // draw to canvas with audio data
  function paintAudio(bufferLength, dataArray) {
    canvasCtx.fillStyle = bgColorInput.value;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = colorInput.value;

    canvasCtx.beginPath();

    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

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

  // second visualizer (bars)
  function drawVisualizer(analyser) {
    requestAnimationFrame(() => drawVisualizer(analyser));
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    visualizer.fillStyle = '#000';
    visualizer.fillRect(0, 0, visualizer.canvas.width, visualizer.canvas.height);

    const barWidth = (visualizer.canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];

      visualizer.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
      visualizer.fillRect(x, visualizer.canvas.height - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
  }

})
