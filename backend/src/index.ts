import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {OpenAI} from 'openai'
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import cors from 'cors';
import { InterviewProcess } from "./interviewPrompt";
import { ChatCompletionMessageParam } from "openai/resources";

const app = express();

app.use(cors({origin: "*"}));


if (!fs.existsSync(path.join(__dirname, "../uploads/"))) {
    fs.mkdirSync(path.join(__dirname, "../uploads/"));
  }
  

const upload = multer({ dest: path.join(__dirname, "../uploads/") });

dotenv.config();


const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY
});

let chats:ChatCompletionMessageParam[] = [];


const convertToMP3 = (inputPath: string, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  };



app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
  try {

    if (!req.file) {
        res.status(400).json({ error: "No audio file uploaded" });
        return;
    }


    const filePath = path.resolve(req.file.path);

    const outputPath = path.resolve(__dirname, "../uploads/temp_audio.mp3");


    await convertToMP3(filePath, outputPath);


    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "whisper-1",
      language: "en", 
    });
    chats.push({role:"user",content:transcription.text});
   
    const agentResponse = await InterviewProcess(chats)
    chats.push({role:"assistant",content:agentResponse}); // you can send audio response ? 



    fs.unlinkSync(filePath);


    res.json({ transcription: transcription.text , response : agentResponse });
  } catch (error) {
    console.error("Error during transcription:", error);


    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});


app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
