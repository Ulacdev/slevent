import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken JSX Watermark block (around line 2125)
target_broken = """        {/* Logo Watermark */}

        <div className="max-w-full mx-auto relative z-10">"""

# New fixed watermark (no translate-x, right-8)
restored_watermark = """        {/* Logo Watermark */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
          <img src="/lgo-footer.png" className="w-[800px] h-auto object-contain" alt="" />
        </div>

        <div className="max-w-full mx-auto relative z-10">"""

new_content = content
if target_broken in content:
    new_content = content.replace(target_broken, restored_watermark)
    print("Watermark restored.")
else:
    # Try with CRLF
    target_broken_crlf = target_broken.replace('\n', '\r\n')
    if target_broken_crlf in content:
        restored_watermark_crlf = restored_watermark.replace('\n', '\r\n')
        new_content = content.replace(target_broken_crlf, restored_watermark_crlf)
        print("Watermark restored CRLF.")
    else:
        print("Watermark target not found.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
