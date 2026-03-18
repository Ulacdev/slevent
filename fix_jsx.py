import os
path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\views\User\UserEvents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line numbers are 1-indexed in view_file but 0-indexed in python
# 1317: lines[1316]
# 1318: lines[1317]
# 1319: lines[1318]

if "isPreviewMode && (" in lines[1316] and lines[1317].strip() == "" and "<button" in lines[1318]:
    lines[1316] = lines[1316].replace("(!isPreviewMode && (", "(!isPreviewMode && (") # No change, but placeholder
    lines.pop(1317)
    # After popping 1317 (old 1318), the next line index is 1317.
    lines[1317] = lines[1317].replace("<button", "    <button")
    
    # 1327: lines[1326] (but after pop it's 1325?)
    # Lines before pop: 1300...1317, 1318, 1319...1327
    # Lines after pop: 1300...1317, 1318 (old 1319)...1326 (old 1327)
    lines[1325] = lines[1325].replace(")}", ")}</div>")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
