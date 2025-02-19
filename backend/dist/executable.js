var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import os from "os";
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
const baseUrl = 'https://api.assemblyai.com/v2';
const headers = {
    authorization: '76fe59768f074bd4b3b8cff820da93db', // TODO: replace with API key
};
function isAudioFile(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const type = yield fileTypeFromBuffer(buffer);
        return type ? type.mime.startsWith('audio/') : false;
    });
}
;
function runTranscribe(filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(filepath));
        const uploadResponse = yield axios.post(`${baseUrl}/upload`, formData, {
            headers
        });
        const uploadUrl = uploadResponse.data.upload_url;
        const data = {
            audio_url: uploadUrl // You can also use a URL to an audio or video file on the web
        };
        const url = `${baseUrl}/transcript`;
        const response = yield axios.post(url, data, { headers: headers });
        const transcriptId = response.data.id;
        const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`;
        while (true) {
            const pollingResponse = yield axios.get(pollingEndpoint, {
                headers: headers
            });
            const transcriptionResult = pollingResponse.data;
            if (transcriptionResult.status === 'completed') {
                console.log(transcriptionResult.text);
                break;
            }
            else if (transcriptionResult.status === 'error') {
                throw new Error(`Transcription failed: ${transcriptionResult.error}`);
            }
            else {
                yield new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }
    });
}
function AssemblyTranscribe(filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        const audioData = yield fs.readFileSync(filepath);
        isAudioFile(audioData).then(isAudio => runTranscribe(filepath));
    });
}
const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename); // Get the directory name
const app = express();
app.use(cors({
    origin: "http://localhost:3001" // Replace with your frontend's URL
}));
const PORT = 3000;
// Endpoint to run the audio control logic
app.get("/run-audio-control", (req, res) => {
    const device = req.query.device || "macbook";
    const executablePath = path.resolve(__dirname, "../build/audio_control");
    execFile(executablePath, [device], (error, stdout, stderr) => {
        if (error) {
            console.error("Error executing audio_control:", error);
            return res.status(500).send(`Error: ${error.message}`);
        }
        if (stderr) {
            console.warn("Warning from audio_control:", stderr);
        }
        res.status(200).send(stdout || "Execution completed with no output");
    });
});
// Endpoint to run audio transcription logic
app.post("/receive-audio", express.raw({ type: "audio/ogg", limit: "10mb" }), (req, res) => {
    try {
        console.log("Audio transcription endpoint running");
        console.log("Received audio buffer:", req.body);
        console.log("Buffer length:", req.body.length);
        // Write the audio blob to a temporary file
        const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempFilePath, req.body);
        console.log(`Audio file saved to ${tempFilePath}`);
        //AssemblyTranscribe(tempFilePath);
    }
    catch (error) {
        console.error("Error in /receive-audio endpoint:", error);
        res.status(500).send("Internal Server Error");
    }
});
// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});
//# sourceMappingURL=executable.js.map