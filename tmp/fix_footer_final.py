import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken JSX Branding block (around line 2130)
# Currently it looks like:
# {/* Left Section: Branding & Newsletter */}
# 
#               <h3 className="mt-3 text-lg font-black text-white">Build. Connect. Launch.</h3>

target_broken = """            {/* Left Section: Branding & Newsletter */}

              <h3 className="mt-3 text-lg font-black text-white">Build. Connect. Launch.</h3>"""

restored_branding = """            {/* Left Section: Branding & Newsletter */}
            <div className="flex flex-col items-start text-left">
              <img src="/lgo-footer.png" className="h-16 w-auto mb-1" alt="StartupLab" />
              <h3 className="mt-3 text-lg font-black text-white">Build. Connect. Launch.</h3>"""

# Watermark (around line 2125)
# Use lgo.webp maybe? Or the Supabase SVG?
# Let's try the Supabase SVG as "exact logo" from the top.
watermark_src_supabase = "https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"

new_content = content
if target_broken in content:
    new_content = content.replace(target_broken, restored_branding)
    print("Branding restored.")
else:
    # Try with CRLF
    target_broken_crlf = target_broken.replace('\n', '\r\n')
    if target_broken_crlf in content:
        restored_branding_crlf = restored_branding.replace('\n', '\r\n')
        new_content = content.replace(target_broken_crlf, restored_branding_crlf)
        print("Branding restored CRLF.")
    else:
        print("Branding target not found.")

# Ensure watermark uses the SVG if they want "exact" from top
# Actually I'll use lgo-clean.png as a test if that one looks "exact".
# No, I'll stick to the SVG as it's the official branding component source.

target_watermark_footer_png = 'src="/lgo-footer.png" className="w-[600px]'
replacement_watermark_svg = f'src="{watermark_src_supabase}" className="w-[600px]'

if target_watermark_footer_png in new_content:
    new_content = new_content.replace(target_watermark_footer_png, replacement_watermark_svg)
    print("Watermark updated to SVG.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
