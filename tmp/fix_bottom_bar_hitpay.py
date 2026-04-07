import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken Bottom Bar (around line 2225)
target_broken = """          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">

          </div>"""

restored_bottom_bar = """          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-[10px] font-bold text-gray-400">
              © 2026 <span className="font-black text-white">StartupLab</span> Business Center
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Secure Payments by</span>
              <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="HitPay" className="h-3.5 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
            </div>
          </div>"""

new_content = content
if target_broken in content:
    new_content = content.replace(target_broken, restored_bottom_bar)
    print("Bottom bar fixed with HitPay.")
else:
    # Try CRLF
    target_broken_crlf = target_broken.replace('\n', '\r\n')
    if target_broken_crlf in content:
        restored_bottom_bar_crlf = restored_bottom_bar.replace('\n', '\r\n')
        new_content = content.replace(target_broken_crlf, restored_bottom_bar_crlf)
        print("Bottom bar fixed CRLF.")
    else:
        print("Target not found.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
