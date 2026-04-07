import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the rogue watermark the tool just inserted
target_rogue = """        <div className="absolute bottom-8 left-10 opacity-10 pointer-events-none">
          <img src="/lgo-footer.png" className="h-32 w-auto" alt="StartupLab Watermark" />
        </div>"""

correct_watermark = """        {/* Logo Watermark */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
          <img src="/lgo-footer.png" className="w-[800px] h-auto object-contain" alt="" />
        </div>"""

new_content = content
if target_rogue in content:
    new_content = content.replace(target_rogue, correct_watermark)
    print("Watermark corrected.")
else:
    # Try CRLF
    target_rogue_crlf = target_rogue.replace('\n', '\r\n')
    if target_rogue_crlf in content:
        correct_watermark_crlf = correct_watermark.replace('\n', '\r\n')
        new_content = content.replace(target_rogue_crlf, correct_watermark_crlf)
        print("Watermark corrected CRLF.")
    else:
        print("Rogue target not found.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
