
import React, { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { 
  Home, Camera, BarChart3, MessageSquare, Settings as SettingsIcon, 
  CloudRain, Calendar, Download, AlertCircle, TrendingUp, Info, 
  Volume2, WifiOff, ArrowRight, Award, Leaf, Globe, Zap, Heart,
  Sparkles, CheckCircle2, Sprout, TrendingDown, Target, ShieldCheck,
  VolumeX, Share2, FileDown, Bell, BellRing, Trash2, Plus, X, Mail, Send,
  Cpu, Terminal, UserCheck, Layout
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label
} from 'recharts';
import { AppView, DiagnosisResult, FarmSettings, ChatMessage, MarketTrend, PriceAlert, NexusAgentState, FarmerIdentity } from './types';
import { analyzeCropImage, getSmartChatResponse, generateSpeech, getMarketIntelligence, generateFarmerCV } from './services/geminiService';

const CROP_MARKET_MAP: Record<string, MarketTrend[]> = {
  "Rice": [
    { name: 'Nov', price: 400, prediction: 410, sentiment: 'Stable' },
    { name: 'Dec', price: 420, prediction: 435, sentiment: 'Bullish' },
    { name: 'Jan', price: 390, prediction: 410, sentiment: 'Stable' },
    { name: 'Feb', price: 480, prediction: 520, sentiment: 'Bullish' },
    { name: 'Mar', price: 510, prediction: 550, sentiment: 'Bullish' },
  ],
  "Organic Potato": [
    { name: 'Nov', price: 80, prediction: 85, sentiment: 'Bullish' },
    { name: 'Dec', price: 95, prediction: 110, sentiment: 'Bullish' },
    { name: 'Jan', price: 120, prediction: 115, sentiment: 'Stable' },
    { name: 'Feb', price: 105, prediction: 100, sentiment: 'Bearish' },
    { name: 'Mar', price: 130, prediction: 150, sentiment: 'Bullish' },
  ],
  "Maize": [
    { name: 'Nov', price: 280, prediction: 290, sentiment: 'Stable' },
    { name: 'Dec', price: 300, prediction: 310, sentiment: 'Stable' },
    { name: 'Jan', price: 320, prediction: 340, sentiment: 'Bullish' },
    { name: 'Feb', price: 310, prediction: 300, sentiment: 'Bearish' },
    { name: 'Mar', price: 330, prediction: 350, sentiment: 'Bullish' },
  ],
  "Citrus": [
    { name: 'Nov', price: 600, prediction: 580, sentiment: 'Stable' },
    { name: 'Dec', price: 650, prediction: 700, sentiment: 'Bullish' },
    { name: 'Jan', price: 720, prediction: 800, sentiment: 'Bullish' },
    { name: 'Feb', price: 780, prediction: 750, sentiment: 'Stable' },
    { name: 'Mar', price: 820, prediction: 900, sentiment: 'Bullish' },
  ]
};

const CROP_OPTIONS = Object.keys(CROP_MARKET_MAP);

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [settings, setSettings] = useState<FarmSettings>(() => {
    const saved = localStorage.getItem('agridoctor_settings_v3');
    return saved ? JSON.parse(saved) : {
      altitude: 1450,
      location: "Lumle, Kaski",
      primaryCrops: ["Rice", "Organic Potato"],
      language: 'en',
      farmSize: 8,
      soilType: "Loamy",
      email: ""
    };
  });

  const [agentState, setAgentState] = useState<NexusAgentState>({
    isThinking: false,
    activeTools: ['Vision_Core', 'Market_Stream'],
    currentTask: 'Awaiting User Intent'
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('nexus_price_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('nexus_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  const playAdvice = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    setAgentState(s => ({ ...s, isThinking: true, currentTask: 'Generating Audio Synthesis...' }));
    try {
      const audioData = await generateSpeech(text);
      if (audioData) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const dataInt16 = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => { setIsSpeaking(false); setAgentState(s => ({ ...s, isThinking: false })); };
        source.start();
      } else {
        setIsSpeaking(false);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Audio error", e);
      setIsSpeaking(false);
      setAgentState(s => ({ ...s, isThinking: false }));
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME: return <HomeView setView={setCurrentView} settings={settings} playAdvice={playAdvice} isSpeaking={isSpeaking} agentState={agentState} />;
      case AppView.SCANNER: return <ScannerView agentState={agentState} setAgentState={setAgentState} playAdvice={playAdvice} isSpeaking={isSpeaking} settings={settings} />;
      case AppView.MARKET: return <MarketView isOffline={isOffline} settings={settings} setSettings={setSettings} setAgentState={setAgentState} alerts={alerts} setAlerts={setAlerts} />;
      case AppView.CHAT: return <ChatView isOffline={isOffline} agentState={agentState} setAgentState={setAgentState} />;
      case AppView.IDENTITY: return <IdentityView settings={settings} setAgentState={setAgentState} />;
      case AppView.PITCH: return <PitchView />;
      case AppView.SETTINGS: return <SettingsView settings={settings} onSave={setSettings} />;
      default: return <HomeView setView={setCurrentView} settings={settings} />;
    }
  };

  return (
    <div className={`flex flex-col min-h-screen text-slate-900 overflow-x-hidden pb-24 max-w-md mx-auto relative bg-white/40 border-x border-emerald-100/30 ${devMode ? 'debug-grid' : ''}`}>
      {devMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[90%] glass-premium p-3 rounded-2xl border-amber-200/50 text-[10px] font-mono text-amber-700 space-y-1 shadow-2xl">
          <div className="flex justify-between">
            <span className="flex items-center gap-1"><Cpu size={10} /> AGENT_ACTIVE: true</span>
            <span>MODEL: GEMINI-2.5-TTS</span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1"><Terminal size={10} /> STACK: VIBE-CORE-v2</span>
            <span>LATENCY: 42ms</span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 glass-premium border-b border-white/50 px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView(AppView.HOME)}>
          <div className="w-11 h-11 leaf-gradient rounded-[14px] flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-all">
            <Leaf className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-xl tracking-tight text-emerald-950 flex items-center gap-1">
              Agridoctor <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Nexus Agent</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600/70 italic">Agentic Resilience Engine</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setDevMode(!devMode)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${devMode ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' : 'bg-slate-50 text-slate-400'}`}
          >
            <Cpu size={18} />
          </button>
          <button 
            onClick={() => setCurrentView(AppView.PITCH)}
            className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm"
          >
            <Award size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 animate-in fade-in duration-700">
        {renderView()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-premium border-t border-white/50 px-8 py-5 flex justify-between items-center z-50 rounded-t-[32px]">
        <NavButton active={currentView === AppView.HOME} onClick={() => setCurrentView(AppView.HOME)} icon={<Home />} label="Hub" />
        <NavButton active={currentView === AppView.SCANNER} onClick={() => setCurrentView(AppView.SCANNER)} icon={<Target />} label="Scan" />
        <NavButton active={currentView === AppView.IDENTITY} onClick={() => setCurrentView(AppView.IDENTITY)} icon={<UserCheck />} label="ID" />
        <NavButton active={currentView === AppView.MARKET} onClick={() => setCurrentView(AppView.MARKET)} icon={<TrendingUp />} label="Mandi" />
        <NavButton active={currentView === AppView.CHAT} onClick={() => setCurrentView(AppView.CHAT)} icon={<MessageSquare />} label="AI" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
      <div className={`transition-all duration-300 ${active ? 'bg-emerald-500 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200 -translate-y-2' : ''}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <span className={`text-[8px] font-extrabold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
    </button>
  );
}

function HomeView({ setView, settings, playAdvice, isSpeaking, agentState }: any) {
  const resilienceScore = useMemo(() => Math.min(100, Math.floor((settings.altitude / 20) + (settings.farmSize * 4.5))), [settings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${agentState.isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nexus Agent Status: {agentState.isThinking ? 'Computing' : 'Idle'}</span>
        </div>
        <span className="text-[9px] font-mono text-slate-400">MCP_TOOLS: {agentState.activeTools.length}</span>
      </div>

      <div className="relative overflow-hidden rounded-[40px] bg-[#064e3b] p-8 text-white shadow-2xl group">
        <div className="relative z-10 space-y-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Nexus Core Engine</span>
              <h2 className="text-3xl font-outfit font-bold">Resilience: <span className="text-amber-400">{resilienceScore}%</span></h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Zap size={24} className="text-emerald-300 animate-pulse" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/10">
            <p className="text-xs font-medium text-emerald-100 leading-relaxed italic">
              "Agent processing local climate telemetry for {settings.location}. Low risk of pest outbreak in current cycle."
            </p>
          </div>

          <button 
            onClick={() => playAdvice(`Nexus Agent synchronized. Current farm score is ${resilienceScore}. Satellite data shows optimal soil moisture.`)}
            disabled={isSpeaking}
            className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isSpeaking ? 'bg-emerald-800 text-emerald-400 opacity-50' : 'bg-white text-emerald-950 hover:bg-emerald-50'}`}
          >
            {isSpeaking ? <Sparkles size={16} className="animate-spin" /> : <Volume2 size={16} />} 
            {isSpeaking ? "SYNTHESIZING AGENT VOICE..." : "LISTEN TO AGENT STRATEGY"}
          </button>
        </div>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ActionTile 
          icon={<Camera size={26} className="text-emerald-600" />} 
          label="Nexus Vision" 
          sub="Multimodal Diagnostic"
          onClick={() => setView(AppView.SCANNER)}
        />
        <ActionTile 
          icon={<UserCheck size={26} className="text-blue-600" />} 
          label="Nexus ID" 
          sub=".CV Farmer Identity"
          onClick={() => setView(AppView.IDENTITY)}
        />
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
            <CloudRain size={28} />
          </div>
          <div>
            <p className="text-xl font-outfit font-bold">Satellite Feed</p>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">MCP Weather Synced</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-extrabold uppercase">Clear</div>
          <p className="text-[9px] text-slate-400 mt-1">18°C · Cool</p>
        </div>
      </div>
    </div>
  );
}

function ActionTile({ icon, label, sub, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center gap-2 text-center group hover:bg-emerald-50 transition-all active:scale-95">
      <div className="p-4 rounded-[24px] bg-slate-50 group-hover:bg-white transition-colors group-hover:scale-110">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800 tracking-tight">{label}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{sub}</p>
      </div>
    </button>
  );
}

function ScannerView({ agentState, setAgentState, playAdvice, isSpeaking, settings }: any) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const onCapture = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setAnalyzing(true);
        setAgentState({ ...agentState, isThinking: true, currentTask: 'Vision Diagnosis + MCP Context Linkage' });
        try {
          const res = await analyzeCropImage(base64.split(',')[1]);
          setResult(res);
        } catch (err) { window.alert("Core Sync Error"); }
        finally { setAnalyzing(false); setAgentState({ ...agentState, isThinking: false }); }
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadReport = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current);
      const link = document.createElement('a');
      link.download = `nexus_report_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      window.alert("Failed to export report.");
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-6">
      <div className="text-center">
        <h2 className="text-3xl font-outfit font-extrabold text-emerald-950 tracking-tight">Nexus Vision</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Cpu size={12} className="text-emerald-500" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Edge AI Diagnostics</p>
        </div>
      </div>

      {!image ? (
        <div 
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-[48px] border-4 border-dashed border-emerald-100 flex flex-col items-center justify-center gap-6 bg-emerald-50/20 cursor-pointer hover:bg-emerald-50 transition-all group"
        >
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-xl group-hover:scale-105">
            <Camera size={40} />
          </div>
          <div className="text-center">
            <span className="block font-bold text-emerald-950 text-xl">Point Agent at Crop</span>
            <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest mt-2 block">Multimodal Analysis</span>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onCapture} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-[40px] overflow-hidden shadow-2xl h-64 group">
            <img src={image} className="w-full h-full object-cover" />
            {analyzing && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
                <Sparkles size={48} className="animate-spin text-emerald-400 mb-4" />
                <p className="font-outfit font-bold text-lg tracking-widest gold-shimmer bg-clip-text text-transparent">AGENT THINKING...</p>
                <div className="mt-4 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-225"></div>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="space-y-4">
              <div ref={reportRef} className="bg-white rounded-[40px] p-8 shadow-xl border border-emerald-50 space-y-6 animate-in slide-in-from-top-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-outfit font-bold text-emerald-950">{result.disease}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Resilience Core:</span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{width: `${result.confidence * 100}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => playAdvice(result.description)}
                    className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-95"
                  >
                    <Volume2 size={24} />
                  </button>
                </div>

                <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">"{result.climateImpact}"</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-3xl">
                     <h5 className="text-[8px] font-extrabold uppercase text-slate-400 mb-2">Nexus Treatment</h5>
                     <p className="text-[10px] font-bold text-slate-800">{result.treatment[0]}</p>
                  </div>
                  <div className="p-4 bg-emerald-900 rounded-3xl text-white">
                     <h5 className="text-[8px] font-extrabold uppercase text-emerald-400 mb-2">Nexus ID Publish</h5>
                     <p className="text-[10px] font-bold">Sustainability +{result.sustainabilityScore}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={downloadReport}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={18} /> Download Result
                </button>
                <button 
                  onClick={() => {setImage(null); setResult(null);}}
                  className="px-6 bg-slate-100 text-slate-500 py-4 rounded-3xl font-bold text-sm"
                >
                  New Scan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IdentityView({ settings, setAgentState }: any) {
  const [identity, setIdentity] = useState<FarmerIdentity | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setAgentState(s => ({ ...s, isThinking: true, currentTask: 'Synthesizing Farmer Identity Layer...' }));
    try {
      const res = await generateFarmerCV(settings);
      setIdentity(res);
    } finally {
      setGenerating(false);
      setAgentState(s => ({ ...s, isThinking: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-6">
      <div className="text-center">
        <h2 className="text-3xl font-outfit font-extrabold text-emerald-950">Nexus Identity</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Verified .CV Farmer Credentials</p>
      </div>

      {!identity ? (
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-blue-50 mx-auto flex items-center justify-center text-blue-600">
             <UserCheck size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-lg">Build Your Digital Portfolio</h4>
            <p className="text-xs text-slate-500 leading-relaxed px-4">Generate a verifiable agricultural resume to unlock credit and secure better market prices.</p>
          </div>
          <button 
            onClick={generate}
            disabled={generating}
            className="w-full bg-emerald-600 text-white py-5 rounded-[2.5rem] font-extrabold text-sm shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            {generating ? <Sparkles className="animate-spin" size={18} /> : <Zap size={18} />}
            {generating ? "PUBLISHING TO .CV..." : "GENERATE IDENTITY LAYER"}
          </button>
        </div>
      ) : (
        <div className="bg-[#0f172a] rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4">
             <div className="bg-emerald-500 text-[8px] font-black uppercase px-2 py-1 rounded-full text-white">VERIFIED BY AGRI-NEXUS</div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-3xl font-outfit font-bold">{identity.name}</h3>
            <p className="text-emerald-400 font-mono text-xs">{identity.cvDomain}.cv</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricBox label="Yield Boost" value={identity.impactMetrics.yieldBoost} />
            <MetricBox label="Nexus Score" value={`${identity.nexusScore}/100`} />
            <MetricBox label="Water Saved" value={identity.impactMetrics.waterSaved} />
            <MetricBox label="Chemical Ref." value={identity.impactMetrics.chemicalReduction} />
          </div>

          <div className="pt-4 flex gap-3">
             <button className="flex-1 bg-white text-slate-900 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">SHARE PORTFOLIO</button>
             <button className="p-3.5 bg-slate-800 rounded-2xl border border-slate-700"><Download size={18} /></button>
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]"></div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value }: any) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
      <p className="text-lg font-outfit font-bold">{value}</p>
    </div>
  );
}

function MarketView({ isOffline, settings, setSettings, setAgentState, alerts, setAlerts }: any) {
  const [selectedCrop, setSelectedCrop] = useState(CROP_OPTIONS[0]);
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const currentMarketData = useMemo(() => CROP_MARKET_MAP[selectedCrop], [selectedCrop]);
  
  const activeAlert = useMemo(() => 
    alerts.find((a: any) => a.crop === selectedCrop), 
  [alerts, selectedCrop]);

  const addAlert = () => {
    if (!newAlertPrice) return;
    const alert = {
      id: Date.now().toString(),
      crop: selectedCrop,
      targetPrice: parseFloat(newAlertPrice),
      condition: 'above',
      active: true
    };
    setAlerts([...alerts.filter((a: any) => a.crop !== selectedCrop), alert]);
    setNewAlertPrice("");
  };

  const removeAlert = () => {
    setAlerts(alerts.filter((a: any) => a.crop !== selectedCrop));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 pb-10">
      <div className="text-center">
        <h2 className="text-3xl font-outfit font-extrabold text-emerald-950">Mandi Intel</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Agentic Market Predictions</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CROP_OPTIONS.map(crop => (
          <button 
            key={crop}
            onClick={() => setSelectedCrop(crop)}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex-shrink-0 transition-all ${selectedCrop === crop ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}
          >
            {crop}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentMarketData}>
              <defs>
                <linearGradient id="mandiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#mandiGradient)" />
              {activeAlert && (
                <ReferenceLine y={activeAlert.targetPrice} stroke="#f59e0b" strokeDasharray="3 3">
                  <Label value={`Alert: ${activeAlert.targetPrice}`} position="top" fill="#d97706" fontSize={10} fontWeight={800} />
                </ReferenceLine>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Bell size={18} className="text-amber-500" /> Price Alerts
          </h4>
          {activeAlert && (
            <button onClick={removeAlert} className="text-[10px] font-bold text-rose-500 uppercase">Clear</button>
          )}
        </div>
        
        {!activeAlert ? (
          <div className="flex gap-2">
            <input 
              type="number"
              value={newAlertPrice}
              onChange={e => setNewAlertPrice(e.target.value)}
              placeholder="Set target price..."
              className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-sm focus:outline-none border border-slate-100"
            />
            <button 
              onClick={addAlert}
              className="px-6 bg-emerald-600 text-white rounded-2xl font-bold text-xs"
            >
              SET
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-xs text-amber-800 font-bold">
              Watching for prices above <span className="text-amber-600">{activeAlert.targetPrice}</span> for {selectedCrop}.
            </p>
          </div>
        )}
      </div>

      <div className="bg-emerald-950 rounded-[40px] p-8 text-white relative overflow-hidden group">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h4 className="font-outfit font-bold text-xl uppercase tracking-tighter">Nexus Strategy</h4>
          </div>
          <p className="text-sm font-medium text-emerald-100/80 leading-relaxed italic">"Sell hold pattern suggested. Satellite data indicates high yield in neighbor provinces might depress prices next month."</p>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/5 rounded-full blur-[80px]"></div>
      </div>
    </div>
  );
}

function ChatView({ isOffline, agentState, setAgentState }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input } as ChatMessage;
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setAgentState({ ...agentState, isThinking: true, currentTask: 'Processing Natural Language Intent...' });
    try {
      const reply = await getSmartChatResponse(input);
      setMessages(prev => [...prev, { role: 'model', text: reply || "" }]);
    } finally { setLoading(false); setAgentState({ ...agentState, isThinking: false }); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] space-y-4">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar p-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-4">
            <MessageSquare size={64} className="text-emerald-600" />
            <p className="font-bold text-lg text-emerald-950">Nexus Agent Interface</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[2.5rem] text-sm font-semibold leading-relaxed ${
              m.role === 'user' ? 'bg-emerald-600 text-white shadow-xl' : 'bg-white text-slate-800 border border-slate-100 shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] font-extrabold uppercase text-emerald-600 animate-pulse px-4">Nexus Thinking...</div>}
        <div ref={scrollRef} />
      </div>
      
      <div className="flex gap-2 p-1">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Command your agent..."
          className="flex-1 glass-premium border border-slate-200 rounded-[28px] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
        />
        <button onClick={send} className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all">
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}

function PitchView() {
  return (
    <div className="space-y-8 pb-10 overflow-y-auto max-h-full px-2">
      <div className="text-center">
        <h2 className="text-4xl font-serif font-bold text-emerald-950 italic">Nexus Agentic Core</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mt-2">Hackathon Winning Entry v2</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <PitchCard 
          icon={<Cpu className="text-blue-500" />} 
          title="Agentic Multimodal Design" 
          desc="Not just a chatbot, but a proactive agent utilizing Gemini vision and structured logic." 
        />
        <PitchCard 
          icon={<Globe className="text-emerald-500" />} 
          title="Identity Layer (.CV)" 
          desc="Empowering farmers with verifiable digital credentials and impact metrics." 
        />
        <PitchCard 
          icon={<Volume2 className="text-amber-500" />} 
          title="Voice-First UX" 
          desc="Accessibility for the next billion users via high-fidelity Gemini synthesis." 
        />
      </div>

      <div className="bg-[#064e3b] rounded-[40px] p-8 text-white space-y-4">
        <h3 className="font-outfit font-bold text-xl flex items-center gap-2">
          <Terminal className="text-amber-400" /> Vibe Coding Stack
        </h3>
        <p className="text-sm font-medium text-emerald-100/80 leading-relaxed italic">"Built with an agent-first philosophy. This project demonstrates how AI can solve real-world sustainability gaps in emerging markets."</p>
      </div>
    </div>
  );
}

function PitchCard({ icon, title, desc }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex gap-5 items-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-bold text-slate-800 tracking-tight">{title}</h4>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave }: any) {
  const [local, setLocal] = useState(settings);
  return (
    <div className="space-y-6 animate-in slide-in-from-left-6">
      <div className="text-center">
        <h2 className="text-3xl font-outfit font-extrabold text-emerald-950">Nexus Settings</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Configure Farm Telemetry</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Mailing Address</label>
          <input 
            type="email" 
            value={local.email} 
            onChange={e => setLocal({...local, email: e.target.value})} 
            placeholder="farmer@nexus.np"
            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Altitude (MASL)</label>
          <input 
            type="number" 
            value={local.altitude} 
            onChange={e => setLocal({...local, altitude: parseInt(e.target.value)})} 
            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 font-outfit font-bold text-xl text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none" 
          />
        </div>

        <button 
          onClick={() => { onSave(local); localStorage.setItem('agridoctor_settings_v3', JSON.stringify(local)); window.alert("Settings Sync Success!"); }}
          className="w-full bg-[#064e3b] text-white py-5 rounded-[28px] font-extrabold text-lg shadow-2xl active:scale-95 transition-all"
        >
          SYNC TO CORE
        </button>
      </div>
    </div>
  );
}
