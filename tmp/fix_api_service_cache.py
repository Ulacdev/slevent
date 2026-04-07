import os
import re

path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\services\apiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace direct fetch calls with apiService._fetch and add no-cache where appropriate
# We look for pattern: fetch(`${API_BASE}/...`, {
# and replace with: apiService._fetch(`${API_BASE}/...`, {

def replace_fetch(match):
    full_match = match.group(0)
    url = match.group(1)
    
    # If it's a GET request (no method specified or method: 'GET')
    # and not already using no-store, add it.
    if 'method:' not in full_match or "'GET'" in full_match or '"GET"' in full_match:
        if 'cache:' not in full_match:
            # We need to insert cache: 'no-store' into the options object
            if '{' in full_match:
                return full_match.replace('fetch(', 'apiService._fetch(').replace('{', "{ cache: 'no-store', ")
            else:
                # fetch(url) -> apiService._fetch(url, { cache: 'no-store' })
                return f"apiService._fetch({url}, {{ cache: 'no-store' }})"
    
    return full_match.replace('fetch(', 'apiService._fetch(')

# Regex for fetch(something, { ... }) or fetch(something)
new_content = re.sub(r'fetch\((`\$\{API_BASE\}[^`\)]+`|"[^"]+"|\'[^\']+\')(?:,\s*(\{.*?\text.*?\}|\{.*?\}))?\)', replace_fetch, content, flags=re.DOTALL)

# Handle cases where the second arg exists but doesn't have cache: 'no-store'
# This is tricky with regex because of nested braces.
# Let's do a simpler approach for the most common ones.

# Fix getUserEvents
getUserEvents_target = """  getUserEvents: async (search = ''): Promise<Event[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/api/user/events${searchParam}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });"""

getUserEvents_fix = """  getUserEvents: async (search = ''): Promise<Event[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiService._fetch(`${API_BASE}/api/user/events${searchParam}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });"""

if getUserEvents_target in new_content:
    new_content = new_content.replace(getUserEvents_target, getUserEvents_fix)

# Fix getAdminEvents
getAdminEvents_target = """  getAdminEvents: async (search = ''): Promise<Event[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/api/admin/events${searchParam}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });"""

getAdminEvents_fix = """  getAdminEvents: async (search = ''): Promise<Event[]> => {
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiService._fetch(`${API_BASE}/api/admin/events${searchParam}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });"""

if getAdminEvents_target in new_content:
    new_content = new_content.replace(getAdminEvents_target, getAdminEvents_fix)

# Fix updateProfile (POST/PATCH should also use _fetch)
updateProfile_target = """  updateProfile: async (payload: { name: string; imageUrl?: string }) => {
    const res = await apiService._fetch(`${API_BASE}/api/user/profile`, {"""

# If it's already using _fetch, good.

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("apiService.ts updated to use _fetch and cache: 'no-store' for critical GETs.")
