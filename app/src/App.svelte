<script lang="ts">
  import { onMount, tick } from 'svelte';

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/chat';

  interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
  }

  interface Session {
    id: string;
    created_at: string;
    first_message: string | null;
  }

  let sessions: Session[] = [];
  let messages: Message[] = [];
  let inputText = '';
  let loading = false;
  let activeSessionId: string | null = localStorage.getItem('sessionId') || null;
  let errorMessage = '';
  let sidebarOpen = false;
  let isStartingNewChat = false; // true when user clicks "New Chat" but no session ID yet

  let chatContainer: HTMLElement;

  // Auto‑scroll
  $: if (messages.length) {
    tick().then(() => {
      chatContainer?.scrollTo(0, chatContainer.scrollHeight);
    });
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (res.ok) sessions = await res.json();
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  }

  async function loadSessionHistory(sessionId: string) {
    try {
      const res = await fetch(`${API_BASE}/history/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        messages = data.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
        }));
      }
    } catch (e) {
      console.error('Failed to load session history', e);
      messages = [];
    }
  }

  async function selectSession(sessionId: string) {
    if (sessionId === activeSessionId) {
      sidebarOpen = false;
      return;
    }
    activeSessionId = sessionId;
    isStartingNewChat = false;
    localStorage.setItem('sessionId', sessionId);
    await loadSessionHistory(sessionId);
    errorMessage = '';
    sidebarOpen = false;
  }

  async function startNewChat() {
    activeSessionId = null;
    isStartingNewChat = true;
    localStorage.removeItem('sessionId');
    messages = [];
    errorMessage = '';
    inputText = '';
    sidebarOpen = false;
    await fetchSessions();
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || loading) return;

    messages = [...messages, { id: Date.now().toString(), sender: 'user', text }];
    inputText = '';
    loading = true;
    errorMessage = '';

    try {
      const res = await fetch(`${API_BASE}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();

      // If this was a new session, set it as active
      if (!activeSessionId) {
        activeSessionId = data.sessionId;
        isStartingNewChat = false;
        localStorage.setItem('sessionId', activeSessionId);
        await fetchSessions();
      }

      messages = [...messages, {
        id: Date.now().toString() + '-ai',
        sender: 'ai',
        text: data.reply,
      }];
    } catch (err) {
      errorMessage = 'Failed to get reply. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  onMount(() => {
    fetchSessions();
    if (activeSessionId) {
      loadSessionHistory(activeSessionId);
    } else {
      // No saved session – show the "select or start" prompt
      isStartingNewChat = true;
    }
  });
</script>

<main>
  <!-- Overlay for mobile sidebar -->
  {#if sidebarOpen}
    <div class="overlay" on:click={() => sidebarOpen = false}></div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <h2>Chats</h2>
    <button class="new-chat-btn" on:click={startNewChat}>+ New Chat</button>

    <ul class="session-list">
      {#each sessions as session (session.id)}
        <li
          class="session-item"
          class:active={session.id === activeSessionId}
          on:click={() => selectSession(session.id)}
        >
          <span class="session-preview">
            {session.first_message || 'Empty conversation'}
          </span>
        </li>
      {/each}
    </ul>
  </aside>

  <!-- Chat area -->
  <div class="chat-wrapper">
    <!-- Header always visible -->
    <header>
      <button class="hamburger" on:click={() => sidebarOpen = !sidebarOpen}>
        ☰
      </button>
      <h1>Support</h1>
      <button on:click={startNewChat}>New Chat</button>
    </header>

    {#if !activeSessionId && !isStartingNewChat}
      <!-- No active session and not starting a new one – show prompt -->
      <div class="empty-chat">
        <p>Select a chat from the sidebar or tap "New Chat" to start a conversation.</p>
      </div>
    {:else}
      <!-- Messages and input area (visible when session exists OR new chat started) -->
      <div class="chat-messages" bind:this={chatContainer}>
        {#if messages.length === 0}
          <p class="empty-state">Start the conversation – our AI agent is here to help.</p>
        {/if}

        {#each messages as msg (msg.id)}
          <div class="message {msg.sender}">
            <div class="bubble">{msg.text}</div>
          </div>
        {/each}

        {#if loading}
          <div class="message ai">
            <div class="bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        {/if}

        {#if errorMessage}
          <div class="error">{errorMessage}</div>
        {/if}
      </div>

      <div class="input-area">
        <input
          type="text"
          bind:value={inputText}
          on:keydown={handleKeydown}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button on:click={sendMessage} disabled={loading || !inputText.trim()}>
          Send
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5;
  }

  main {
    display: flex;
    height: 100vh;
    height: 100dvh; /* dynamic viewport height for mobile browsers */
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.05);
    position: relative;
    overflow: hidden;
  }

  /* Overlay for mobile sidebar */
  .overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    z-index: 9;
  }

  /* Sidebar */
  .sidebar {
    width: 280px;
    background: #f7f8fa;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    overflow-y: auto;
    transition: transform 0.25s ease;
    z-index: 10;
  }

  .sidebar h2 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
    color: #333;
  }

  .new-chat-btn {
    width: 100%;
    padding: 0.6rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: background 0.2s;
  }

  .new-chat-btn:hover {
    background: #3a7bc8;
  }

  .session-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
  }

  .session-item {
    padding: 0.8rem;
    border-radius: 8px;
    cursor: pointer;
    color: #444;
    font-size: 0.9rem;
    margin-bottom: 2px;
    transition: background 0.2s;
    word-break: break-word;
  }

  .session-item:hover {
    background: #e9ecef;
  }

  .session-item.active {
    background: #dde4f0;
    color: #1a1a1a;
    font-weight: 500;
  }

  .session-preview {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Chat wrapper */
  .chat-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    min-width: 0; /* allow flex shrink */
  }

  .empty-chat {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    padding: 1rem;
    text-align: center;
  }

  header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #4a90d9;
    color: white;
    gap: 0.75rem;
  }

  header h1 {
    margin: 0;
    font-size: 1.25rem;
    flex: 1;
  }

  .hamburger {
    display: none; /* hidden on desktop */
    background: transparent;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 0.25rem;
    line-height: 1;
  }

  header button:not(.hamburger) {
    background: transparent;
    border: 1px solid white;
    color: white;
    padding: 0.3rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-state {
    text-align: center;
    color: #888;
    margin-top: 2rem;
  }

  .message {
    display: flex;
    max-width: 80%;
  }

  .user {
    align-self: flex-end;
  }

  .ai {
    align-self: flex-start;
  }

  .bubble {
    padding: 0.75rem 1rem;
    border-radius: 18px;
    line-height: 1.4;
  }

  .user .bubble {
    background: #4a90d9;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .ai .bubble {
    background: #e9e9eb;
    color: #333;
    border-bottom-left-radius: 4px;
  }

  .typing span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #999;
    margin: 0 2px;
    animation: typing 1.4s infinite both;
  }

  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-8px); }
  }

  .error {
    color: red;
    text-align: center;
    font-size: 0.9rem;
  }

  .input-area {
    display: flex;
    padding: 0.75rem;
    border-top: 1px solid #ddd;
    background: #fafafa;
  }

  input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 20px;
    outline: none;
  }

  input:disabled {
    background: #eee;
  }

  button {
    margin-left: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
  }

  button:disabled {
    background: #aaa;
    cursor: not-allowed;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      transform: translateX(-100%);
      width: 280px;
      z-index: 20;
      box-shadow: 2px 0 10px rgba(0,0,0,0.1);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .overlay {
      display: block;
    }

    .hamburger {
      display: inline-block;
    }
  }
</style>