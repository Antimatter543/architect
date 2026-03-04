/**
 * AudioWorklet processor for capturing mic input as 16kHz PCM.
 * Downsamples from the AudioContext sample rate (typically 48kHz) to 16kHz.
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._targetSampleRate = (options.processorOptions || {}).targetSampleRate || 16000;
    this._inputSampleRate = sampleRate; // global from AudioWorkletGlobalScope
    this._ratio = this._inputSampleRate / this._targetSampleRate;
    this._buffer = [];
    this._chunkSize = (options.processorOptions || {}).chunkSize || 4096;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // mono

    // Simple linear downsampling
    for (let i = 0; i < channelData.length; i += this._ratio) {
      const sample = channelData[Math.floor(i)];
      // Clamp and convert float32 [-1,1] to int16
      const clamped = Math.max(-1, Math.min(1, sample));
      this._buffer.push(Math.round(clamped * 32767));
    }

    // Send chunks to main thread
    while (this._buffer.length >= this._chunkSize) {
      const chunk = this._buffer.splice(0, this._chunkSize);
      const int16 = new Int16Array(chunk);
      this.port.postMessage({ type: 'pcm', buffer: int16.buffer }, [int16.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
