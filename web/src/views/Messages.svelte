<script>
  import { data } from '../lib/data.js';
  import { currentUser } from '../lib/stores.js';
  import { toast } from '../lib/toast.js';
  import {
    selectedFriendshipId,
    messages,
    typingName,
    openChat,
    sendMessage,
    sendTyping,
  } from '../lib/chat.js';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { tick } from 'svelte';

  let draft = '';
  let threadEl;

  $: d = $data;
  $: me = $currentUser;
  $: friends = [...d.friends].sort(
    (a, b) =>
      (Number(b.unread_count) > 0) - (Number(a.unread_count) > 0) ||
      new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0),
  );
  $: selected = d.friends.find((f) => f.id === $selectedFriendshipId) || null;
  $: friendReadAt = selected?.friend_last_read_at ? new Date(selected.friend_last_read_at) : null;
  $: lastMineIdx = (() => {
    let idx = -1;
    $messages.forEach((m, i) => {
      if (m.sender_id === me?.id) idx = i;
    });
    return idx;
  })();
  $: jitsiUrl = selected ? `https://meet.jit.si/skillloop-chat-${selected.id}` : '#';

  // autoscroll on new messages / typing
  $: if ($messages || $typingName) scrollDown();
  async function scrollDown() {
    await tick();
    if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
  }

  function linkify(body) {
    const esc = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return esc.replace(
      /(https?:\/\/[^\s]+)/g,
      (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`,
    );
  }

  async function pick(id) {
    try {
      await openChat(id);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function send() {
    const text = draft;
    draft = '';
    try {
      await sendMessage(text);
    } catch (e) {
      toast.error(e.message);
    }
  }
</script>

<div class="messages">
  <aside class="list">
    <header><h2>Chats</h2></header>
    {#if !friends.length}
      <div class="empty"><p>No conversations yet.</p><small>Connect with someone or schedule a session to start chatting.</small></div>
    {:else}
      {#each friends as f (f.id)}
        <button
          class="convo"
          class:active={f.id === $selectedFriendshipId}
          class:unread={Number(f.unread_count) > 0}
          on:click={() => pick(f.id)}
        >
          <div class="avatar">{(f.friend_name || '?').slice(0, 1)}</div>
          <div class="convo-body">
            <div class="convo-top">
              <strong>{f.friend_name}</strong>
              {#if Number(f.unread_count) > 0}<span class="unread-dot">{f.unread_count}</span>{/if}
            </div>
            <span class="preview">{f.last_message || 'No messages yet'}</span>
          </div>
        </button>
      {/each}
    {/if}
  </aside>

  <section class="thread-wrap">
    {#if !selected}
      <div class="empty center">
        <span aria-hidden="true">✶</span>
        <p>Select a conversation</p>
        <small>Pick a chat on the left to start messaging.</small>
      </div>
    {:else}
      <header class="thread-head">
        <div>
          <strong>{selected.friend_name}</strong>
          <span>{selected.friend_program || 'Student'}</span>
        </div>
        <a class="join" href={jitsiUrl} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 10 4-2v8l-4-2"/><rect x="3" y="6" width="13" height="12" rx="2"/></svg>
          Join video call
        </a>
      </header>

      <div class="thread" bind:this={threadEl}>
        {#if !$messages.length}
          <div class="empty center"><p>No messages yet.</p><small>Say hello, or type <code>/schedule &lt;skill&gt;</code>.</small></div>
        {/if}
        {#each $messages as m, i (m.id)}
          {@const mine = m.sender_id === me?.id}
          <div
            class="bubble {mine ? 'mine' : 'theirs'}"
            in:fly={{ y: 8, duration: 280, easing: backOut }}
          >
            {#if !mine}<span class="who">{m.sender_name}</span>{/if}
            <span class="body">{@html linkify(m.body)}</span>
            <span class="time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {#if mine && i === lastMineIdx}
              <span class="receipt">{friendReadAt && new Date(m.created_at) <= friendReadAt ? 'Seen' : 'Sent'}</span>
            {/if}
          </div>
        {/each}

        {#if $typingName}
          <div class="bubble theirs typing" in:fly={{ y: 6, duration: 200 }}>
            <span class="dots"><i></i><i></i><i></i></span>
            <span class="who-typing">{$typingName} is typing</span>
          </div>
        {/if}
      </div>

      <form class="composer" on:submit|preventDefault={send}>
        <input
          bind:value={draft}
          on:input={sendTyping}
          placeholder="Write a message — or /schedule <skill>"
          maxlength="1000"
          autocomplete="off"
        />
        <button type="submit" disabled={!draft.trim()}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    {/if}
  </section>
</div>

<style>
  .messages {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: var(--space-4);
    height: 70vh;
    min-height: 460px;
  }
  .list,
  .thread-wrap {
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .list header,
  .thread-head {
    padding: var(--space-4) var(--space-5);
    border-bottom: 0.5px solid var(--border);
  }
  .list h2 {
    font-size: var(--text-lg);
    font-weight: var(--fw-semibold);
    margin: 0;
  }
  .list {
    overflow-y: auto;
  }
  .convo {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-bottom: 0.5px solid var(--border);
    padding: var(--space-3) var(--space-4);
    transition: background var(--dur-1) var(--ease);
  }
  .convo:hover {
    background: var(--surface-2);
  }
  .convo.active {
    background: var(--surface-3);
  }
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent-fg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--fw-medium);
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .convo-body {
    min-width: 0;
    flex: 1;
  }
  .convo-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .convo-top strong {
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
  }
  .convo.unread .convo-top strong {
    color: var(--text-1);
  }
  .preview {
    display: block;
    font-size: var(--text-sm);
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .convo.unread .preview {
    color: var(--text-2);
  }
  .unread-dot {
    background: var(--accent);
    color: #fff;
    font-size: var(--text-xs);
    min-width: 18px;
    height: 18px;
    border-radius: var(--radius-full);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }
  .thread-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .thread-head strong {
    display: block;
    font-size: var(--text-md);
    font-weight: var(--fw-medium);
  }
  .thread-head span {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .join {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--accent);
    color: #fff;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    padding: 0.5rem 0.9rem;
    border-radius: var(--radius-md);
    transition: background var(--dur-1) var(--ease);
  }
  .join:hover {
    background: var(--accent-hover);
  }
  .thread {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .bubble {
    max-width: 76%;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--text-base);
    line-height: 1.45;
  }
  .bubble.theirs {
    align-self: flex-start;
    background: var(--surface-2);
    border: 0.5px solid var(--border);
    border-bottom-left-radius: var(--radius-xs);
  }
  .bubble.mine {
    align-self: flex-end;
    background: var(--accent);
    color: #fff;
    border-bottom-right-radius: var(--radius-xs);
  }
  .who {
    font-size: var(--text-xs);
    color: var(--text-3);
    font-weight: var(--fw-medium);
  }
  .body :global(a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .time {
    font-size: 0.65rem;
    opacity: 0.65;
    align-self: flex-end;
  }
  .receipt {
    font-size: 0.65rem;
    opacity: 0.8;
    align-self: flex-end;
  }
  .bubble.typing {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-2);
    font-size: var(--text-sm);
  }
  .dots {
    display: inline-flex;
    gap: 3px;
  }
  .dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-2);
    animation: bounce 1.2s infinite ease-in-out;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes bounce {
    0%, 80%, 100% {
      transform: translateY(0);
      opacity: 0.5;
    }
    40% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }
  .composer {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-top: 0.5px solid var(--border);
  }
  .composer input {
    flex: 1;
    height: 42px;
    padding: 0 var(--space-3);
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: var(--radius-md);
    color: var(--text-1);
    font-size: var(--text-base);
    transition: border-color var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease);
  }
  .composer input::placeholder {
    color: var(--text-3);
  }
  .composer input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: var(--ring);
  }
  .composer button {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    transition: background var(--dur-1) var(--ease), opacity var(--dur-1) var(--ease);
  }
  .composer button:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .composer button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .empty {
    padding: var(--space-6) var(--space-4);
    color: var(--text-2);
  }
  .empty.center {
    margin: auto;
    text-align: center;
  }
  .empty span {
    font-size: var(--text-xl);
    color: var(--text-3);
    display: block;
    margin-bottom: var(--space-2);
  }
  .empty p {
    margin: 0 0 var(--space-1);
    color: var(--text-1);
  }
  .empty small {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .empty code {
    font-family: var(--font-mono);
    background: var(--surface-3);
    padding: 0.05rem 0.3rem;
    border-radius: var(--radius-xs);
  }
  @media (max-width: 720px) {
    .messages {
      grid-template-columns: 1fr;
      height: auto;
    }
    .list {
      max-height: 240px;
    }
    .thread-wrap {
      min-height: 420px;
    }
  }
</style>
