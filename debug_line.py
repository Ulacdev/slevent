path = r'c:\Users\John Carlo\OneDrive\Desktop\startupevent\startuplab-business-ticketing\frontend\views\User\UserEvents.tsx'
with open(path, 'rb') as f:
    for i, line in enumerate(f):
        if i >= 1320 and i <= 1330:
            print(f"{i+1}: {line}")
        if i > 1330:
            break
