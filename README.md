![Angular](https://img.shields.io/badge/Angular-17-red)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![License](https://img.shields.io/badge/license-MIT-blue)


🚀 Chat Application

A modern real-time business chat application built with Angular and Firebase, supporting scalable messaging, mentions, reactions, and channel collaboration.

---

🏗️ Tech Stack

Technology| Purpose
Angular (Standalone Components)| Frontend framework
Firebase Authentication| User authentication (Email + Google)
Firestore| Real-time database
AngularFire| Firebase SDK integration
RxJS| Reactive programming
SCSS| Styling & responsive design

---

✨ Features

💬 Real-Time Channels

- Create and manage channels
- Join / leave channels
- Add or remove members
- Edit channel name & description
- Membership validation before sending messages

---

👤 Direct Messages (Whispers)

- Private 1-to-1 chats
- Automatic partner chat ID generation
- Profile overlay integration

---

🧵 Threads

- Reply to messages in dedicated threads
- Auto-create thread collections
- Nested Firestore storage

---

😊 Reactions System

- Emoji reaction picker
- Add / remove reactions
- Optimistic UI updates
- Firestore synchronization

---

🏷 Mentions

- "@username" mentions
- "#channel" mentions
- Live suggestion dropdown
- Cursor-aware insertion
- Mention parsing service

---

🔐 Authentication

- Email & password login
- Google popup login
- Avatar setup for new users
- Guest login support
- Session storage handling

---

🎛 Chat Overlay Architecture

UI overlays are separated into dedicated services:

- "ChatOverlayService" → Overlay + modal state
- "ChatControllerService" → Message + reaction logic

This keeps components clean and maintainable.

---

🧠 Architecture Overview

ChatComponent
 ├── ChatControllerService   (messages, editing, reactions)
 ├── ChatOverlayService      (overlay UI state)
 ├── ChatService             (Firestore communication)
 ├── MentionService          (mention parsing)
 └── ActionService           (emoji + editing helpers)

Architecture principles:

- Service-driven logic separation
- Reactive chat switching (RxJS)
- Scoped providers per feature
- Optimistic UI updates

---

📂 Firestore Structure

channels/
  {channelId}
    name
    description
    creator
    users[]

    messages/
      {messageId}
        text
        uid
        timestamp
        reactions{}

        thread/
          {threadMessageId}

whispers/
  {combinedUserId}
    messages/

---

🛡 Validation & Security

- Channel membership verification
- Duplicate channel name prevention
- Trimmed & normalized channel names
- Controlled reaction toggling
- Mention input sanitation

---

🖥 Responsive Design

- Desktop-first layout
- Mobile channel drawer
- Adaptive overlays
- Max-width content container
- Breakpoint-based UI switching

---

⚙️ Installation

git clone
cd chat-app
npm install
ng serve

Open:

http://localhost:4200

---

🔑 Firebase Setup

1. Create a Firebase project

2. Enable:
   
   - Authentication (Email + Google)
   - Firestore Database

3. Add your config to:

src/environments/environment.ts

Example:

export const environment = {
  firebase: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  }
};

---

🚀 Future Improvements

- User roles (Admin / Member)
- Typing indicators
- Read receipts
- File uploads
- Drag & drop attachments
- Push notifications
- Firestore security rules hardening

---

👨‍💻 Author

Built with focus on:

- Clean Angular architecture
- Scalable real-time features
- Service-based separation
- Maintainable UI state

---

📜 License

This project is licensed under the MIT License.