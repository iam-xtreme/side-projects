
# 📝 Instant Markdown Notes App

A cross-platform desktop note-taking application built using **Electron**, **Vite**, and **Markdown**, with support for **real-time preview**, **local file saving**, and **autosave history**.

---

## 🚀 Features

- 🖊️ Simple note editor with Markdown support and preview
- 🧠 Real-time autosave to `localStorage` with timestamped keys.
- 💾 Save notes to a file on disk (default or custom path)
- 🧩 Preview toggle, save log, and side-by-side layout
- 🖥️ Cross-platform builds for macOS, Linux, and Windows

---

## 🛠️ Tech Stack

- **Frontend**: Vite, Vanilla JS, Markdown (`marked`)
- **Desktop Shell**: Electron
- **Build Tooling**: electron-builder
- **OS Support**: macOS (.dmg), Linux (.AppImage, .deb), Windows (.exe via NSIS)

---

## 📁 Project Structure

```

note-app/
├── src/              # Vite frontend source (index.html, main.js)
├── electron/         # Electron main process scripts
├── dist/             # Built frontend (output of Vite)
├── build/            # Build scripts (macOS/Linux)
├── config.json       # App config file
├── electron-builder.json  # Electron packaging config
└── release/          # Output directory for packaged installers

```

---

## ⚙️ Configuration

Create a `config.json` file at the root to define default settings:

```json
{
  "saveIntervalInSeconds": 60,
  "savePath": "/custom/path/to/save/notes"
}
```

During installation, you can specify a custom save path using the installer (on Windows via NSIS or Linux via `.ini`).

---

## 🧱 Building the Project

### 🔨 Prerequisites

* Node.js v18+
* npm
* For Linux: `dpkg`, `fakeroot` (for `.deb`)
* For macOS: Xcode CLI tools
* Electron builder (already included as a dev dependency)

---

### 🔧 Development (Hot Reload)

```bash
npm install
npm run dev
```

This runs:

* Vite frontend on `http://localhost:3000`
* Electron watching the Vite build

---

### 📦 Build for Production

```bash
npm run build
```

This will:

1. Run `vite build`
2. Package Electron app using `electron-builder`

### 💻 Build for macOS or Linux

```bash
# macOS
./build/macos.sh

# Linux
./build/linux.sh
```

Final installers will be placed in the `release/` directory and zipped automatically.

---

## 📦 Installing the App

After building:

* On macOS: open the `.dmg` file in the `release/` folder
* On Linux: run the `.AppImage` or install the `.deb` package

The app will save notes to your **home directory by default**, unless a custom path is provided during install.

---

## 🧭 Future Scope

* 📂 Support multiple notes and notebooks
* ☁️ Cloud sync with Dropbox/Google Drive
* 🔒 End-to-end encrypted notes
* 🌓 Dark mode toggle
* 🔍 Full-text search across notes
* 🧪 Unit tests and CI for packaging

---

## 🤝 Contributing

We welcome contributions from everyone!

### To contribute:

1. Fork this repo
2. Create a new branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to your fork: `git push origin feature/my-feature`
5. Open a Pull Request

💬 Questions, bugs, or ideas? Feel free to open an [issue](https://github.com/your-username/note-app/issues).

---

## 📄 License

[MIT](./LICENSE)

---

> Built with ❤️ using Electron and Vite.

---

### 🛠 Next Steps for You

- Replace `your-username` in links with your actual GitHub username
- Add a `LICENSE` file (MIT or others)
- Push your full project to GitHub

Let me know if you want a logo, GitHub Actions CI workflow, or GitHub Pages for docs — happy to help!

