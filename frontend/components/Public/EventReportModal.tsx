import React, { useState, useRef } from 'react';
import { Modal, Button } from '../Shared';
import { ICONS } from '../../constants';
import { apiService } from '../../services/apiService';

interface EventReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    eventId: string;
    eventName: string;
  };
  brandColor?: string;
}

const REPORT_REASONS = [
  { id: 'refund', label: 'Request a Refund', description: 'The event was canceled, postponed, rescheduled, or did not deliver the advertised experience. Include details about how you were informed of any changes and how the event was different than what was advertised.' },
  { id: 'question', label: 'Ask a question or give feedback about the event', description: 'Please provide details about your question or feedback for the event organizer.' },
  { id: 'not_happening', label: 'Event did not happen or was not as described', description: 'Please describe how the event differed from its description or provide evidence that it did not take place.' },
  { id: 'spam', label: 'Spam or misleading content', description: 'Please explain why you believe this content is spam or misleading.' },
  { id: 'unauthorised', label: 'Event not authorised to sell tickets or report invalid tickets', description: 'Provide details about why you believe this organizer is not authorised or why the tickets are invalid.' },
  { id: 'outside_payment', label: 'Payment required outside StartupLab', description: 'Report if the organizer requested payment through a non-supported platform.' },
  { id: 'harmful', label: 'Harmful Content', description: 'Describe the harmful content present in this event listing.' },
  { id: 'regulated', label: 'Regulated Content or Activities', description: 'Report illegal or regulated items or activities being promoted.' },
  { id: 'explicit', label: 'Sexually Explicit Content', description: 'Report sexually explicit imagery or descriptions.' },
  { id: 'hateful', label: 'Hateful Content', description: 'Report content that promotes hate speech or discrimination.' },
  { id: 'violence', label: 'Violence or Extremism', description: 'Report content that promotes violence or extremist views.' },
  { id: 'copyright', label: 'Copyright or Trademark Infringement', description: 'Identify the copyrighted material or trademark being used without permission.' },
];

export const EventReportModal: React.FC<EventReportModalProps> = ({ isOpen, onClose, event, brandColor = '#38BDF2' }) => {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartReport = () => setStep(2);
  
  const handleSelectReason = (r: string) => {
    setReason(r);
    setStep(3);
  };

  const selectedReasonData = REPORT_REASONS.find(r => r.label === reason);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const res = await apiService.uploadReportImage(file);
      setImageUrl(res.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !description) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await apiService.submitEventReport({
        eventId: event.eventId,
        reporterEmail: email,
        reason: reason,
        description: description,
        imageUrl: imageUrl
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReason('');
    setEmail('');
    setDescription('');
    setImageUrl('');
    setSuccess(false);
    setError('');
    onClose();
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Report Submitted">
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ICONS.Check className="w-8 h-8" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-black text-[#2E2E2F] mb-3">Thank You</h3>
          <p className="text-sm text-[#2E2E2F]/70 font-medium leading-relaxed max-w-xs mx-auto">
            Your report has been received and is being investigated by our Trust & Safety team. We appreciate your help in keeping our community safe.
          </p>
          <Button 
            className="mt-10 w-full rounded-xl py-4 font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-xl"
            style={{ backgroundColor: brandColor }}
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Report this event"
      size="sm"
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-[13px] text-[#2E2E2F] font-semibold leading-snug space-y-3">
            <p className="p-4 bg-[#2E2E2F]/5 rounded-xl border border-[#2E2E2F]/5">
              Our Community Guidelines describe the sort of content we prohibit on StartupLab. If you suspect an event may be in violation, you can report it to us so we can investigate.
            </p>
            <p className="px-4 text-[12px] text-[#2E2E2F]/60 font-medium">
              If you have a question about an event, need to resolve a dispute, or would like to request a refund, we encourage you to first contact the organizer directly.
            </p>
          </div>
          <Button 
            className="w-full rounded-xl py-3 font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-lg mt-2"
            style={{ backgroundColor: '#38BDF2' }}
            onClick={handleStartReport}
          >
            Start Report
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[12px] font-bold text-[#2E2E2F]/60 mb-2 px-1">
            Please help StartupLab investigate this event by providing information about why you're reporting it.
          </p>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar">
            <h4 className="text-[10px] font-black text-[#2E2E2F] uppercase tracking-[0.2em] mb-2 px-1">Reason For Report</h4>
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectReason(r.label)}
                className="w-full text-left p-3.5 rounded-xl border border-[#2E2E2F]/10 hover:border-[#38BDF2] hover:bg-[#38BDF2]/5 transition-all flex items-center justify-between group bg-transparent"
              >
                <span className="text-[12px] font-bold text-[#2E2E2F] group-hover:text-[#38BDF2] transition-colors">{r.label}</span>
                <svg className="w-4 h-4 text-[#2E2E2F]/30 group-hover:text-[#38BDF2] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setStep(2)}
              className="text-[9px] font-black text-[#38BDF2] uppercase tracking-widest hover:underline transition-all flex items-center gap-1"
            >
              <ICONS.ArrowLeft className="w-3 h-3" /> Back to reasons
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#2E2E2F]/50 uppercase tracking-[0.2em] mb-1.5 ml-1">Your Email</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2E2E2F]/5 bg-[#2E2E2F]/5 text-sm focus:outline-none focus:border-[#38BDF2] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#2E2E2F]/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                Description *(required)
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2E2E2F]/5 bg-[#2E2E2F]/5 text-sm focus:outline-none focus:border-[#38BDF2] transition-all resize-none"
                placeholder={selectedReasonData?.description || "Provide more details here..."}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#2E2E2F]/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                Attachment (Optional)
              </label>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
                accept="image/*"
              />
              {imageUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-[#2E2E2F]/5 bg-[#2E2E2F]/5">
                  <img src={imageUrl} alt="Attached" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <ICONS.X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 rounded-xl border-2 border-dashed border-[#2E2E2F]/10 hover:border-[#38BDF2]/40 bg-[#2E2E2F]/5 flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F2F2F2] border border-[#2E2E2F]/10 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-[#38BDF2]/20 border-t-[#38BDF2] rounded-full animate-spin" />
                    ) : (
                      <ICONS.Image className="w-4 h-4 text-[#38BDF2]" />
                    )}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 group-hover:text-[#38BDF2] transition-colors">
                    {uploading ? 'Uploading...' : 'Insert images'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold px-1">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || uploading}
              className="w-full rounded-xl py-3.5 font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-lg active:scale-95"
              style={{ backgroundColor: '#38BDF2' }}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
