
export enum AppView {
  HOME = 'HOME',
  SCANNER = 'SCANNER',
  MARKET = 'MARKET',
  CHAT = 'CHAT',
  PITCH = 'PITCH',
  SETTINGS = 'SETTINGS',
  IDENTITY = 'IDENTITY'
}

export interface DiagnosisResult {
  disease: string;
  confidence: number;
  description: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  climateImpact: string;
  sustainabilityScore: number;
}

export interface FarmSettings {
  altitude: number;
  location: string;
  primaryCrops: string[];
  language: 'en' | 'ne';
  farmSize: number;
  soilType: string;
  email: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  agentThought?: string;
}

export interface MarketTrend {
  name: string;
  price: number;
  prediction: number;
  sentiment: 'Bullish' | 'Bearish' | 'Stable';
}

export interface PriceAlert {
  id: string;
  crop: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
}

export interface NexusAgentState {
  isThinking: boolean;
  activeTools: string[];
  currentTask: string;
}

export interface FarmerIdentity {
  name: string;
  nexusScore: number;
  verifiedLocation: string;
  cvDomain: string;
  impactMetrics: {
    waterSaved: string;
    chemicalReduction: string;
    yieldBoost: string;
  };
}
