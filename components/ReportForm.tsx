import React, { useState, useRef } from 'react';
import { Unit, RepairPriority, UnitStatus, AIAnalysisResult } from '../types';
import { analyzeDamageImage } from '../services/geminiService';
import { Camera, Wand2, Loader2, X, AlertTriangle } from 'lucide-react';

interface ReportFormProps {
  unit: Unit;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ unit, onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RepairPriority>(RepairPriority.MEDIUM);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix for API
        const base64 = result.split(',')[1]; 
        setImage(base64);
        
        // Auto-trigger analysis if description is somewhat ready or just to suggest
        // handleAIAnalysis(base64); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalysis = async () => {
    if (!image) {
        alert("Please upload an image for AI analysis.");
        return;
    }
    
    setIsAnalyzing(true);
    try {
        const result = await analyzeDamageImage(image, description, `${unit.type} ${unit.model}`);
        setAiResult(result);
        setPriority(result.estimatedPriority);
        if (!description) {
            setDescription(result.damageSummary);
        } else {
            setDescription(prev => `${prev}\n\n[AI Observation]: ${result.damageSummary}`);
        }
    } catch (error) {
        console.error(error);
        alert("Failed to analyze image. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      unitId: unit.id,
      description,
      priority,
      images: image ? [image] : [],
      aiAnalysis: aiResult?.damageSummary,
      suggestedParts: aiResult?.suggestedActions
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
            <h2 className="text-lg font-bold text-slate-800">New Damage Report</h2>
            <p className="text-xs text-slate-500">Documenting for <span className="font-mono font-medium text-blue-600">{unit.id}</span></p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6">
        {/* Image Upload Section */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Evidence Photo</label>
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    image ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
            >
                {image ? (
                    <img 
                        src={`data:image/jpeg;base64,${image}`} 
                        alt="Preview" 
                        className="h-full w-full object-contain rounded-lg p-2" 
                    />
                ) : (
                    <>
                        <Camera className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Tap to take photo or upload</span>
                    </>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
            </div>
            {image && !aiResult && (
                <button 
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {isAnalyzing ? "Analyzing Damage..." : "Analyze with Gemini AI"}
                </button>
            )}
        </div>

        {/* AI Suggestions Panel */}
        {aiResult && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-indigo-800 font-semibold text-sm">
                    <Wand2 className="h-4 w-4" />
                    AI Assessment
                </div>
                <div className="space-y-2 text-sm text-indigo-900">
                    <p><span className="font-medium">Summary:</span> {aiResult.damageSummary}</p>
                    <p><span className="font-medium">Est. Priority:</span> {aiResult.estimatedPriority}</p>
                    {aiResult.suggestedActions.length > 0 && (
                        <div>
                            <span className="font-medium">Suggestions:</span>
                            <ul className="list-disc list-inside pl-1 text-xs mt-1 opacity-80">
                                {aiResult.suggestedActions.map((action, i) => (
                                    <li key={i}>{action}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )}

        <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Describe the damage..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
                <div className="grid grid-cols-4 gap-2">
                    {[RepairPriority.LOW, RepairPriority.MEDIUM, RepairPriority.HIGH, RepairPriority.CRITICAL].map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`py-2 px-1 rounded-md text-xs font-semibold border transition-all ${
                                priority === p 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </form>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
        <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
        >
            Cancel
        </button>
        <button
            type="submit"
            form="report-form"
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
            <AlertTriangle className="h-4 w-4" />
            Submit Report
        </button>
      </div>
    </div>
  );
};