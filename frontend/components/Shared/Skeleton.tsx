import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rect', 
  width, 
  height 
}) => {
  // Use semantic tokens for background and shimmer gradient
  const baseStyles = "bg-black/[0.05] dark:bg-white/[0.05] animate-shimmer relative overflow-hidden";
  
  const variantStyles = {
    rect: "rounded-xl",
    circle: "rounded-full",
    text: "rounded-md h-4 w-3/4"
  };

  const style: React.CSSProperties = {
    width: width,
    height: height
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
    </div>
  );
};

export const EventCardSkeleton: React.FC<{ layout?: 'vertical' | 'horizontal' }> = ({ layout = 'vertical' }) => {
  if (layout === 'horizontal') {
    return (
      <div className="bg-surface dark:bg-surface border border-sidebar-border rounded-2xl p-4 flex flex-col sm:flex-row gap-6 shadow-sm w-full animate-in fade-in duration-700">
        {/* Image Area */}
        <div className="relative w-full sm:w-[280px] lg:w-[320px] h-[180px] rounded-xl overflow-hidden shrink-0 bg-background/50">
          <Skeleton className="w-full h-full !rounded-none" />
          {/* Top Left Date Badge Placeholder */}
          <div className="absolute top-3 left-3 z-[1]">
             <Skeleton variant="rect" width={58} height={54} className="rounded-xl opacity-50" />
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex flex-col flex-1 py-1 gap-5">
          <div className="space-y-4">
             <Skeleton variant="text" width="85%" height={32} className="rounded-lg" />
             <Skeleton variant="text" width="60%" height={24} />
             <Skeleton variant="text" width="40%" height={24} />
          </div>
          
          <div className="mt-auto flex items-center justify-between pt-6 border-t border-sidebar-border/50">
             <Skeleton variant="rect" width={110} height={32} className="rounded-full" />
             <div className="flex gap-2">
                <Skeleton variant="circle" width={38} height={38} />
                <Skeleton variant="circle" width={38} height={38} />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-surface border border-sidebar-border rounded-[5px] overflow-hidden shadow-sm h-full flex flex-col animate-in fade-in duration-700">
      {/* Image Area with Date Overlay */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-background/50">
        <Skeleton className="w-full h-full !rounded-none" />
        
        {/* Date Badge Overlay Placeholder */}
        <div className="absolute top-3 left-3 z-[1]">
           <Skeleton variant="rect" width={54} height={50} className="rounded-md opacity-50" />
        </div>

        {/* Action Buttons Placeholder */}
        <div className="absolute top-3 right-3 flex gap-2 z-[1]">
           <Skeleton variant="circle" width={36} height={36} className="opacity-50" />
           <Skeleton variant="circle" width={36} height={36} className="opacity-50" />
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col pt-6">
        {/* Title */}
        <Skeleton variant="text" width="90%" height={28} className="mb-6 rounded-lg" />
        
        {/* Decorative Separator Matching Order-2 of Real Card */}
        <div className="flex items-center mb-6 -mx-5 opacity-30">
           <div className="flex-1 border-t border-sidebar-border" />
           <div className="w-2.5 h-2.5 rounded-full border-2 border-sidebar-border bg-surface -mr-1 z-10" />
           <div className="w-5" />
        </div>

        {/* Info Rows */}
        <div className="flex flex-col gap-3.5 mb-6 order-3">
          <div className="flex items-start gap-2.5">
            <Skeleton variant="rect" width={18} height={18} className="mt-0.5 rounded-sm" />
            <Skeleton variant="text" width="75%" height={18} />
          </div>
          <div className="flex items-start gap-2.5">
            <Skeleton variant="rect" width={18} height={18} className="mt-0.5 rounded-sm" />
            <Skeleton variant="text" width="55%" height={18} />
          </div>
          <div className="flex items-start gap-2.5">
            <Skeleton variant="rect" width={18} height={18} className="mt-0.5 rounded-sm" />
            <Skeleton variant="text" width="50%" height={18} />
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-auto flex items-center justify-between pt-4 order-3 border-t border-sidebar-border/50">
          <Skeleton variant="rect" width={100} height={28} className="rounded-lg" />
          <Skeleton variant="text" width={60} height={24} />
        </div>
      </div>
    </div>
  );
};

export const OrganizerCardSkeleton: React.FC = () => (
  <div className="w-[300px] sm:w-[360px] shrink-0 snap-center bg-surface border border-sidebar-border rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
    <Skeleton variant="circle" width={80} height={80} className="mb-6 border-2 border-background" />
    <Skeleton variant="text" width="70%" height={24} className="mb-3 rounded-lg" />
    <Skeleton variant="text" width="40%" height={16} className="mb-8" />
    
    <div className="grid grid-cols-2 gap-4 w-full mb-8">
      <Skeleton variant="rect" height={54} className="rounded-xl" />
      <Skeleton variant="rect" height={54} className="rounded-xl" />
    </div>
    
    <Skeleton variant="rect" width="100%" height={48} className="rounded-xl" />
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="bg-background min-h-screen">
    {/* Cover Header */}
    <Skeleton variant="rect" width="100%" height={320} className="!rounded-none" />
    
    <div className="max-w-6xl mx-auto px-6 -mt-16">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <Skeleton variant="circle" width={160} height={160} className="border-4 border-background shadow-2xl shrink-0" />
        
        <div className="flex-1 space-y-6 pt-16 md:pt-20">
          <Skeleton variant="text" width="60%" height={56} className="rounded-xl" />
          <Skeleton variant="text" width="40%" height={24} />
          
          <div className="flex gap-4 mt-8">
            <Skeleton variant="rect" width={160} height={48} className="rounded-full" />
            <Skeleton variant="rect" width={160} height={48} className="rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-20">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
        <div className="space-y-8">
          <Skeleton variant="rect" width="100%" height={240} className="rounded-2xl" />
          <Skeleton variant="rect" width="100%" height={120} className="rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
);

export const EventDetailsSkeleton: React.FC = () => (
  <div className="bg-background min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <Skeleton variant="rect" width="100%" height={520} className="rounded-3xl shadow-lg" />
          <Skeleton variant="text" width="90%" height={64} className="rounded-xl" />
          <div className="flex gap-8">
            <Skeleton variant="text" width="40%" height={28} />
            <Skeleton variant="text" width="30%" height={28} />
          </div>
          <Skeleton variant="rect" width="100%" height={400} className="rounded-3xl" />
        </div>
        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-10">
          <Skeleton variant="rect" width="100%" height={440} className="rounded-3xl shadow-2xl" />
          <Skeleton variant="rect" width="100%" height={180} className="rounded-3xl shadow-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const PortalCardSkeleton: React.FC = () => (
  <div className="p-5 rounded-2xl border border-sidebar-border bg-surface flex items-center gap-4 shadow-sm">
    <Skeleton variant="rect" width={48} height={48} className="rounded-xl shrink-0" />
    <div className="flex-1 space-y-2.5">
      <Skeleton variant="text" width="40%" height={14} />
      <Skeleton variant="text" width="70%" height={24} className="rounded-md" />
      <Skeleton variant="text" width="85%" height={10} />
    </div>
  </div>
);

export const PortalSkeleton: React.FC = () => (
  <div className="space-y-12 max-w-7xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
    {/* Hero Section Skeleton */}
    <div className="rounded-3xl p-10 md:p-14 bg-primary-10 border-2 border-primary-20 shadow-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 relative z-10">
        <div className="max-w-2xl flex-1 space-y-8">
          <Skeleton variant="rect" width={56} height={56} className="rounded-2xl bg-white/30 dark:bg-white/10" />
          <Skeleton variant="text" width="80%" height={48} className="bg-white/30 dark:bg-white/10 rounded-xl" />
          <Skeleton variant="text" width="95%" height={24} className="bg-white/30 dark:bg-white/10" />
        </div>
        <div className="flex gap-12 shrink-0">
          <div className="text-center space-y-4">
            <Skeleton variant="text" width={64} height={56} className="bg-white/30 dark:bg-white/10 mx-auto rounded-lg" />
            <Skeleton variant="text" width={48} height={14} className="bg-white/30 dark:bg-white/10 mx-auto" />
          </div>
          <div className="text-center space-y-4">
            <Skeleton variant="text" width={64} height={56} className="bg-white/30 dark:bg-white/10 mx-auto rounded-lg" />
            <Skeleton variant="text" width={48} height={14} className="bg-white/30 dark:bg-white/10 mx-auto" />
          </div>
        </div>
      </div>
      {/* Decorative shimmer overlay */}
      <div className="absolute inset-0 bg-primary mix-blend-overlay opacity-20 pointer-events-none" />
    </div>

    {/* Stat Widgets Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Skeleton variant="rect" width="100%" height={180} className="rounded-2xl shadow-sm" />
      <Skeleton variant="rect" width="100%" height={180} className="rounded-2xl shadow-sm" />
      <Skeleton variant="rect" width="100%" height={180} className="rounded-2xl shadow-sm" />
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border-2 border-sidebar-border bg-surface p-8 space-y-8 shadow-sm">
          <Skeleton variant="rect" width={64} height={64} className="rounded-2xl" />
          <Skeleton variant="text" width="85%" height={36} className="rounded-xl" />
          <Skeleton variant="text" width="100%" height={80} className="rounded-lg" />
          <div className="pt-4 border-t border-sidebar-border/50">
            <Skeleton variant="text" width="45%" height={18} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PromotedEventSkeleton: React.FC = () => (
  <div className="w-full rounded-2xl overflow-hidden border border-sidebar-border bg-surface shadow-2xl animate-in fade-in duration-1000">
    <div className="relative h-[420px] sm:h-[400px] lg:h-[500px] overflow-hidden bg-background">
      <Skeleton className="w-full h-full !rounded-none" />
      
      {/* Overlay Panel Placeholder */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center p-6 sm:p-16">
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        
        <div className="relative z-30 max-w-xl space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton variant="circle" width={40} height={40} className="opacity-30 bg-white" />
            <Skeleton variant="text" width={160} height={14} className="opacity-30 bg-white" />
          </div>
          
          <Skeleton variant="text" width="90%" height={64} className="opacity-40 bg-white rounded-2xl" />
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
               <Skeleton variant="rect" width={32} height={32} className="opacity-20 bg-white rounded-lg" />
               <Skeleton variant="text" width="40%" height={20} className="opacity-20 bg-white" />
            </div>
            <div className="flex items-center gap-4">
               <Skeleton variant="rect" width={32} height={32} className="opacity-20 bg-white rounded-lg" />
               <Skeleton variant="text" width="55%" height={20} className="opacity-20 bg-white" />
            </div>
            <div className="flex items-center gap-4">
               <Skeleton variant="rect" width={32} height={32} className="opacity-20 bg-white rounded-lg" />
               <Skeleton variant="text" width="65%" height={20} className="opacity-20 bg-white" />
            </div>
          </div>
          
          <div className="pt-10">
            <Skeleton variant="rect" width={180} height={54} className="rounded-full opacity-30 bg-white border-2 border-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const DestinationSliderSkeleton: React.FC = () => (
  <div className="py-24 space-y-16 overflow-hidden mx-0 px-0 animate-in fade-in duration-700">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 flex-1">
        <Skeleton variant="rect" width={160} height={28} className="rounded-full opacity-20" />
        <Skeleton variant="text" width="50%" height={48} className="opacity-20 rounded-xl" />
        <Skeleton variant="text" width="35%" height={24} className="opacity-20" />
      </div>
    </div>
    <div className="flex gap-10 overflow-hidden px-4 sm:px-10">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-none w-[320px] sm:w-[400px] h-[460px] sm:h-[520px] rounded-3xl overflow-hidden bg-surface border border-sidebar-border shadow-lg">
          <Skeleton className="w-full h-full !rounded-none opacity-20" />
        </div>
      ))}
    </div>
  </div>
);


