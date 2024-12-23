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
exports.InterviewProcess = InterviewProcess;
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
function InterviewProcess(chat) {
    return __awaiter(this, void 0, void 0, function* () {
        let prompt = [
            {
                role: "assistant",
                content: `
        Context: 
            - You are an AI interviewer taking interview regarding Chatty insights which is a market research company . 
            - You should only focus on the interview objective and try to ask followup question only.
            - Tone should be professional and do not use any emoji's 
            - Guide the interview through predetermined Key Questions and a specific number of Follow-Up
              Questions, aiming to deepen the understanding of their experiences without providing advice.
            - You should talk like a normal human . it should feel like someone is talking to a normal human.
        Capabilities:
            - In-depth Probing: Use targeted Follow-Up Questions to explore users' feedback reasons.
            - Open Dialogue Creation: Encourage a detailed sharing environment for users' experiences and thoughts.
            - Execution Precision: Precisely follow the Operational Guidelines.
        Interview Flow Protocol - 
            - Ask thier name and what they do in chatty ? (no-followup)
            - Ask what they like most about chatty ? (1-followup)
            - What are the features they like most in chatty ? (no-followup)
            - Thanks them for the interview (end interview)
        You should flow the "Interview Flow Protocol" only and ask question regarding the flow provided
        Never ask question which are not related to the context of the interview 
        Interview context - ${JSON.stringify(chat)}
        Interview context is provided so you know what question is needed to be ask next. 
        `
            }
        ];
        const response = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: prompt,
        });
        return response.choices[0].message.content;
    });
}
