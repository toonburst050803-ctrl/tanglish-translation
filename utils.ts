
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function srtTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  // Format: 00:00:00,000
  const parts = timeStr.trim().split(':');
  if (parts.length !== 3) return 0;
  
  const h = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const sParts = parts[2].split(',');
  const s = parseFloat(sParts[0]);
  const ms = sParts.length > 1 ? parseFloat(sParts[1]) : 0;
  
  return h * 3600 + m * 60 + s + ms / 1000;
}

export function parseSRT(srt: string) {
  const blocks = srt.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length < 3) return null;
    
    const id = parseInt(lines[0]);
    const timeRange = lines[1];
    const text = lines.slice(2).join('\n');
    
    const times = timeRange.split(' --> ');
    if (times.length !== 2) return null;
    
    const start = srtTimeToSeconds(times[0]);
    const end = srtTimeToSeconds(times[1]);
    
    return { id, timeRange, text, start, end };
  }).filter(Boolean);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
