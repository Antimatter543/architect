/**
 * AudioWorklet processor for playing back 24kHz PCM audio from MUSE.
 * Uses a ring buffer to handle variable-rate incoming audio.
 */
class PCMPlaybackProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._bufferSize = (options.processorOptions || {}).bufferSize || 48000 * 2; // 2 seconds
    this._buffer = new Float32Array(this._bufferSize);
    this._writePos = 0;
    this._readPos = 0;
    this._filled = 0;
    this._sourceSampleRate = (options.processorOptions || {}).sourceSampleRate || 24000;
    this._outputSampleRate = sampleRate;
    this._ratio = this._sourceSampleRate / this._outputSampleRate;

    this.port.onmessage = (e) => {
      if (e.data.type === 'audio') {
        const int16 = new Int16Array(e.data.buffer);
        // Resample from sourceSampleRate to outputSampleRate using linear interpolation
        for (let i = 0; i < int16.length - 1; i++) {
          const t = i * (this._outputSampleRate / this._sourceSampleRate);
          const srcIdx = Math.floor(t);
          const frac = t - srcIdx;
          if (srcIdx + 1 >= int16.length) break;
          const sample = int16[srcIdx] * (1 - frac) + int16[srcIdx + 1] * frac;
          const floatSample = sample / 32768.0;
          if (this._filled < this._bufferSize) {
            this._buffer[this._writePos] = floatSample;
            this._writePos = (this._writePos + 1) % this._bufferSize;
            this._filled++;
          }
        }
      } else if (e.data.type === 'clear') {
        this._writePos = 0;
        this._readPos = 0;
        this._filled = 0;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];
    for (let i = 0; i < channel.length; i++) {
      if (this._filled > 0) {
        channel[i] = this._buffer[this._readPos];
        this._readPos = (this._readPos + 1) % this._bufferSize;
        this._filled--;
      } else {
        channel[i] = 0; // silence when buffer empty
      }
    }

    return true;
  }
}

registerProcessor('pcm-playback-processor', PCMPlaybackProcessor);
