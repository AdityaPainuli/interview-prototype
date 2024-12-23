"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const cors_1 = __importDefault(require("cors"));
const interviewPrompt_1 = require("./interviewPrompt");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: "*" }));
// Ensure the uploads directory exists
if (!fs_1.default.existsSync(path_1.default.join(__dirname, "../uploads/"))) {
    fs_1.default.mkdirSync(path_1.default.join(__dirname, "../uploads/"));
}
// Multer configuration
const upload = (0, multer_1.default)({ dest: path_1.default.join(__dirname, "../uploads/") });
dotenv_1.default.config();
// OpenAI configuration
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
let chats = [];
const convertToMP3 = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .output(outputPath)
            .audioCodec('libmp3lame')
            .on('end', () => resolve())
            .on('error', reject)
            .run();
    });
};
// Transcription route
app.post("/api/transcribe", upload.single("audio"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if the file exists
        if (!req.file) {
            res.status(400).json({ error: "No audio file uploaded" });
            return;
        }
        // Construct file path for the uploaded file
        const filePath = path_1.default.resolve(req.file.path);
        const outputPath = path_1.default.resolve(__dirname, "../uploads/temp_audio.mp3");
        yield convertToMP3(filePath, outputPath);
        // Use OpenAI Whisper API
        const transcription = yield openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(outputPath),
            model: "whisper-1",
            language: "en", // Specify language if needed
        });
        chats.push({ role: "user", content: transcription.text });
        // Use OpenAI GPT-3 to generate a response from the transcribed text
        // const prompt = `
        // You are a friendly agent how can talk to user in a friendly tone . suggesting him things . 
        // and just being someone he can share everything . try to be his friend at all time 
        // Respond in a friendly and helpful manner.
        // Never add any emoji in your response please.
        // Always Try to keep your responses not too long. 
        // The conversation between user and you as agent : ${JSON.stringify(chats)}}. 
        // `;
        // const gptResponse = await openai.chat.completions.create({
        //   model: "gpt-3.5-turbo", // You can use GPT-4 or another model as needed
        //   messages: [{ role: "user", content: prompt }],
        // });
        // const agentResponse = gptResponse.choices[0].message;
        const agentResponse = yield (0, interviewPrompt_1.InterviewProcess)(chats);
        chats.push({ role: "assistant", content: agentResponse }); // you can send audio response ? 
        // Clean up the uploaded file
        fs_1.default.unlinkSync(filePath);
        // Return the transcription
        res.json({ transcription: transcription.text, response: agentResponse });
    }
    catch (error) {
        console.error("Error during transcription:", error);
        // Return a 500 error for failures
        res.status(500).json({ error: "Failed to transcribe audio" });
    }
}));
// Start the server
app.listen(8080, () => {
    console.log("Server is running on http://localhost:5000");
});
