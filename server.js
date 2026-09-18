const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/stream', (req, res) => {
    const youtubeUrl = req.query.url;

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a YouTube URL via the ?url= parameter. Example: /stream?url=https://www.youtube.com/watch?v=...');
    }

    console.log(`Starting stream for: ${youtubeUrl}`);

    // Spawn yt-dlp to download the best audio format and pipe to stdout
    // -f bestaudio: get the best audio available
    // -o -: output to standard output (stdout)
    // --quiet: suppress yt-dlp's normal terminal logging so it doesn't corrupt the audio stream
    const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '--quiet',
        '-o', '-',
        youtubeUrl
    ]);

    // Browsers often handle generic audio streams well
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the standard output directly to the HTTP response
    ytdlp.stdout.pipe(res);

    // Log any errors from yt-dlp
    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp error: ${data}`);
    });

    ytdlp.on('close', (code) => {
        console.log(`yt-dlp process exited with code ${code}`);
        if (!res.writableEnded) {
            res.end();
        }
    });
    
    // If the user closes the browser or media player, kill the download!
    req.on('close', () => {
        console.log('Client disconnected, killing yt-dlp process');
        ytdlp.kill('SIGKILL');
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
