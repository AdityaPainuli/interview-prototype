import  { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, MessageSquare, Video, VideoOff, Loader2 } from "lucide-react";

interface TranscriptHistory {
  type: "user" | "assistant"
  text: string,
  timestamp: string
}

const VoiceToTextConverter = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  const [audioChunks, setAudioChunks] = useState([]);
  const [transcription, setTranscription] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isLoading , setIsLoading] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptHistory[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const silenceTimeout = useRef<any>(null);
  const audioContext = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startVideo = async () => {
    setIsVideoOn(true);
    console.log("starts",videoRef.current);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true 
      });
      
      if (videoRef.current) {
        console.log("video starts.")
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; 
      }
      streamRef.current = stream;
      
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsVideoOn(false);
    }
  };


  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);


  const speakText = (text: string, setIsAgentSpeaking: (speaking: boolean) => void) => {

    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }
  
    try {

      speechSynthesis.cancel();
  
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.pitch = 1;
      utterance.rate = 1;
      

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsAgentSpeaking(false);
      };
  
      utterance.onstart = () => {
        setIsAgentSpeaking(true);
        

        const resumeInfinity = setInterval(() => {
          if (!speechSynthesis.speaking) {
            clearInterval(resumeInfinity);
          } else {
            speechSynthesis.pause();
            speechSynthesis.resume();
          }
        }, 10000);
      };
  
      utterance.onend = () => {
        setIsAgentSpeaking(false);
      };
      
      if (speechSynthesis.getVoices().length > 0) {
        speechSynthesis.speak(utterance);
      } else {
        speechSynthesis.addEventListener('voiceschanged', () => {
          speechSynthesis.speak(utterance);
        }, { once: true });
      }
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      setIsAgentSpeaking(false);
    }
  };
  

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      let chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);

      recorder.onstop = async () => {
        setIsLoading(true);
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        setAudioChunks([]);

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");

        try {
          const response = await fetch("http://localhost:8080/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          const newTranscription = data.transcription || "Error transcribing audio.";
          setTranscription(newTranscription);
          setAgentResponse(data.response);
          
          setTranscriptHistory(prev => [...prev, 
            { type: 'user', text: newTranscription, timestamp: new Date().toLocaleTimeString() },
            { type: 'assistant', text: data.response, timestamp: new Date().toLocaleTimeString() }
          ]);
          
          speakText(data.response,setIsAgentSpeaking);
        } catch (error) {
          console.error("Error sending audio to backend:", error);
          setTranscription("Failed to transcribe audio.");
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (audioContext.current) {
      audioContext.current.close();
    }
    if (silenceTimeout.current) {
      clearTimeout(silenceTimeout.current);
      silenceTimeout.current = null;
    }
    setIsRecording(false);
  };

  return (
    <div className="flex h-screen bg-[#202124]">

      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 gap-8">

          <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">

            <div className={`aspect-video rounded-xl bg-[#3c4043] relative overflow-hidden transition-all duration-300 ${
              isRecording ? 'ring-4 ring-[#8ab4f8]' : ''
            }`}>
              {isVideoOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-[#5f6368] mx-auto flex items-center justify-center">
                      <img src="./public/avatar/Rectangle1-10.png" alt="User" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <span className="text-[#e8eaed] text-sm mt-2 block">You</span>
                  </div>
                </div>
              )}
            </div>


            <div className={`aspect-video rounded-xl bg-[#3c4043] relative overflow-hidden transition-all duration-300 ${
              isAgentSpeaking ? 'ring-4 ring-[#8ab4f8]' : ''
            }`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-[#5f6368] mx-auto flex items-center justify-center">
                    <img src="./public/avatar/Rectangle1-12.png" alt="bot" className="w-full h-full rounded-full object-cover" />
                  </div>
                  {isLoading && (
                      <div className="absolute flex justify-center inset-48 ">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    )}
                  <span className="text-[#e8eaed] text-sm mt-2 block">AI Assistant</span>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="h-20 bg-[#202124] border-t border-[#3c4043] flex items-center justify-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'bg-[#ea4335] hover:bg-[#dc2626]' 
                : 'bg-[#8ab4f8] hover:bg-[#669df6]'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          <button
            onClick={isVideoOn ? stopVideo : startVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              isVideoOn 
                ? 'bg-[#ea4335] hover:bg-[#dc2626]' 
                : 'bg-[#8ab4f8] hover:bg-[#669df6]'
            }`}
          >
            {isVideoOn ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>
          
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isSidePanelOpen ? 'bg-[#8ab4f8] text-white' : 'bg-[#3c4043] text-[#e8eaed]'
            } hover:bg-[#4a4d51]`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        </div>
      </div>


      <div className={`w-96 bg-[#282a2d] transform transition-transform duration-300 ease-in-out ${
        isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
      } fixed right-0 top-0 h-full overflow-hidden`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-[#3c4043] flex justify-between items-center">
            <h2 className="text-[#e8eaed] text-lg font-medium">Transcript History</h2>
            <button
              onClick={() => setIsSidePanelOpen(false)}
              className="text-[#e8eaed] hover:bg-[#3c4043] p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcriptHistory.map((entry, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg cursor-pointer ${
                  entry.type === 'user' ? 'bg-[#3c4043]' : 'bg-[#0b57d0]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {entry.type === 'user' ? (
                    <img src="./public/avatar/Rectangle1-10.png" alt="User" className="h-5 w-5" />
                  ) : (
                    <img src="./public/avatar/Rectangle1-12.png" alt="bot" className="h-5 w-5" />
                  )}
                  <span className="text-[#e8eaed] text-xs">{entry.timestamp}</span>
                </div>
                <p className="text-[#e8eaed] text-sm">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceToTextConverter;