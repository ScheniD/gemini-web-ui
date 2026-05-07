# Gemini CLI Web Interface

A beautiful, dark-themed, web-based UI for the official Google Gemini CLI. 
This project wraps the local Gemini CLI in an Express server and streams the responses directly to a sleek browser interface using Server-Sent Events (SSE). 

## Features
- **Real-time Streaming**: Enjoy the exact same streaming speed as the terminal.
- **Web LLM Interface**: A minimalistic, dark UI that looks and feels like top-tier commercial AI chatbots.
- **Tool Execution Visualization**: See the model "thinking" and using tools with subtle spinners and checkmarks.
- **Session Management**: Automatically saves chat history. View and resume past sessions easily from the sidebar.
- **Advanced Code Blocks**: Full syntax highlighting (via highlight.js) with easy "Copy" buttons.
- **Drag & Drop**: Drag text files directly into the chat to seamlessly attach their contents to your prompt.
- **Stop Generation**: Easily abort active generations when the model goes off-track.

## Prerequisites
- Node.js (v18+)
- The official `gemini` CLI installed and authenticated on your machine.

## Installation & Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/ScheniD/gemini-web-ui.git
   cd gemini-web-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Architecture
This project uses a simple Node.js/Express backend that spawns the `gemini` process in the background using `--output-format stream-json`. It acts as a bridge, piping the `stdout` JSON chunks to the frontend as standard SSE `data:` lines. The frontend uses vanilla JS and `marked.js` to render the responses instantly.
