import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface EventFaqsProps {
  faqs?: FaqItem[];
  brandColor?: string;
}

export const EventFaqs: React.FC<EventFaqsProps> = ({ faqs, brandColor = '#38BDF2' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Only show real FAQs — hide section entirely if none exist
  const displayFaqs = (faqs || []).filter(f => f.question?.trim() && f.answer?.trim());

  if (displayFaqs.length === 0) return null;

  return (
    <div className="p-6 sm:p-10 bg-[#F2F2F2] rounded-[1.5rem] sm:rounded-[2rem] border border-[#2E2E2F]/10 mb-8 sm:mb-10 w-full shadow-sm">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-1.5 h-5 sm:h-6 rounded-full" style={{ backgroundColor: brandColor }} />
        <h3 className="text-[10px] sm:text-[11px] font-black text-[#2E2E2F] uppercase tracking-[0.3em]">Frequently asked questions</h3>
      </div>
      
      <div className="flex flex-col">
        {displayFaqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`border-b border-[#2E2E2F]/10 last:border-b-0 ${index === 0 ? 'pt-0' : 'pt-4 sm:pt-6'} pb-4 sm:pb-6`}
            >
              <button
                className="w-full flex justify-between items-center text-left gap-4 focus:outline-none group"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="text-[15px] sm:text-[17px] font-bold text-[#2E2E2F] tracking-tight group-hover:opacity-80 transition-opacity">
                  {faq.question}
                </span>
                <span className="shrink-0 flex items-center justify-center w-6 h-6 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: brandColor }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-3 sm:mt-4' : 'max-h-0 opacity-0 mt-0'}`}
              >
                <p className="text-[#2E2E2F]/80 text-[14px] sm:text-[15px] font-medium leading-relaxed pr-8">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
