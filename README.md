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
  - Dark-mode toggle
4. Settings window will allow user to copy currnet Evolu database 'mnemonics' and allow user to change to new 'mnemonics' (to read a different Evolu database)
5. The main screen of the note-taking app contains the main panel with the editor for writing notes and on the left side is a panel with all the notes created by the user
6. Notes can be created under folders, and folders can contain subfolders
7. Each note can have a selected state of 'Preview' or 'Edit' mode. Preview mode will render Markdown. The state of each note is saved and sync'ed and by default a new note starts in 'Edit' mode
8. Left side panel with the list of notes/folders can have its size adjusted by dragging from the edge. It should be possible to drag all the way to the left until the entire panel is hidden. It can also be hidden entirely by clicking on a button on the top of the panel. Clicking on the same button will toggle between left panel showing or hidden.
9. When a note or a folder is selected (or mouse hover) it will show 2 icons: one for renaming it, another for deleting it. Before deleting the user have to confirm the action through a pop-up window
10. The order of items on the sidebar. Folders will always be first. Items should be sorted alphabetically by the title (but Folders will always be at the top).
11. Notes can be pinned by clicking on a 'Pin' button on the toolbar to the left of the toggle button `Preview/Edit`. When a note is pinned, it will remain at the top of the list on the Sidebar. If more than one note is pinned, they will follow alphabetical order
12. When the app opens, if an Evolu database is already present, it should open the item that was last seen. And the `last seen` item should also be sync'ed between devices.
13. Besides adding a new note, user can also create a new item that is a calculator-notepad (e.g. https://soulver.app/) that allows to write down notes and make calculations for each line, with the total of all in the last line. This new item will show up on the sidebar just like a note would and share the same behavior as a note
14. The notes and calculator-notepad can be drag-and-dropped to move in and out of a folder. Once inside the folder they should always follow alphabetical order
15. User should be able to add tags to each note. On the sidebar there should be a way to filter the notes by the tags through a search box that has autocomplete with a drop-down showing all the possible matches for the search of the tags. In real-time, the notes and calculator-notes should be filtered on the sidebar allowing the user to click on each one
16. In the Settings, user should be able to opt to delete local Evolu database. After user confirm the action through a pop-up warning, all local data should be deleted and app should go back to it's main initial screen
17. There should be a Trash available for the user to restore any recent deletions. User should also be able to permanently delete data from the Trash, which will delete the data from the local storage on the device
18. In the Settings menu, below the button `Copy to Clipboard` for the Recovery Phrase there should be a button to generate a QRCode so another device's camera can read it. IMPORTANT: the QRCode generation should be ONLY local (no data sent to a server) and should NEVER store any of this data locally. For the second device to read the QRCode, there should be a button next to `Restore` (that shows only after user clicked on `Restore from Phrase`) that allows user to use the camera to read the QRCode to populate the Recovery Phrase. The same option should be available when setting up a new database upon starting from fresh (i.e. device with no local database)
19. When creating new items, if there's an item with the same name, the default name should include an index `1`, `2` at the end (e.g. `Untitled Note 1`). If user enters a name of an item that already exists in the same folder, a message should warn the user and wait for it to change. The same goes if user tries to change the name of an existing item. Remember that if there's an item with the same name but in a different folder it's ok. And if user tries to move an item to a different folder, where an item with the same name exists, the name of this item should automatically add an index counter at the end