const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const OUTPUT_DIR = path.join(__dirname, "hls_output");
fs.ensureDirSync(OUTPUT_DIR);

// Function to start encoding
const startTranscoding = (inputUrl, streamKey) => {
    const streamPath = path.join(OUTPUT_DIR, streamKey);
    fs.ensureDirSync(streamPath);

    ffmpeg(inputUrl)
        .addOptions([
            "-preset veryfast",
            "-g 48", // GOP (adjust for latency)
            "-sc_threshold 0",
            "-hls_time 4",
            "-hls_list_size 5",
            "-hls_flags delete_segments",
        ])
        .output(`${streamPath}/index_720.m3u8`)
        .videoCodec("libx264")
        .size("1280x720")
        .output(`${streamPath}/index_480.m3u8`)
        .size("854x480")
        .output(`${streamPath}/index_360.m3u8`)
        .size("640x360")
        .on("start", () => console.log(`Transcoding started for ${inputUrl}`))
        .on("end", () => console.log("Transcoding finished"))
        .on("error", (err) => console.error("FFmpeg error:", err))
        .run();
};

// API to start transcoding
app.post("/start", (req, res) => {
    const { url, streamKey } = req.body;
    if (!url || !streamKey) return res.status(400).json({ error: "Missing parameters" });

    startTranscoding(url, streamKey);
    res.json({ message: "Transcoding started", streamKey });
});

// Serve HLS files
app.use("/hls", express.static(OUTPUT_DIR));

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
