import React, { useState } from 'react';
import { ICONS } from '../constants';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';

interface FloatingSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const FloatingSupportModal: React.FC<FloatingSupportModalProps> = ({ isOpen, onClose, userEmail = '' }) => {
  const { userId, email: sessionEmail, name: sessionName, role: sessionRole, isAuthenticated } = useUser();
  const [email, setEmail] = useState(userEmail || sessionEmail || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedSubject = category ? `[Report/${category}] ${subject}` : subject;
      
      if (isAuthenticated) {
        // Authenticated user: Use Support Ticket system
        await apiService.submitSupportTicket({
          subject: formattedSubject,
          message: `Email provided in form: ${email}\n\nUser Context:\nName: ${sessionName}\nEmail: ${sessionEmail}\nRole: ${sessionRole}\n\nMessage:\n${message}`
        });
      } else {
        // Guest user: Use Public Contact Form
        await apiService.submitContactForm({
          name: email.split('@')[0], // Extract name from email as fallback
          email: email,
          mobileNumber: 'N/A', // contact form requires it
          inquiryType: category || 'Support',
          message: `${formattedSubject}\n\n${message}`
        });
      }

      showToast('success', 'Support request submitted successfully. Our team will get back to you soon.');
      onClose();
      // Reset form
      setSubject('');
      setMessage('');
      setCategory('');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to submit support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Form */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-3xl font-bold text-[#2E2E2F]">Submit a ticket</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#F2F2F2] rounded-full transition-colors md:hidden"
            >
              <ICONS.X className="w-6 h-6 text-[#2E2E2F]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2E2E2F]/70 ml-1">Your email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-5 py-3 bg-[#F2F2F2] border-2 border-transparent focus:border-[#38BDF2] rounded-xl outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2E2E2F]/70 ml-1">In a few words, tell us what your enquiry is about</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of your ticket"
                className="w-full px-5 py-3 bg-[#F2F2F2] border-2 border-transparent focus:border-[#38BDF2] rounded-xl outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2E2E2F]/70 ml-1">Provide a detailed description</label>
              <div className="relative">
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={6}
                  className="w-full px-5 py-4 bg-[#F2F2F2] border-2 border-transparent focus:border-[#38BDF2] rounded-xl outline-none transition-all font-medium resize-none pb-14"
                />
                <div className="absolute bottom-4 left-5 flex items-center gap-4 text-[#2E2E2F]/30">
                  <button type="button" className="hover:text-[#38BDF2] transition-colors"><ICONS.Smile className="w-5 h-5" /></button>
                  <button type="button" className="hover:text-[#38BDF2] transition-colors"><ICONS.Paperclip className="w-5 h-5" /></button>
                  <button type="button" className="hover:text-[#38BDF2] transition-colors"><ICONS.Image className="w-5 h-5" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2E2E2F]/70 ml-1">Select the item you need help with</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-5 py-3 bg-[#F2F2F2] border-2 border-transparent focus:border-[#38BDF2] rounded-xl outline-none transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="" disabled>Select an option...</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Billing">Billing & Subscription</option>
                <option value="Account">Account Access</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-3.5 bg-[#38BDF2] text-white rounded-full font-bold shadow-lg shadow-[#38BDF2]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Info Sidebar */}
        <div className="w-full md:w-[320px] bg-[#F8F9FA] p-8 md:p-12 border-l border-[#2E2E2F]/5 space-y-8 overflow-y-auto">
          <div className="flex justify-end hidden md:block">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#F2F2F2] rounded-full transition-colors"
            >
              <ICONS.X className="w-6 h-6 text-[#2E2E2F]/40" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-[#2E2E2F]">Before you submit:</h3>
          
          <div className="space-y-8">
            <div className="space-y-2">
              <h4 className="font-bold text-[#2E2E2F]">Tell us!</h4>
              <p className="text-sm text-[#2E2E2F]/60 leading-relaxed font-medium">Add as much detail as possible, including site and page name.</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-[#2E2E2F]">Show us!</h4>
              <p className="text-sm text-[#2E2E2F]/60 leading-relaxed font-medium">Add a screenshot or a link to a video.</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-[#2E2E2F]">What problem did you experience?</h4>
              <p className="text-sm text-[#2E2E2F]/60 leading-relaxed font-medium">Describe what happened and what you expected instead.</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-[#2E2E2F]">When did this problem happen?</h4>
              <p className="text-sm text-[#2E2E2F]/60 leading-relaxed font-medium">Let us know the date and approximate time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
