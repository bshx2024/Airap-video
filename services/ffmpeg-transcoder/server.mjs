import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'airap-ffmpeg-transcoder', timestamp: new Date().toISOString() });
});

/**
 * POST /api/extract-lineart
 * Body: { videoUrl: string, taskId?: string }
 * Response: binary video/mp4 with black-and-white lineart and original audio intact
 */
app.post('/api/extract-lineart', async (req, res) => {
  const { videoUrl, taskId = `task_${Date.now()}` } = req.body || {};
  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `in_${taskId}_${Date.now()}.mp4`);
  const outputPath = path.join(tmpDir, `lineart_${taskId}_${Date.now()}.mp4`);

  try {
    console.log(`[Transcoder] Fetching source video: ${videoUrl}`);
    const vidRes = await fetch(videoUrl);
    if (!vidRes.ok) {
      throw new Error(`Failed to fetch source video (${vidRes.status}): ${vidRes.statusText}`);
    }

    const arrayBuffer = await vidRes.arrayBuffer();
    await fs.promises.writeFile(inputPath, Buffer.from(arrayBuffer));
    console.log(`[Transcoder] Downloaded ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB to ${inputPath}`);

    // Industrial Lineart Filter:
    // 1. format=gray: strip color to avoid skin tone leakage
    // 2. boxblur=1:1: smooth subtle noise/wrinkles/skin textures
    // 3. edgedetect=low=0.1:high=0.3:mode=wires: extract crisp pose & lip boundaries
    // 4. negate: invert to white background with black sketch lines
    // 5. -c:a copy: preserve original 808 audio track and exact lip timing
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vf "format=gray,boxblur=1:1,edgedetect=low=0.1:high=0.3:mode=wires,negate" -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -c:a copy "${outputPath}"`;

    console.log(`[Transcoder] Running FFmpeg command...`);
    const startTime = Date.now();
    await execPromise(ffmpegCmd);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Transcoder] Lineart generated in ${elapsed}s: ${outputPath}`);

    const fileStat = await fs.promises.stat(outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileStat.size);
    res.setHeader('X-Transcode-Duration-Sec', elapsed);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
  } catch (err) {
    console.error('[Transcoder Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract lineart' });
  } finally {
    // Clean up temporary files
    setTimeout(() => {
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    }, 5000);
  }
});

app.listen(port, () => {
  console.log(`🚀 Airap FFmpeg Transcoder listening on port ${port}`);
});

