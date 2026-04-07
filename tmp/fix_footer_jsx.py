import os

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The target line was (approx line 2170):
# <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
# We want:
# <div className="flex flex-col">
#   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

target = '            {/* Right Section: Multi-column Links */}\n            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">'
replacement = '            {/* Right Section: Multi-column Links */}\n            <div className="flex flex-col">\n              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">'

if target in content:
    new_content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed.")
else:
    # Try with CRLF if needed
    target_crlf = target.replace('\n', '\r\n')
    if target_crlf in content:
        replacement_crlf = replacement.replace('\n', '\r\n')
        new_content = content.replace(target_crlf, replacement_crlf)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed CRIM.")
    else:
        print("Target not found.")
