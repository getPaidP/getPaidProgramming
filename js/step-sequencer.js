document.addEventListener("DOMContentLoaded", () => {
  const bpmInput = document.querySelector(".bpm-div input");
  let bpm = bpmInput.value;
  bpmInput.addEventListener("change", () => {
    bpm = Number(this.value);
  })

  /* BASIC SYNTH */
  let audioCtx;
  let osc;
  let gainNode;
  let isPlaying = false;

  const waveformSelect = document.querySelector("#waveform");
  const frequencyControl = document.querySelector("#frequency");
  const playBtn = document.querySelector("#play");
  const stopBtn = document.querySelector("#stop");
  const gainDisplay = document.querySelector("#gainValue");
  const gainControl = document.querySelector("#gain");

  function playSynth() {
    if (!audioCtx) {audioCtx = new (window.AudioContext || window.webkitAudioContext)()}
    if (!isPlaying) {
      osc = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      osc.type = waveformSelect.value;
      osc.frequency.setValueAtTime(frequencyControl.value, audioCtx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // set initial gain value
      gainNode.gain.setValueAtTime(gainControl.value, audioCtx.currentTime);

      osc.start();
      isPlaying = true;
    }
  }
  function stopSynth() {
    if (isPlaying) {
      osc.stop();
      isPlaying = false;
    }
  }
  frequencyControl.addEventListener("change", () => {
    if (isPlaying) {
      const v = Number(frequencyControl.value);
      osc.frequency.setValueAtTime(v, audioCtx.currentTime);
    }
  })
  gainControl.addEventListener("input", () => {
    gainDisplay.textContent = gainControl.value;
    if (isPlaying) {
      gainNode.gain.setValueAtTime(gainControl.value, audioCtx.currentTime);
    }
  })
  playBtn.addEventListener("click", playSynth);
  stopBtn.addEventListener("click", stopSynth);
  /*-------------*/
})



