# Goal
- Develop a Web App that is compatible with PWA (Progressive Web App)
- MUST run in iOS as well as on a Desktop browser
- App is a notetaking app, similar to Obsidian
- App MUST be local-first with CRDT (Conflict free Replicated Data Type), with auto multi-device sync
- App MUST have E2EE with a 12 word seed (BIP-39). Sharing this seed allows user to share the notes to sync in other devices
- App should not need to create a user/login. When a new database is created, a new 12 word see is generated
- If user wants to reload their database on a new device, they should input the 12 word seed
- IMPORTANT: good and smooth integration with mobile devices (iOS specially) MUST be a priority

# Software Stack
- Develop in Next.JS
- Use Serwist (https://github.com/serwist/serwist) for the engine for PWA
- Front-end: ShadCN ( https://ui.shadcn.com/docs )
- Back-end: database to be used: Jazz.tools with E2EE using a 12 word mneomonic seed (BIP39)
- For the text editor: TipTap Editor Open source (https://github.com/ueberdosis/tiptap) basic with the Markdown rendering
- For managing the note tree folder: React Arborist (https://github.com/brimdata/react-arborist). MUST support drag-and-drop on iOS for PWA and MUST have smooth integration with ShadCN

# UI/UX
- App should be Dark-mode by default
- App should allow user to create multiple folders to organize the notes. Notes can be moved in and out of folders by drag-and-drop
- Notes can have multiple different "flavours":
    - Regular note with Markdown rendering in Real-Time (using TipTap editor)
    - Calculator-note. Allow to create notes of items like: food: 25 <new line> bus: 4, etc.. and the total should be calculated in real-time (similar to Soulver: https://soulver.app/)
    - More implementations to come so it MUST be easy to add new "flavours" of notes in the future
- User should be able to tag each note and on the sidebar with the tree-view of the notes, user should be able to filter notes based on the tags
- User should be able to 'pin' a note so it always show at the top of the current folder (either inside a folder or at the root)
- Sidbar with tree-view should be collapsible
- User should be able to share the 12 word seed via QRCode to another device, which will use its camera. Sharing the 12 word seed means the same database of notes will be editable on this new device. Sync between devices should be seamless and real-time