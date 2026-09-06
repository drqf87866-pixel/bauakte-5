with open('C:/Users/try23/Documents/GitHub/bauakte-5/src/routes/upload-quick.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { getProjectsByUser, getPhasesForProject, createUpload } from '../db/queries';",
    "import { getProjectsForUser as getProjectsByUser, getPhasesForProject, createUpload } from '../db/queries';"
)

with open('C:/Users/try23/Documents/GitHub/bauakte-5/src/routes/upload-quick.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')