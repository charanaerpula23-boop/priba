const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Serve a basic frontend UI on the root URL
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>YouTube Audio Streamer</title>
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #111; color: #fff; text-align: center; }
                input { width: 80%; padding: 10px; margin-bottom: 20px; border-radius: 5px; border: none; }
                button { padding: 10px 20px; background: #ff0000; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
                button:hover { background: #cc0000; }
                audio { width: 100%; margin-top: 30px; }
                #error { color: #ff5555; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h2>YouTube Audio Streamer 🎧</h2>
            <p>Paste a YouTube link below to stream the audio directly.</p>
            <input type="text" id="url" placeholder="https://www.youtube.com/watch?v=..." />
            <br/>
            <button onclick="play()">Stream Audio</button>
            <div id="error"></div>
            <audio id="player" controls></audio>

            <script>
                function play() {
                    const url = document.getElementById('url').value;
                    const errorDiv = document.getElementById('error');
                    if (!url) { errorDiv.innerText = "Please enter a URL!"; return; }
                    errorDiv.innerText = "Loading stream...";
                    
                    const player = document.getElementById('player');
                    // Add a timestamp to bypass browser caching
                    player.src = '/stream?url=' + encodeURIComponent(url) + '&t=' + Date.now();
                    player.play().then(() => {
                        errorDiv.innerText = "Playing!";
                    }).catch(e => {
                        errorDiv.innerText = "Error: Stream failed to start. YouTube might be blocking the server IP.";
                    });
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/stream', (req, res) => {
    const youtubeUrl = req.query.url;

    if (!youtubeUrl) {
        return res.status(400).send('Please provide a YouTube URL');
    }

    console.log(\`Starting stream for: \${youtubeUrl}\`);

    // Add flags to help bypass YouTube's datacenter blocks and ensure output is a playable stream
    const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '--geo-bypass',
        '--force-ipv4',
        '--no-playlist',
        '-o', '-',
        youtubeUrl
    ]);

    // Let the browser automatically determine the audio type based on the stream data
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    let hasData = false;
    let errorMessage = '';

    ytdlp.stdout.on('data', (chunk) => {
        hasData = true;
        res.write(chunk);
    });

    ytdlp.stderr.on('data', (data) => {
        const msg = data.toString();
        errorMessage += msg;
        console.error(\`yt-dlp stderr: \${msg}\`);
    });

    ytdlp.on('close', (code) => {
        console.log(\`yt-dlp process exited with code \${code}\`);
        if (!hasData) {
            // If we got no audio data, YouTube likely blocked us.
            console.error("No data piped. Error:", errorMessage);
            if (!res.headersSent) {
                res.status(500).send("YouTube blocked the request or the URL is invalid. Check server logs.");
            }
        }
        if (!res.writableEnded) {
            res.end();
        }
    });
    
    req.on('close', () => {
        console.log('Client disconnected');
        ytdlp.kill('SIGKILL');
    });
});

app.listen(port, () => {
    console.log(\`Server is running on port \${port}\`);
});
