import React, { useState } from 'react';
import { NewsData } from './types';
import { NEWS_TYPES } from './constants';
import { NewsForm } from './components/NewsForm';
import { NewsPreview } from './components/NewsPreview';
import { TikTokCaption } from './components/TikTokCaption';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, Download, Share2, Info, Zap } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';

export default function App() {
  const [newsData, setNewsData] = useState<NewsData>({
    headline: 'Viral News Headline for Buzzline Media',
    details: 'This is where the detailed news content will go. It is automatically formatted to fit perfectly on a single TikTok slide, ensuring your viewers can read everything clearly while watching your video.',
    mediaUrl: 'https://picsum.photos/seed/viral/1080/1920',
    mediaType: 'image',
    logoUrl: '',
    logoText: 'Buzzline Media Nepal',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    detailsFontSize: 16,
    newsType: 'Breaking News',
    themeColor: '#ff0000',
  });

  const [activeSlide, setActiveSlide] = useState<'HEADLINE' | 'DETAILS'>('HEADLINE');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const recordVideo = async (slideType: 'HEADLINE' | 'DETAILS'): Promise<Blob | null> => {
    const node = document.getElementById('news-capture-area');
    const overlays = document.getElementById(`${slideType.toLowerCase()}-overlays`);
    const video = node?.querySelector('video');
    
    if (!node || !video || !overlays) return null;

    setIsRecording(true);
    setRecordingProgress(0);
    
    try {
      // Ensure video metadata is loaded
      if (isNaN(video.duration)) {
        await new Promise((resolve) => {
          video.onloadedmetadata = resolve;
        });
      }

      // 1. Capture overlays as a transparent PNG
      const overlaysDataUrl = await toPng(overlays, { quality: 1, pixelRatio: 2 });
      const overlaysImg = new Image();
      overlaysImg.src = overlaysDataUrl;
      await new Promise(resolve => overlaysImg.onload = resolve);

      // 2. Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 450 * 2; // High DPI
      canvas.height = 600 * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 3. Setup MediaRecorder
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5Mbps for better quality
      });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      // 4. Start Recording
      recorder.start();
      video.currentTime = 0;
      await video.play();

      const startTime = Date.now();
      const duration = Math.min(video.duration || 5, 5) * 1000; // Limit to 5s for faster sharing

      return new Promise((resolve) => {
        const drawFrame = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / duration) * 100);
          setRecordingProgress(progress);
          
          if (elapsed >= duration || video.ended) {
            video.pause();
            recorder.stop();
            recordingPromise.then(resolve);
            return;
          }

          // Draw Video
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Draw Overlays
          ctx.drawImage(overlaysImg, 0, 0, canvas.width, canvas.height);

          requestAnimationFrame(drawFrame);
        };
        drawFrame();
      });
    } catch (err) {
      console.error('Recording failed:', err);
      return null;
    } finally {
      setIsRecording(false);
      setRecordingProgress(0);
    }
  };

  const downloadMedia = async () => {
    const node = document.getElementById('news-capture-area');
    if (!node) return;
    
    if (newsData.mediaType === 'video') {
      const videoBlob = await recordVideo(activeSlide);
      if (videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.download = `buzzline-${activeSlide.toLowerCase()}-${Date.now()}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
    }

    // Fallback to image
    setIsDownloading(true);
    try {
      const blob = await toBlob(node, { quality: 0.95, pixelRatio: 2 });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `buzzline-${activeSlide.toLowerCase()}-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareToTikTok = async () => {
    const node = document.getElementById('news-capture-area');
    if (!node) return;

    setIsSharing(true);
    try {
      const files: File[] = [];
      
      if (newsData.mediaType === 'video') {
        const videoBlob = await recordVideo(activeSlide);
        if (videoBlob) {
          files.push(new File([videoBlob], `buzzline-${activeSlide.toLowerCase()}.webm`, { type: 'video/webm' }));
        }
      } else {
        const blob = await toBlob(node, { 
          quality: 0.9, 
          pixelRatio: 2,
          cacheBust: true 
        });
        if (blob) {
          files.push(new File([blob], `buzzline-${activeSlide.toLowerCase()}.png`, { type: 'image/png' }));
        }
      }

      if (files.length === 0) {
        throw new Error('Failed to generate media for sharing');
      }

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: 'Buzzline News',
          text: `${newsData.headline}\n\nGenerated by Buzzline Media Nepal`,
        });
      } else {
        alert('Your browser does not support direct sharing. Please use the "Save Slide" button instead.');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
      alert('Sharing failed. Please try saving the slide instead.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Newspaper className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none tracking-tight">Buzzline Media</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TikTok Automator</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <Zap size={14} className="text-amber-500" /> System Online
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 italic">News Desk</h2>
              <p className="text-slate-500 text-sm mb-8">Create viral TikTok news slides in seconds.</p>
              
              <NewsForm 
                onUpdate={(update) => setNewsData(prev => ({ ...prev, ...update }))}
                currentData={newsData}
              />
            </section>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7">
            <div className="sticky top-28">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-900 italic">Live Preview</h2>
                  <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveSlide('HEADLINE')}
                      className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeSlide === 'HEADLINE' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      SLIDE 1: HEADLINE
                    </button>
                    <button 
                      onClick={() => setActiveSlide('DETAILS')}
                      className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeSlide === 'DETAILS' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      SLIDE 2: DETAILS
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={shareToTikTok}
                    disabled={isSharing || isDownloading || isRecording}
                    className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 shadow-xl min-w-[140px]"
                  >
                    <div className="flex items-center gap-2">
                      <Share2 size={14} /> {isSharing ? 'Preparing...' : isRecording ? 'Recording...' : 'Share Slide'}
                    </div>
                    {isRecording && (
                      <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                        <div className="bg-white h-full transition-all duration-300" style={{ width: `${recordingProgress}%` }} />
                      </div>
                    )}
                  </button>
                  
                  <button 
                    onClick={downloadMedia}
                    disabled={isDownloading || isSharing || isRecording}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 shadow-xl min-w-[140px]"
                  >
                    <div className="flex items-center gap-2">
                      <Download size={14} /> {isDownloading ? 'Saving...' : isRecording ? 'Recording...' : 'Save Slide'}
                    </div>
                    {isRecording && (
                      <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                        <div className="bg-white h-full transition-all duration-300" style={{ width: `${recordingProgress}%` }} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-center flex-col items-center gap-4">
                <NewsPreview 
                  data={newsData} 
                  slide={activeSlide} 
                />
              </div>

              <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">TikTok Publishing Tip</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download both slides and use them in your TikTok video. Start with the Headline slide to hook viewers, then transition to the Details slide for the full story.
                  </p>
                </div>
              </div>

              <TikTokCaption 
                headline={newsData.headline} 
                details={newsData.details} 
              />
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
