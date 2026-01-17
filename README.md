# notetaking
Note-taking web app PWA

# Software stack to be used
- Web app MUST be PWA (Progressive Web App) compatible so it can be installed on a device as standalone application on iOS
- Cloudflare will be used to host and service the web app
- For cloud sync between devices MUST use Evolu: https://www.evolu.dev/docs
- MUST use Next.js as framework
- MUST use ShadCN for UI

# User experience
1. When the app is first launched, it will verify if a Evolu database is already present: if Yes, use it as database; if No, open a dialog with the option to either create a new database or have the user enter the Evolu 'mnemonics' used to load a previously created database
2. If user decides to create a new Evolu database, prompt user with the newly created 'mnemonics' that can be used to load the same database on a different device. Warn user that this is the only way to recover the database so the 'mnemonics' should be backed up
3. A toolbar should be always visible at the top, containing:
  - Settings button (with a gear icon). This will open a settings window
4. - Dark-mode toggle
5. Settings window will allow user to copy currnet Evolu database 'mnemonics' and allow user to change to new 'mnemonics' (to read a different Evolu database)
6. The main screen of the note-taking app contains the main panel with the editor for writing notes and on the left side is a panel with all the notes created by the user
7. Notes can be created under folders, and folders can contain subfolders
8. Each note can have a selected state of 'Preview' or 'Edit' mode. Preview mode will render Markdown. The state of each note is saved and sync'ed and by default a new note starts in 'Edit' mode
9. Left side panel with the list of notes/folders can have its size adjusted by dragging from the edge. It should be possible to drag all the way to the left until the entire panel is hidden. It can also be hidden entirely by clicking on a button on the top of the panel. Clicking on the same button will toggle between left panel showing or hidden.
10. When a note or a folder is selected (or mouse hover) it will show 2 icons: one for renaming it, another for deleting it. Before deleting the user have to confirm the action through a pop-up window
11. The order of items on the sidebar. Folders will always be first. Items should be sorted alphabetically by the title (but Folders will always be at the top).
12. Notes can be pinned by clicking on a 'Pin' button on the toolbar to the left of the toggle button `Preview/Edit`. When a note is pinned, it will remain at the top of the list on the Sidebar. If more than one note is pinned, they will follow alphabetical order