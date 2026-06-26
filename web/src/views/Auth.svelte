<script>
  import { createEventDispatcher } from 'svelte';
  import { api } from '../lib/api.js';
  import { setCurrentUser } from '../lib/stores.js';
  import { toast } from '../lib/toast.js';
  import { press } from '../lib/actions/press.js';

  export let mode = 'login';

  const dispatch = createEventDispatcher();

  let email = '';
  let password = '';
  let name = '';
  let program = '';
  let error = '';
  let busy = false;

  function switchTo(next) {
    mode = next;
    error = '';
    password = '';
  }

  async function submit() {
    error = '';
    busy = true;
    try {
      if (mode === 'login') {
        const user = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setCurrentUser(user);
        toast.success(`Welcome back, ${user.name}.`);
        dispatch('authed', user);
      } else {
        await api('/users', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, program }),
        });
        toast.success('Account created. Please log in.');
        switchTo('login');
      }
    } catch (e) {
      error =
        e.message === 'invalid credentials'
          ? 'Invalid email or password.'
          : e.message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="auth">
  <p class="eyebrow">{mode === 'login' ? 'Secure access' : 'Join SkillLoop'}</p>
  <h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
  <p class="lede">
    {mode === 'login'
      ? 'Sign in to see your matches, loops, and conversations.'
      : 'Tell us your name and what you study to get started.'}
  </p>

  <form on:submit|preventDefault={submit}>
    {#if mode === 'signup'}
      <label class="field">
        <span>Full name</span>
        <input bind:value={name} placeholder="Jane Doe" required />
      </label>
    {/if}

    <label class="field">
      <span>Email</span>
      <input type="email" bind:value={email} placeholder="you@university.edu" required />
    </label>

    <label class="field">
      <span>Password</span>
      <input type="password" bind:value={password} placeholder="••••••••" required />
    </label>

    {#if mode === 'signup'}
      <label class="field">
        <span>Program <em>(optional)</em></span>
        <input bind:value={program} placeholder="e.g. BSAI" />
      </label>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <button class="submit" type="submit" use:press disabled={busy}>
      {#if busy}
        {mode === 'login' ? 'Signing in…' : 'Creating…'}
      {:else}
        {mode === 'login' ? 'Log in' : 'Create account'}
      {/if}
    </button>
  </form>

  <p class="switch">
    {#if mode === 'login'}
      Don't have an account?
      <button type="button" on:click={() => switchTo('signup')}>Create one</button>
    {:else}
      Already have an account?
      <button type="button" on:click={() => switchTo('login')}>Log in</button>
    {/if}
  </p>
</div>

<style>
  .auth {
    text-align: left;
  }
  .eyebrow {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-fg);
    margin: 0 0 var(--space-2);
  }
  h2 {
    font-size: var(--text-xl);
    font-weight: var(--fw-semibold);
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-2);
  }
  .lede {
    font-size: var(--text-base);
    color: var(--text-2);
    margin: 0 0 var(--space-6);
    line-height: 1.5;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .field span {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .field em {
    font-style: normal;
    color: var(--text-3);
  }
  input {
    height: 42px;
    padding: 0 var(--space-3);
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: var(--radius-md);
    color: var(--text-1);
    font-size: var(--text-base);
    transition: border-color var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease);
  }
  input::placeholder {
    color: var(--text-3);
  }
  input:hover {
    border-color: #3a3f47;
  }
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: var(--ring);
  }
  .error {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--danger);
    background: var(--danger-soft);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
  }
  .submit {
    height: 42px;
    margin-top: var(--space-1);
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-md);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease);
  }
  .submit:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .submit:disabled {
    opacity: 0.7;
    cursor: default;
  }
  .submit:focus-visible {
    outline: none;
    box-shadow: var(--ring);
  }
  .switch {
    margin: var(--space-5) 0 0;
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .switch button {
    background: none;
    border: none;
    color: var(--accent-fg);
    font-size: var(--text-sm);
    padding: 0;
  }
  .switch button:hover {
    text-decoration: underline;
  }
</style>
