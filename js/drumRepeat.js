//  figure out a better way to channel the sample audio to the pad

let pads;
let masterAudioCtx;
let masterGain;
let audioElements = Array(16).fill(null);
let padGainNodes = Array(16).fill(null);
let mainSamplePool = [];

const audioSources = new Map();

const midiMap = new Map();

let touchEvent = false;

let midi = null;

let setMidiNotes = false;
let selectedPad = null;

document.addEventListener("DOMContentLoaded", () => {

  pads = document.querySelectorAll(".pad");

  const masterVolume = document.querySelector(".master-volume");
  const masterVolumeValue = document.querySelector(".master-volume-value");

  const selectedPadInput = document.querySelector(".selected-pad input");
  const selectedPadValue = document.querySelector(".selected-pad-value");
  const selectedPadVolume = document.querySelector(".selected-pad-volume");

  const midiNote = document.querySelector(".midi-note");
  const setMidiSwitch = document.querySelector(".set-midi-div input");
  const setMidiPads = document.querySelectorAll(".pad-midi-div ul li");

  setMidiSwitch.addEventListener("change", (e) => {
    setMidiNotes = e.target.checked;
    if (!setMidiNotes) { selectedPad = null; }
  });

  setMidiPads.forEach((ele, i) => {
    ele.addEventListener("click", (e) => {
      if (setMidiNotes) {
        if (selectedPad) selectedPad.classList.remove("selected");

        selectedPad = e.target;
        selectedPad.classList.add("selected");
      }
    })
  })

  masterAudioCtx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
  masterGain = masterAudioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(masterAudioCtx.destination);


  // MIDI

  async function getMIDIAccess() {
    try {
      // Check for MIDI permission
      const permissionStatus = await navigator.permissions.query({ name: "midi", sysex: true });

      if (permissionStatus.state === "granted") {
        console.log("Access already granted");
        midi = await navigator.requestMIDIAccess();
      } else if (permissionStatus.state === "prompt") {
        console.log("Prompting for MIDI access");
        midi = await navigator.requestMIDIAccess();
      } else {
        console.log("MIDI access denied or blocked");
      }
    } catch (error) {
      console.error("Failed to get MIDI access", error);
    }

    if (midi) {
      console.log(midi);
      listInputsAndOutputs(midi);
      startLoggingMIDIInput(midi);

      // for change in midi devices (connected & disconnected)
      midi.onstatechange = (e) => {
        console.log(e);
      };
    }
  }
  getMIDIAccess();

  function listInputsAndOutputs(midiAccess) {
    for (const entry of midiAccess.inputs) {
      const input = entry[1];
      console.log(input);
    }
    for (const entry of midiAccess.outputs) {
      const output = entry[1];
      console.log(output);
    }
  }

  function onMIDIMessage(e) {
    if (e.data[0] === 248) return;
    const command = e.data[0];
    const note = e.data[1];
    const velocity = e.data[2];

    //console.log(command, note, velocity);

    // devices (novation launchpad-144, mpctouch-())
    if (command === 144) {
      if (velocity > 0) {
        // note on
        midiNoteDown(note);
      } else {
        // note off
        midiNoteUp(note);
      }
    }

  }

  function midiNoteDown(note) {
    midiNote.innerText = note;

    // if selection mode
    if (setMidiNotes) {
      const input = selectedPad.querySelector("input");
      input.value = note;
      selectedPad.classList.remove("selected");
      const index = Number(selectedPad.dataset.index);
      midiMap.set(note, index);
      return;
    }


    // for triggering pad audio
    if (midiMap.has(note)) {
      playAudio(midiMap.get(note));
      console.log(midiMap)
    }
  }

  function midiNoteUp(note) {
    midiNote.innerText = "";
  }

  function startLoggingMIDIInput(midiAccess) {
    midiAccess.inputs.forEach((entry) => {
      entry.onmidimessage = onMIDIMessage;
    });
  }


  // create gain node for each pad
  for (let i = 0; i < pads.length; i++) {
    const gainNode = masterAudioCtx.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(masterGain);
    padGainNodes[i] = gainNode;
  }

  masterVolume.addEventListener("input", function(e) {
    e.preventDefault();
    const v = Math.round((this.value - this.min) / (this.max - this.min) * 100);
    this.style.background = `linear-gradient(to right, #fff ${v}%, transparent ${v}%)`;
    masterVolumeValue.innerText = `${v}%`;
    masterGain.gain.value = v / 100;
  })

  selectedPadInput.addEventListener("change", function(e) {
    e.preventDefault();
    const pad = pads[this.value - 1];
    const v = pad.dataset.volume;
    selectedPadValue.innerText = `${v}%`;
    selectedPadVolume.value = v;
    selectedPadVolume.style.background = `linear-gradient(to right, #fff ${v}%, transparent ${v}%)`;
  })

  selectedPadVolume.addEventListener("input", function(e) {
    e.preventDefault();
    const v = Math.round((this.value - this.min) / (this.max - this.min) * 100);
    this.style.background = `linear-gradient(to right, #fff ${v}%, transparent ${v}%)`;
    selectedPadValue.innerText = `${v}%`;
    const pad = pads[selectedPadInput.value - 1];
    pad.dataset.volume = v;

    // adjust gain node
    padGainNodes[selectedPadInput.value - 1].gain.value = this.value / 100;
  })

  // get pad presses (mouse, touch and keyboard)
  pads.forEach((pad, i) => {
    pad.addEventListener("touchstart", (e) => {
      e.preventDefault();
      touchEvent = true;
      pad.classList.add("active");
      playAudio(i);
    })
    pad.addEventListener("touchend", (e) => {
      e.preventDefault();
      touchEvent = false;
      pad.classList.remove("active");
    })
    pad.addEventListener("mousedown", () => {
      if (!touchEvent)  {
        pad.classList.add("active");
        playAudio(i);
      }
    })
    pad.addEventListener("mouseup", () => {
      pad.classList.remove("active");
    })
  })
  const controls = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p"];
  window.addEventListener("keydown", (e) => {
    if (controls.includes(e.key.toLowerCase())) {
      pads[controls.indexOf(e.key.toLowerCase())].classList.add("active");
        playAudio(controls.indexOf(e.key.toLowerCase()));
    }
  })
  window.addEventListener("keyup", (e) => {
    if (controls.includes(e.key.toLowerCase()) &&
      pads[controls.indexOf(e.key.toLowerCase())].classList.contains("active")) {
      pads[controls.indexOf(e.key.toLowerCase())].classList.remove("active");
    }
  })


  const samplesList = document.querySelector(".samples-div ul");
  const dropZone = document.querySelector(".samples-div .plus");
  const fileInput = document.querySelector("#fileInput");

  // prevent default behavior
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {e.preventDefault()})
  })

  dropZone.addEventListener("dragover", e => {
    e.target.classList.add("drag-over")
  })
  dropZone.addEventListener("dragleave", e => {
    e.target.classList.remove("drag-over")
  })
  dropZone.addEventListener("drop", e => {
    const files = e.dataTransfer.files;
    connectFiles(samplesList, files);
    e.target.classList.remove("drag-over")
  })
  dropZone.addEventListener("click", () => {
    fileInput.click();
  })

  fileInput.addEventListener("input", e => {
    const files = e.target.files;
    connectFiles(samplesList, files);
    e.target.value = null;
  })
})

function connectFiles(parent, files) {
  const audioFiles = Array.from(files).filter(f => f.type.startsWith("audio/"));
  if (audioFiles.length > 0) {
    for (let file of audioFiles) {
      createListSample(parent, file);
    }
  }
}

function createListSample(parent, file) {
  // audioElement div
  const audioEleDiv = document.createElement("div");
  audioEleDiv.classList.add("audio-ele");
  // audio element
  const audioElement = document.createElement("audio");
  const audioURL = URL.createObjectURL(file);
  audioElement.src = audioURL;
  audioEleDiv.append(audioElement);
  // play button
  const playBtn = document.createElement("button");
  playBtn.classList.add("custom-input");
  playBtn.innerText = ">";
  audioEleDiv.append(playBtn);
  // name
  const name = document.createElement("p");
  name.innerText = file.name;
  audioEleDiv.append(name);

  const rightSectionDiv = document.createElement("div");
  rightSectionDiv.classList.add("right-section");
  audioEleDiv.append(rightSectionDiv);

  // pad selector input
  const padSelector = document.createElement("input");
  padSelector.type = "number";
  padSelector.min = 0;
  padSelector.max = 16;
  padSelector.value = parent.children.length + 1 <= 16 ? parent.children.length + 1 : 0;
  padSelector.classList.add("custom-input");
  padSelector.classList.add("pad-selector");
  rightSectionDiv.append(padSelector);
  // delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("custom-input");
  deleteBtn.classList.add("delete");
  deleteBtn.innerText = "🗑️";
  rightSectionDiv.append(deleteBtn);

  // web audio api
  const source = masterAudioCtx.createMediaElementSource(audioElement);
  source.connect(masterGain);

  audioElement.addEventListener("ended", () => {
    audioElement.currentTime = 0;
    playBtn.innerText = ">";
    playBtn.classList.remove("playing");
  })

  playBtn.addEventListener("click", async () => {

    if (masterAudioCtx.state === "suspended") {
      await masterAudioCtx.resume();
    }

    if (playBtn.classList.contains("playing")) {
      audioElement.pause();
      playBtn.classList.remove("playing");
      playBtn.innerText = ">";
    } else {
      audioElement.currentTime = 0;
      audioElement.play();
      playBtn.classList.add("playing");
      playBtn.innerText = "||";
    }
  })

  padSelector.addEventListener("change", (e) => {
    const min = Number(e.target.min);
    const max = Number(e.target.max);
    const i = Number(e.target.value) - 1;
    if (i + 1 > max) {
      e.target.value = max;
    } else if (i + 1 < min) {
      e.target.value = min;
    }
    if (i > 0) {
      const pad = pads[i];
      assignSampleToPad(pad, audioElement);
    }
  })

  deleteBtn.addEventListener("click", () => {
    const index = Number(padSelector.value - 1);
    const audioTag = mainSamplePool[index].querySelector("audio");
    audioSources.delete(audioTag);
    audioTag.src = null;
    audioEleDiv.remove();
    mainSamplePool.splice(mainSamplePool.indexOf(audioElement), 1);
    parent.removeChild(audioEleDiv);
  })


  mainSamplePool.push(audioEleDiv);

  parent.append(audioEleDiv);

  // add audio element if there is space
  if (parent.children.length <= 16) {
    const pad = pads[parent.children.length - 1];
    assignSampleToPad(pad, audioElement);
  }
}


function assignSampleToPad(pad, audioEle) {
  const padAudio = pad.querySelector("audio");
  const i = Number(pad.id) - 1;
  const gainNode = padGainNodes[i];
  let source;

  if (audioSources.has(padAudio)) {
    source = audioSources.get(padAudio)
    source.disconnect();
  }

  padAudio.pause();
  padAudio.src = audioEle.src;

  if (!audioSources.has(padAudio)) {
    source = masterAudioCtx.createMediaElementSource(padAudio);
    audioSources.set(padAudio, source);
  } else {
    source = audioSources.get(padAudio);
  }

  source.connect(gainNode);
}


async function playAudio(i) {

  const audio = pads[i]?.querySelector("audio");

  if (audioSources.has(audio)) {
    if (masterAudioCtx.state === "suspended") {
      await masterAudioCtx.resume();
    }
    if (!audio.paused) {
      audio.pause();
    }
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (err) {
      console.log("play fail ");
    }
  }
}
