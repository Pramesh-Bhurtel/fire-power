# Fire-Ninja

A modern, high‑performance web application that showcases dynamic visual effects and interactive gameplay. This repository contains the source code, assets, and documentation needed to run, develop, and contribute to the project.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Fire‑Ninja** is a lightweight JavaScript/HTML5 game that demonstrates smooth animations, particle effects, and responsive controls. It is built with vanilla JavaScript and CSS, making it easy to understand and extend.

---

## Features

- **Dynamic particle system** with customizable fire effects.
- **Responsive controls** for keyboard and touch devices.
- **Modular architecture** – core game logic, rendering, and UI are separated for easy maintenance.
- **Responsive design** – works on desktop and mobile browsers.
- **Open‑source** – contributions are welcome!

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pramesh-bhurtel/Fire-Ninja.git
   cd Fire-Ninja
   ```
2. **Open the project**
   Simply open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari). No additional dependencies or build steps are required.

> **Note**: If you prefer a local development server, you can run:
> ```bash
> npx -y http-server ./
> ```
> and navigate to `http://localhost:8080`.

---

## Usage

- Open `index.html` in your browser.
- Use the **arrow keys** (or WASD) to move the ninja.
- Press **Space** to trigger the fire attack.
- Touch controls are automatically enabled on mobile devices.

For advanced configuration, see the **Configuration** section below.

---

## Configuration

The game can be customized via the `js/config.js` file (create this file if it does not exist). Example settings:

```javascript
window.GameConfig = {
  fireColor: "#ff4500",
  particleCount: 150,
  ninjaSpeed: 5,
  // Add more custom settings here
};
```

Modify these values and reload the page to see changes instantly.

---

## Contributing

Contributions are highly encouraged! Follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug‑fix:
   ```bash
   git checkout -b feature/awesome-feature
   ```
3. Make your changes and ensure the project still runs.
4. Commit your work with clear messages.
5. Open a Pull Request describing the changes.

Please adhere to the existing code style and include comments where appropriate.

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## Contact

For questions or suggestions, feel free to open an issue or contact the maintainer at `contact@prameshbhurtel.com.np`.
