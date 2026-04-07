import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target area is around line 2120
old_block = """      <footer className="bg-[#0F172A] text-white py-12 px-4 lg:px-10 border-t border-white/10 relative overflow-hidden" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1px_1.8fr] gap-6 lg:gap-10">"""

new_block = """      <footer className="bg-[#0F172A] text-white py-12 px-4 lg:px-10 border-t border-white/10 relative overflow-hidden" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#38BDF2]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        {/* Logo Watermark */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.03] pointer-events-none overflow-hidden select-none">
          <img src="/lgo-footer.png" className="w-[600px] h-auto object-contain grayscale" alt="" />
        </div>

        <div className="max-w-full mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1px_1.8fr] gap-6 lg:gap-10">"""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed.")
else:
    # Try CRLF
    old_block_crlf = old_block.replace('\n', '\r\n')
    if old_block_crlf in content:
        new_block_crlf = new_block.replace('\n', '\r\n')
        new_content = content.replace(old_block_crlf, new_block_crlf)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed CRLF.")
    else:
        print("Target not found.")
