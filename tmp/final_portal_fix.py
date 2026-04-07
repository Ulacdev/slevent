import os

api_path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\services\apiService.ts'
with open(api_path, 'r', encoding='utf-8') as f:
    api_content = f.read()

# Fix the doubled apiService._apiService._fetch
api_content = api_content.replace('apiService._apiService._fetch', 'apiService._fetch')

# Also replace any apiService._fetch with this._fetch (cleaner) OR just make sure it's apiService._fetch correctly
# Actually, since it's a const, apiService._fetch works fine in the methods.
# But let's fix the case where it might have been tripled or something.
import re
api_content = re.sub(r'apiService(?:\.apiService)+', 'apiService', api_content)

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_content)
print("apiService.ts fetch calls corrected.")

# Now FIX OrganizerSettings.tsx which the tool broke
settings_path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\views\User\OrganizerSettings.tsx'
with open(settings_path, 'r', encoding='utf-8') as f:
    settings_content = f.read()

# Restore the deleted loop
target_broken = """      showToast('success', onboardingMode ? 'Organizer profile setup complete.' : 'Organizer profile updated.');

      onSaved?.(saved);"""

restored_logic = """      showToast('success', onboardingMode ? 'Organizer profile setup complete.' : 'Organizer profile updated.');
      if (userId && role && email) {
        setUser({
          userId,
          role,
          email,
          isOnboarded: saved.isOnboarded || onboardingMode || currentOnboarded,
          employerLogoUrl: saved.profileImageUrl,
          employerName: saved.organizerName,
          name: saved.organizerName,
        });
      }
      onSaved?.(saved);"""

if target_broken in settings_content:
    settings_content = settings_content.replace(target_broken, restored_logic)
    print("OrganizerSettings.tsx restored.")
else:
    # Try CRLF
    target_broken_crlf = target_broken.replace('\n', '\r\n')
    if target_broken_crlf in settings_content:
        restored_logic_crlf = restored_logic.replace('\n', '\r\n')
        settings_content = settings_content.replace(target_broken_crlf, restored_logic_crlf)
        print("OrganizerSettings.tsx restored CRLF.")
    else:
        print("Settings target not found.")

with open(settings_path, 'w', encoding='utf-8') as f:
    f.write(settings_content)
