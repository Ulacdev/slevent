import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

const DOCS_SECTIONS = [
  {
    category: 'Getting started',
    items: [
      { id: 'overview', title: 'Overview' },
      { id: 'quickstart', title: 'Quickstart' },
      { id: 'changelog', title: 'Changelog' },
    ]
  },
  {
    category: 'Core concepts',
    items: [
      { id: 'how-it-works', title: 'How Startuplab works' },
      { id: 'roles', title: 'User roles & permissions' },
      { id: 'subscriptions', title: 'Subscription Plans' },
      { id: 'ai', title: 'AI Chatbot & FAQ' },
    ]
  },
  {
    category: 'Use Startuplab',
    items: [
      { id: 'ticketing', title: 'Ticketing & Pricing' },
      { id: 'checkin', title: 'Scanning & Check-ins' },
      { id: 'analytics', title: 'Analytics & Reports' },
    ]
  }
];

const DocsAIChat = ({ onClose }: { onClose: () => void }) => {
  const [assistantInput, setAssistantInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleAssistantSubmit = async () => {
    if (!assistantInput.trim()) return;
    const userMsg = assistantInput.trim();
    setAssistantInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      setIsTyping(false);
      if (data.reply) {
        setChatHistory(prev => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.' }]);
      }
    } catch (err) {
      setIsTyping(false);
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Sorry, the server could not be reached.' }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f2f2] dark:bg-[#09090b] shadow-none">
      
      {/* Native-style header matching Left Nav / TOC */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827] dark:text-[#f9fafb]">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          Ask AI
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[#27272a] rounded transition-colors text-[#71717a]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
        {chatHistory.length === 0 && (
          <div className="text-center mt-10">
            <h3 className="text-[#111827] dark:text-white font-bold mb-1">How can I help you today?</h3>
            <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa]">Powered by Groq.</p>
          </div>
        )}
        
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#e5e7eb] dark:bg-[#27272a] text-[#111827] dark:text-[#e4e4e7] border border-[#d4d4d8] dark:border-[#3f3f46]'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#e5e7eb] dark:bg-[#27272a] border border-[#d4d4d8] dark:border-[#3f3f46] rounded-2xl px-4 py-3 flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 shrink-0 bg-[#f2f2f2] dark:bg-[#09090b]">
        <div className="border border-[#e5e7eb] dark:border-[#3f3f46] rounded-xl p-2 bg-white dark:bg-[#18181b] shadow-sm focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors relative flex items-end gap-2">
          <textarea 
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAssistantSubmit();
              }
            }}
            placeholder="Ask a question..." 
            className="flex-1 bg-transparent outline-none text-[13px] resize-none text-[#111827] dark:text-white placeholder-[#a1a1aa] min-h-[20px] max-h-[150px] pt-1.5 pl-2"
            rows={1}
          />
          <button onClick={handleAssistantSubmit} disabled={!assistantInput.trim()} className="w-7 h-7 shrink-0 rounded-full bg-blue-600 disabled:bg-[#d4d4d8] dark:disabled:bg-[#3f3f46] flex items-center justify-center text-white hover:bg-blue-700 transition-colors mb-0.5 mr-0.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const DOCS_CONTENT: Record<string, { title?: string; content: React.ReactNode; toc?: {id: string, title: string}[] }> = {
  overview: {
    toc: [
      { id: 'what-is-startuplab', title: 'What is Startuplab?' },
      { id: 'how-it-works', title: 'How it works' },
      { id: 'next-steps', title: 'Next steps' }
    ],
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>
          Welcome to the <strong>Startuplab Business Ticketing Platform</strong> documentation. 
          This platform is designed to handle the entire lifecycle of an event, from creation to check-in.
        </p>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#e5e7eb] dark:border-[#27272a] bg-[#f9fafb] dark:bg-[#18181b] my-6">
          <svg className="w-5 h-5 text-[#6b7280] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm m-0">Startuplab is entirely web-based. There is no software to install or maintain locally.</p>
        </div>

        <h2 id="what-is-startuplab" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          What is Startuplab?
        </h2>
        <p>
          Startuplab brings Attendees, Organizers, and Staff together into one cohesive system:
        </p>
        <ul className="list-disc pl-6 space-y-2 marker:text-gray-400">
          <li><strong>Organizers</strong> create event listings, set up ticket tiers, and track sales via a comprehensive dashboard.</li>
          <li><strong>Attendees</strong> browse events, purchase tickets securely via HitPay/GCash, and receive digital QR-code tickets.</li>
          <li><strong>Staff</strong> use our built-in web scanner to validate QR tickets at the door, preventing duplicate entries.</li>
        </ul>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] dark:bg-[#052e16] dark:border-[#166534] my-8">
          <svg className="w-5 h-5 text-[#16a34a] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-[#166534] dark:text-[#4ade80] m-0">
            <strong>Pro Tip:</strong> Organizers can upgrade their Subscription Plans to unlock premium features like AI-generated FAQs and priority support.
          </p>
        </div>

        <h2 id="how-it-works" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          How it works
        </h2>
        <p>Startuplab simplifies event management into three core pillars:</p>

        <div className="border border-[#e5e7eb] dark:border-[#27272a] rounded-xl overflow-hidden mt-6 mb-12 shadow-sm bg-white dark:bg-[#09090b]">
          <div className="flex items-center gap-3 p-4 border-b border-[#e5e7eb] dark:border-[#27272a] hover:bg-[#f9fafb] dark:hover:bg-[#18181b] transition-colors">
            <svg className="w-5 h-5 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div>
              <span className="font-bold text-[15px] text-[#111827] dark:text-white block">1. Event Setup</span>
              <span className="text-xs text-[#6b7280]">Create an event, set schedules, and define ticket tiers (e.g., General Admission, VIP).</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 border-b border-[#e5e7eb] dark:border-[#27272a] hover:bg-[#f9fafb] dark:hover:bg-[#18181b] transition-colors">
            <svg className="w-5 h-5 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <div>
              <span className="font-bold text-[15px] text-[#111827] dark:text-white block">2. Ticket Sales</span>
              <span className="text-xs text-[#6b7280]">Attendees purchase tickets via secure gateways. Tickets are emailed as QR codes instantly.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 hover:bg-[#f9fafb] dark:hover:bg-[#18181b] transition-colors">
            <svg className="w-5 h-5 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            <div>
              <span className="font-bold text-[15px] text-[#111827] dark:text-white block">3. Door Operations</span>
              <span className="text-xs text-[#6b7280]">Staff scan attendee QR codes using their mobile device camera to track attendance.</span>
            </div>
          </div>
        </div>

        <h2 id="next-steps" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          Next steps
        </h2>
        <p>
          Ready to launch your first event? Head over to the <Link to="/docs?page=quickstart" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Quickstart guide</Link>.
        </p>
      </div>
    )
  },
  quickstart: {
    toc: [
      { id: 'create-event', title: '1. Create your event' },
      { id: 'add-tickets', title: '2. Add tickets' },
      { id: 'publish', title: '3. Publish' }
    ],
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Get up and running with Startuplab in just three simple steps.</p>
        
        <h2 id="create-event" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          1. Create your event
        </h2>
        <p>Log in as an Organizer and navigate to your Dashboard. Click the <strong>Create Event</strong> button to open the event builder.</p>
        <p>You will need to provide basic details such as the event name, description, venue location, and schedule.</p>
        
        <h2 id="add-tickets" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          2. Add tickets
        </h2>
        <p>In the Registrations step, you can configure the tickets you want to sell. For each ticket tier, specify:</p>
        <ul className="list-disc pl-6 space-y-2 marker:text-gray-400">
          <li><strong>Name:</strong> e.g., General Admission, Early Bird, VIP</li>
          <li><strong>Price:</strong> Set it to ₱0 for free events, or specify a price for paid events.</li>
          <li><strong>Quantity:</strong> Limit the number of available tickets to prevent overbooking.</li>
        </ul>

        <h2 id="publish" className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-16 mb-6">
          3. Publish
        </h2>
        <p>Review your event details. Once you are satisfied, hit <strong>Publish</strong>. Your event is now live and attendees can start purchasing tickets!</p>
      </div>
    )
  },
  roles: {
    title: 'User roles & permissions',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Startuplab uses a strict role-based access control (RBAC) system. There are three primary roles in the system:</p>
        <div className="border border-[#e5e7eb] dark:border-[#27272a] rounded-xl p-6 bg-white dark:bg-[#09090b] my-6">
          <h3 className="font-bold text-[#111827] dark:text-white mb-2">1. Organizers</h3>
          <p className="text-sm mb-4">The creators of events. They have full access to the Organizer Dashboard, where they can build event pages, configure tickets, view financial analytics, and manage staff members.</p>
          <h3 className="font-bold text-[#111827] dark:text-white mb-2">2. Staff</h3>
          <p className="text-sm mb-4">Assigned by Organizers to help run events. Staff members have limited dashboard access and primarily use the Startuplab mobile web-scanner to scan and validate attendee QR codes at the door.</p>
          <h3 className="font-bold text-[#111827] dark:text-white mb-2">3. Attendees</h3>
          <p className="text-sm">The end-users who browse public events and purchase tickets. They do not have dashboard access, but they have a user profile where they can view and download their purchased tickets.</p>
        </div>
      </div>
    )
  },
  checkin: {
    title: 'Scanning & Check-ins',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Our real-time QR code scanning system ensures a smooth check-in process and prevents ticket fraud.</p>
        <h2 className="text-[28px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mt-12 mb-6">How to scan tickets</h2>
        <ul className="list-decimal pl-6 space-y-2 marker:text-gray-400">
          <li>Log into Startuplab as a <strong>Staff</strong> member on your smartphone.</li>
          <li>Navigate to your assigned event and tap <strong>Open Scanner</strong>.</li>
          <li>Point your camera at the Attendee's ticket QR code.</li>
          <li>If the ticket is valid, the screen will flash green and mark them as "Checked In". If the ticket was already scanned, it will flash red and alert you of a duplicate entry.</li>
        </ul>
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] dark:bg-[#052e16] dark:border-[#166534] my-8">
          <svg className="w-5 h-5 text-[#16a34a] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[#166534] dark:text-[#4ade80] m-0">No external app installation is required! The scanner works directly inside your mobile browser using the HTML5 Camera API.</p>
        </div>
      </div>
    )
  },
  changelog: {
    title: "What's New (Changelog)",
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Stay up to date with the latest features, improvements, and bug fixes in Startuplab.</p>
        <div className="border-l-2 border-[#e5e7eb] dark:border-[#27272a] pl-6 py-2">
          <h3 className="font-bold text-[#111827] dark:text-white">v2.0.0 - Recent Update</h3>
          <ul className="list-disc pl-4 mt-2 marker:text-gray-400">
            <li>Added Native React Documentation Portal.</li>
            <li>Introduced Subscription Plans with limits on events and tickets.</li>
            <li>Implemented AI FAQ Generation for Pro and Enterprise users.</li>
          </ul>
        </div>
        <div className="border-l-2 border-[#e5e7eb] dark:border-[#27272a] pl-6 py-2">
          <h3 className="font-bold text-[#111827] dark:text-white">v1.1.0 - The Scanner Update</h3>
          <ul className="list-disc pl-4 mt-2 marker:text-gray-400">
            <li>Launched Mobile Web QR Scanner for Door Staff.</li>
            <li>Added HitPay integration for secure ticket purchases.</li>
          </ul>
        </div>
      </div>
    )
  },
  'how-it-works': {
    title: 'How Startuplab works',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Startuplab connects organizers and attendees through a seamless ticket flow.</p>
        <p>1. <strong>Creation</strong>: Organizers create events and publish them to the public marketplace.</p>
        <p>2. <strong>Purchase</strong>: Attendees discover events and buy tickets using their preferred payment method. A unique QR code is generated securely in the backend.</p>
        <p>3. <strong>Check-in</strong>: At the venue, Staff members scan the QR code to grant entry.</p>
      </div>
    )
  },
  ai: {
    title: 'AI Chatbot & FAQ',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Startuplab includes intelligent AI features to help you run your events better.</p>
        <h3 className="font-bold text-[#111827] dark:text-white mt-8 mb-2">AI Event FAQ Generation</h3>
        <p>As an Organizer on a premium tier, you can auto-generate Frequently Asked Questions for your event using AI. Based on your event's description and schedule, the AI will predict what attendees will ask and generate the questions and answers instantly.</p>
        <h3 className="font-bold text-[#111827] dark:text-white mt-8 mb-2">AI Assistant Chatbot</h3>
        <p>Our platform also features a floating AI chatbot on the public pages to help attendees navigate the platform and discover events easily without contacting support.</p>
      </div>
    )
  },
  ticketing: {
    title: 'Ticketing & Pricing',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Configure exactly how you want to sell your tickets.</p>
        <ul className="list-disc pl-6 space-y-2 marker:text-gray-400">
          <li><strong>Free Tickets:</strong> Perfect for RSVPs and community events. Just set the price to 0.</li>
          <li><strong>Paid Tickets:</strong> Collect revenue directly to your bank account via HitPay, GCash, or Maya.</li>
          <li><strong>Capacity Limits:</strong> Set a strict limit on the number of tickets available per tier to prevent overselling.</li>
        </ul>
      </div>
    )
  },
  subscriptions: {
    title: 'Subscription Plans',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>Organizers can choose from different subscription tiers based on their needs:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 border border-[#e5e7eb] dark:border-[#27272a] rounded-xl bg-white dark:bg-[#09090b]">
            <h4 className="font-bold text-[#111827] dark:text-white">Basic</h4>
            <p className="text-sm text-[#6b7280] mt-2">Free. Limited to 1 active event and standard support.</p>
          </div>
          <div className="p-4 border border-[#3b82f6] rounded-xl bg-blue-50 dark:bg-blue-900/10">
            <h4 className="font-bold text-[#3b82f6]">Pro</h4>
            <p className="text-sm text-[#6b7280] mt-2">Up to 5 active events. Unlocks AI FAQ Generation.</p>
          </div>
          <div className="p-4 border border-[#e5e7eb] dark:border-[#27272a] rounded-xl bg-white dark:bg-[#09090b]">
            <h4 className="font-bold text-[#111827] dark:text-white">Enterprise</h4>
            <p className="text-sm text-[#6b7280] mt-2">Unlimited events, unlimited tickets, and priority 24/7 support.</p>
          </div>
        </div>
      </div>
    )
  },
  analytics: {
    title: 'Analytics & Reports',
    content: (
      <div className="space-y-6 text-[15px] leading-[26px] text-[#3f3f46] dark:text-[#a1a1aa] font-sans">
        <p>The Organizer Dashboard gives you real-time insights into your event performance.</p>
        <p>Monitor your ticket sales, revenue, and actual door attendance all from one dashboard. You can also export Attendee lists to CSV for your own marketing purposes.</p>
      </div>
    )
  }
};

export const DocsPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeId = searchParams.get('page') || 'overview';
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, title: string, category: string}[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const LANGUAGES = [
    { name: 'English', code: 'en' },
    { name: 'Español', code: 'es' },
    { name: 'Français', code: 'fr' },
    { name: 'Deutsch', code: 'de' },
    { name: '日本語', code: 'ja' }
  ];

  // Language State
  const [language, setLanguage] = useState(() => {
    try {
      const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
      const code = match ? match[1] : 'en';
      const lang = LANGUAGES.find(l => l.code === code);
      return lang ? lang.name : 'English';
    } catch {
      return 'English';
    }
  });
  const [isLangOpen, setIsLangOpen] = useState(false);


  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const addScript = document.createElement('script');
      addScript.id = 'google-translate-script';
      addScript.setAttribute('src', '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
      document.body.appendChild(addScript);
      
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,es,fr,de,ja',
          autoDisplay: false
        }, 'google_translate_element');
      };
    }
  }, []);

  const handleLanguageChange = (langName: string, langCode: string) => {
    setLanguage(langName);
    setIsLangOpen(false);
    
    // Set Google Translate cookies robustly
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname};`;
    
    // Hard reload to guarantee translation applies universally
    window.location.reload();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results: {id: string, title: string, category: string}[] = [];
    DOCS_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (item.title.toLowerCase().includes(q) || section.category.toLowerCase().includes(q)) {
          results.push({ id: item.id, title: item.title, category: section.category });
        }
      });
    });
    setSearchResults(results);
  };
  
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const currentContent = DOCS_CONTENT[activeId] || DOCS_CONTENT.overview;

  return (
    <div className="docs-page-root min-h-screen bg-[#f2f2f2] dark:bg-[#09090b] text-[#111827] dark:text-[#f9fafb] flex flex-col">
      
      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-[280px] max-w-[80vw] h-[100dvh] bg-[#f2f2f2] dark:bg-[#09090b] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb] dark:border-[#27272a] shrink-0">
              <span className="font-bold text-[#111827] dark:text-white">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-[#71717a] hover:bg-[#e5e7eb] dark:hover:bg-[#27272a] rounded transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              
              {/* Mobile Search */}
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search docs..." 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#18181b] border border-[#e5e7eb] dark:border-[#3f3f46] rounded-lg pl-9 pr-4 py-2 text-[14px] outline-none text-[#111827] dark:text-white" 
                />
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-[#e5e7eb] dark:border-[#27272a] rounded-lg shadow-xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                    {searchResults.length > 0 ? searchResults.map(res => (
                      <Link key={res.id} to={`/docs?page=${res.id}`} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] border-b border-[#e5e7eb] dark:border-[#27272a] last:border-0">
                        <div className="text-[14px] font-bold">{res.title}</div>
                        <div className="text-[12px] text-[#71717a] mt-0.5">{res.category}</div>
                      </Link>
                    )) : (
                      <div className="px-4 py-3 text-[14px] text-[#71717a]">No results found.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Language */}
              <div>
                <p className="text-[11px] font-bold text-[#71717a] uppercase tracking-wider mb-2">Language</p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(lang => (
                    <button 
                      key={lang.code}
                      onClick={() => { handleLanguageChange(lang.name, lang.code); setIsMobileMenuOpen(false); }}
                      className={`px-3 py-2 text-[12px] rounded-lg border text-left transition-colors ${language === lang.name ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-[#38BDF2] dark:text-[#38BDF2]' : 'border-[#e5e7eb] dark:border-[#27272a] text-[#3f3f46] dark:text-[#a1a1aa]'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-[#e5e7eb] dark:border-[#27272a]" />

              {/* Mobile Navigation */}
              <nav className="space-y-6">
                {DOCS_SECTIONS.map((section) => (
                  <div key={section.category}>
                    <h3 className="text-[13px] font-bold text-[#111827] dark:text-[#f9fafb] mb-2 px-1">
                      {section.category}
                    </h3>
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                          <li key={item.id}>
                            <Link
                              to={`/docs?page=${item.id}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`block px-3 py-2 text-[14px] rounded-lg transition-colors ${
                                isActive ? 'bg-[#f4f4f5] dark:bg-[#27272a] text-[#111827] dark:text-white font-bold' : 'text-[#3f3f46] dark:text-[#a1a1aa] font-medium'
                              }`}
                            >
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>

            </div>
          </div>
        </div>
      )}

      <div id="google_translate_element" className="hidden"></div>
      <style>{`
        .docs-page-root, .docs-page-root *:not(code):not(pre) { font-family: Helvetica, Arial, sans-serif !important; }
        .goog-te-banner-frame { display: none !important; }
        .goog-te-menu-value { display: none !important; }
        #google_translate_element { display: none !important; }
        body { top: 0 !important; }
        .skiptranslate > iframe { display: none !important; }
      `}</style>
      
      {/* 1. TOP NAV BAR */}
      <header className="h-[60px] border-b border-[#e5e7eb] dark:border-[#27272a] bg-[#f2f2f2] dark:bg-[#09090b] flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-1.5 -ml-1.5 text-[#71717a] hover:bg-[#e5e7eb] dark:hover:bg-[#27272a] rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <img src="/lgo.webp" alt="Startuplab Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            <span className="text-[17px] sm:text-[19px] font-serif tracking-tight text-[#111827] dark:text-white">
              <span className="text-[#38BDF2]">Startup</span>lab Docs
            </span>
          </Link>
          <div className="relative ml-2 hidden sm:block">
            <div onClick={() => setIsLangOpen(!isLangOpen)} className="hidden sm:flex items-center gap-1 text-[13px] text-[#52525b] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors">
              {language}
              <svg className={`w-3.5 h-3.5 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {isLangOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-[#18181b] border border-[#e5e7eb] dark:border-[#27272a] rounded-lg shadow-lg overflow-hidden z-50 py-1">
                {LANGUAGES.map(lang => (
                  <button 
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.name, lang.code)}
                    className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${language === lang.name ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-[#3f3f46] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'}`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-[500px] mx-4 gap-3 relative">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full bg-[#f4f4f5] dark:bg-[#18181b] border border-transparent focus:border-[#d4d4d8] dark:focus:border-[#3f3f46] rounded-lg pl-9 pr-14 py-1.5 text-[14px] outline-none transition-colors text-[#111827] dark:text-white placeholder-[#a1a1aa]" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="hidden sm:inline-block text-[11px] font-sans px-1.5 py-0.5 rounded text-[#a1a1aa]">Ctrl K</kbd>
            </div>
            
            {/* Search Dropdown */}
            {isSearchFocused && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-[#e5e7eb] dark:border-[#27272a] rounded-lg shadow-xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(res => (
                    <Link 
                      key={res.id} 
                      to={`/docs?page=${res.id}`} 
                      className="block px-4 py-3 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] border-b border-[#e5e7eb] dark:border-[#27272a] last:border-0"
                    >
                      <div className="text-[14px] font-bold text-[#111827] dark:text-white">{res.title}</div>
                      <div className="text-[12px] text-[#71717a] mt-0.5">{res.category}</div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-3 text-[14px] text-[#71717a]">No results found for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">

          <Link to="/" className="hidden sm:block px-3.5 py-1.5 rounded-full bg-[#111827] dark:bg-white text-white dark:text-black text-[13px] font-bold hover:opacity-90 transition-opacity">Startuplab on the Web ›</Link>
          <button onClick={toggleTheme} className="text-[#71717a] hover:text-[#111827] dark:hover:text-white transition-colors">
            {isDark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
      </header>

      {/* 2. SECONDARY NAV BAR */}
      <div className="h-[48px] border-b border-[#e5e7eb] dark:border-[#27272a] bg-[#f2f2f2] dark:bg-[#09090b] px-4 sm:px-6 shrink-0 flex items-center justify-between sticky top-[60px] z-40">
        <nav className="flex items-center gap-6 text-[13px] font-medium h-full overflow-x-auto scrollbar-hide flex-1">
          <Link to="/docs" className="h-full flex items-center text-[#111827] dark:text-white font-bold border-b-2 border-[#111827] dark:border-white whitespace-nowrap">Getting started</Link>
          <Link to="/docs?page=ticketing" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap">Build with Startuplab</Link>
          <Link to="/docs?page=roles" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap">Administration</Link>
          <Link to="/docs?page=subscriptions" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap">Configuration</Link>
          <Link to="/docs?page=ai" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap">Reference</Link>
          <Link to="/docs?page=changelog" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap">What's New</Link>
          <Link to="/organizer-support" className="h-full flex items-center text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-white whitespace-nowrap pr-4">Resources</Link>
        </nav>
        
        <div className="pl-4 ml-auto border-l border-[#e5e7eb] dark:border-[#27272a] flex items-center h-full">
          <button onClick={() => setIsAssistantOpen(!isAssistantOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isAssistantOpen ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-[#e5e7eb] dark:border-[#27272a] text-[#3f3f46] dark:text-[#e4e4e7] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'} text-[13px] font-medium transition-colors whitespace-nowrap`}>
            Ask AI
          </button>
        </div>
      </div>

      <div className="flex-1 flex justify-center w-full max-w-[1400px] mx-auto bg-[#f2f2f2] dark:bg-[#09090b]">
        
        {/* Left Sidebar (Navigation) */}
        <aside className="hidden lg:block w-[260px] shrink-0 sticky top-[108px] h-[calc(100vh-108px)] overflow-y-auto pl-4 pr-6 py-6 border-r border-[#e5e7eb] dark:border-[#27272a] scrollbar-none">
          <nav className="space-y-6">
            {DOCS_SECTIONS.map((section) => (
              <div key={section.category}>
                <h3 className="text-[13px] font-bold text-[#111827] dark:text-[#f9fafb] mb-2 px-3">
                  {section.category}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <li key={item.id}>
                        <Link
                          to={`/docs?page=${item.id}`}
                          className={`block px-3 py-1.5 text-[14px] rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-[#f4f4f5] dark:bg-[#27272a] text-[#111827] dark:text-white font-bold' 
                              : 'text-[#3f3f46] dark:text-[#a1a1aa] hover:bg-[#f4f4f5]/50 dark:hover:bg-[#18181b] hover:text-[#111827] dark:hover:text-white font-medium'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            
            <div className="pt-4 mt-4 border-t border-[#e5e7eb] dark:border-[#27272a]">
              <h3 className="text-[13px] font-bold text-[#111827] dark:text-[#f9fafb] mb-2 px-3">
                Platforms and integrations
              </h3>
              <ul className="space-y-0.5">
                <li><Link to="/docs?page=overview" className="block px-3 py-1.5 text-[14px] rounded-lg text-[#3f3f46] dark:text-[#a1a1aa] hover:bg-[#f4f4f5]/50 font-medium">Overview</Link></li>
                <li><Link to="/docs?page=checkin" className="block px-3 py-1.5 text-[14px] rounded-lg text-[#3f3f46] dark:text-[#a1a1aa] hover:bg-[#f4f4f5]/50 font-medium">Remote Control</Link></li>
                <li>
                  <Link to="/" className="flex items-center justify-between px-3 py-1.5 text-[14px] rounded-lg text-[#3f3f46] dark:text-[#a1a1aa] hover:bg-[#f4f4f5]/50 font-medium group">
                    Startuplab on the web
                    <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-16 py-8">
          <div className="max-w-[760px] mx-auto">
            
            {/* Title (hidden if provided in content) */}
            {currentContent.title && (
              <h1 className="text-[32px] font-serif tracking-tight text-[#111827] dark:text-[#f9fafb] mb-8">
                {currentContent.title}
              </h1>
            )}
            
            {/* Content Body */}
            <div className="pb-16">
              {currentContent.content}
            </div>

          </div>
        </main>

        {/* Right Sidebar (Table of Contents) */}
        {!isAssistantOpen && (
          <aside className="hidden xl:block w-[240px] shrink-0 sticky top-[108px] h-[calc(100vh-108px)] overflow-y-auto pr-8 py-8 scrollbar-none">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827] dark:text-[#f9fafb] mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              On this page
            </div>
            {currentContent.toc && currentContent.toc.length > 0 && (
              <div>
                <p className="text-[13px] font-bold text-[#111827] dark:text-[#f9fafb] mb-2 mt-4">Getting started</p>
                <ul className="space-y-2.5 text-[13px]">
                  {currentContent.toc.map((heading) => (
                    <li key={heading.id}>
                      <a 
                        href={`#${heading.id}`}
                        className="text-[#52525b] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f9fafb] transition-colors line-clamp-2 leading-snug font-medium"
                      >
                        {heading.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}

        {/* AI Assistant Right Pane */}
        {isAssistantOpen && (
          <>
            {/* Mobile/Tablet Overlay (hidden on xl screens) */}
            <div className="xl:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-[90] transition-opacity" onClick={() => setIsAssistantOpen(false)} />
            
            <aside className="fixed xl:sticky inset-y-0 right-0 z-[100] xl:z-auto w-[350px] max-w-[90vw] bg-[#f2f2f2] dark:bg-[#09090b] shadow-2xl xl:shadow-none border-l border-[#e5e7eb] dark:border-[#27272a] flex flex-col top-0 xl:top-[108px] h-[100dvh] xl:h-[calc(100vh-108px)]">
              <DocsAIChat onClose={() => setIsAssistantOpen(false)} />
            </aside>
          </>
        )}

      </div>
    </div>
  );
};
