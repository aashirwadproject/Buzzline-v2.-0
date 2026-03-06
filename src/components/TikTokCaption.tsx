import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TikTokCaptionProps {
  headline: string;
  details: string;
}

export const TikTokCaption: React.FC<TikTokCaptionProps> = ({ headline, details }) => {
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCaption = () => {
    setIsGenerating(true);
    
    // Simulate a brief "generation" delay for better UX
    setTimeout(() => {
      const templates = [
        `🚨 BREAKING NEWS: ${headline}\n\n${details.slice(0, 100)}...\n\nWhat do you think about this? Let us know in the comments! 👇\n\n#BuzzlineMedia #NepalNews #BreakingNews #Viral #TikTokNepal`,
        `👀 YOU WON'T BELIEVE THIS: ${headline}\n\nStay tuned for more updates on this developing story. 📈\n\n#NewsUpdate #Nepal #Buzzline #Trending #ViralNews`,
        `🇳🇵 Buzzline Media Nepal Exclusive:\n\n${headline}\n\nFull story in the video. Don't forget to like and follow for more! ✅\n\n#Nepal #Kathmandu #News #BuzzlineMedia #ForYou`,
        `🔥 Viral Alert: ${headline}\n\nThis is taking over the internet right now. What's your take? 🗣️\n\n#Viral #Trending #NepalNews #Buzzline #News`,
      ];

      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      setCaption(randomTemplate);
      setIsGenerating(false);
    }, 800);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-red-100 p-2 rounded-lg text-red-600">
            <MessageSquare size={18} />
          </div>
          <h3 className="font-bold text-slate-900 italic">Auto Caption Generator</h3>
        </div>
        <button
          onClick={generateCaption}
          disabled={isGenerating || !headline}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg active:scale-95"
        >
          {isGenerating ? (
            <>Generating...</>
          ) : (
            <>
              <Sparkles size={14} /> Auto Generate
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {caption ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative group"
          >
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 pr-12 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {caption}
            </div>
            <button
              onClick={copyToClipboard}
              className="absolute top-3 right-3 p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </motion.div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
            <p className="text-slate-400 text-xs font-medium">Click "Auto Generate" to create a viral caption for your post.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
