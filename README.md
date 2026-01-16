# notetaking
Note-taking web app PWA

# Software stack to be used
- Web app MUST be PWA (Progressive Web App) compatible so it can be installed on a device as standalone application on iOS
- Cloudflare will be used to host and service the web app
- Cloudflare will also be used for user Authentication
- For cloud sync between devices MUST use Evolu: https://www.evolu.dev/docs
- MUST use Next.js as framework
- MUST use ShadCN for UI

# User experience
- When the app is first launched, it will verify if a Evolu database is already present: if Yes, use it as database; if No, open a dialog with the option to either create a new database or have the user enter the Evolu 'mnemonics' used to load a previously created database
- If user decides to create a new Evolu database, prompt user with the newly created 'mnemonics' that can be used to load the same database on a different device. Warn user that this is the only way to recover the database so the 'mnemonics' should be backed up
- A toolbar should be always visible at the top, containing:
  - Settings button (with a gear icon). This will open a settings window
  - Dark-mode toggle
- Settings window will allow user to copy currnet Evolu database 'mnemonics' and allow user to change to new 'mnemonics' (to read a different Evolu database)