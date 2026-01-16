# notetaking
Note-taking web app PWA

# Software stack to be used
- Web app MUST be PWA (Progressive Web App) compatible so it can be installed on a device as standalone application on iOS
- Cloudflare will be used to host and service the web app
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
- The main screen of the note-taking app contains the main panel with the editor for writing notes and on the left side is a panel with all the notes created by the user
- Notes can be created under folders, and folders can contain subfolders
- The main panel with the notes can accept Markdown text, which by default will render Markdown automatically
- The note editing panel will always render Markdown, when user clicks on the editing panel it will switch to 'edit' mode automatically. It will go back to rendering Markdown when user clicks on the 'Preview' button (with the 'Eye' icon) or when user clicks outside the editing panel (e.g. user can click on the toolbar, left side panel, header textbox)
- Left side panel with the list of notes/folders can have its size adjusted by dragging from the edge. It can also be hidden entirely by clicking on a button on the top of the panel. Clicking on the same button will toggle between left panel showing or hidden.
- When a note or a folder is selected (or mouse hover) it will show 2 icons: one for renaming it, another for deleting it. Before deleting the user have to confirm the action through a pop-up window