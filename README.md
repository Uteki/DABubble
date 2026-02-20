![Angular](https://img.shields.io/badge/Angular-17-red)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![License](https://img.shields.io/badge/license-MIT-blue)


# 🚀 Chat Application - [DABubble](https://dabubble.daniel-tran.com)


#### A modern real-time business chat application built with Angular and Firebase, supporting scalable messaging, mentions, reactions, and channel collaboration.

---

## 🏗️ Tech Stack

| Technology                          | Purpose                                     |
|-------------------------------------|---------------------------------------------|
| **Angular (Standalone Components)** | Frontend framework & component architecture |
| **TypeScript**                      | Strongly-typed application logic            |
| **SCSS**                            | Styling and responsive design               |
| **Firebase Authentication**         | User authentication (Email + Google OAuth)  |
| **Firestore**                       | Real-time NoSQL database                    |

---

## ✨ Features

### 💬 Real-Time Channels

- Create and manage channels
- Join / leave channels
- Add or remove members
- Edit channel name & description
- Membership validation before sending messages

---

### 👤 Direct Messages (Whispers)

- Private 1-to-1 chats
- Automatic partner chat ID generation
- Profile overlay integration

---

### 🧵 Threads

- Reply to messages in dedicated threads
- Auto-create thread collections
- Nested Firestore storage

---

### 😊 Reactions System

- Emoji reaction picker
- Add / remove reactions
- Optimistic UI updates
- Firestore synchronization

---

### 🏷 Mentions

- "@username" mentions
- "#channel" mentions
- Live suggestion dropdown
- Cursor-aware insertion
- Mention parsing service

---

### 🔐 Authentication

- Email & password login
- Google popup login
- Avatar setup for new users
- Guest login support
- Session storage handling

---

## 🎛 Chat Overlay Architecture

UI overlay and interaction state is separated into dedicated, component-scoped services to keep the main component lean and maintainable.

**Overlay & interaction services**

* `ChatOverlayService` → Handles overlay + modal UI state
* `ChatControllerService` → Handles message state, editing, reactions, mentions

This separation ensures:

* Clear responsibility boundaries
* Cleaner ChatComponent code
* Easier scaling of UI features

---

## 🧠 Application Architecture Overview

### Feature Layout

```text
Dashboard
 ├── Chat
 ├── Broadcast
 ├── Message
 ├── Channels
 └── Thread

Shared
 ├── Header
 └── Reactions

Core
 ├── Interfaces
 ├── Types
 └── Base Classes

Auth / Login
 ├── Login
 ├── Register
 ├── Reset Password
 ├── Send Mail
 └── Avatar Setup

Global Services
 ├── ChatService
 ├── AuthService
 ├── UserService
 ├── MentionService
 ├── ActionService
 └── etc.

Scoped Services
 └── (Used only inside ChatComponent)
```

---

## 💬 Chat Component Architecture

`ChatComponent` uses **locally provided services** for feature isolation.

```text
ChatComponent
 ├── ChatControllerService   → Messages, editing, reactions, mentions
 ├── ChatOverlayService      → Overlay + modal state
 ├── ChatService             → Firestore communication
 ├── MentionService          → Mention parsing & filtering
 └── ActionService           → Emoji + editing helpers
```

---

## 🧩 Responsibility Split

### ChatControllerService

Handles:

* Message state
* Sending messages
* Editing messages
* Emoji insertion
* Reaction toggling
* Mention insertion
* Hover states

### ChatOverlayService

Handles:

* Channel overlays
* Member overlays
* Add member dialogs
* Profile overlays
* Mobile overlay states
* Focus handling

---

## 🏗 Architecture Principles

* **Service-driven logic separation**
  Business logic moved out of components

* **Scoped providers per feature**
  Chat services exist only inside ChatComponent

* **Reactive chat switching (RxJS)**
  Live message updates on channel change

* **Optimistic UI updates**
  Reactions & edits update instantly

* **Overlay state isolation**
  UI state separated from data state

---

## 📦 Why Scoped Services?

Only `ChatComponent` uses:

* `ChatControllerService`
* `ChatOverlayService`

Benefits:

* No global state pollution
* Easier debugging
* Independent feature scaling
* Cleaner dependency graph

---

## 🔄 Data Flow Example

```text
User Action
   ↓
ChatComponent
   ↓
ChatControllerService
   ↓
ChatService (Firestore)
   ↓
Realtime Update
   ↓
UI Refresh
```

---

## 📂 Firestore Structure

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

## 🛡 Validation & Security

- Channel membership verification
- Duplicate channel name prevention
- Trimmed & normalized channel names
- Controlled reaction toggling
- Mention input sanitation

---

## 🖥 Responsive Design

- Desktop-first layout
- Mobile channel drawer
- Adaptive overlays
- Max-width content container
- Breakpoint-based UI switching

---

## ⚙️ Installation

git clone `git@github.com:Uteki/DABubble.git`

cd chat-app

npm install

ng serve

Open: http://localhost:4200

---

## 🔑 Firebase Setup

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

## 🚀 Future Improvements

- User roles (Admin / Member)
- Typing indicators
- Idle Track
- Read receipts
- File uploads
- Drag & drop attachments
- Push notifications
- Firestore security rules hardening

---

## 👨‍💻 Author

Built with focus on:

- Clean Angular architecture
- Scalable real-time features
- Service-based separation
- Maintainable UI state

---

## 📜 License

This project is licensed under the MIT License.
