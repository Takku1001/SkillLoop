<script>
  // View-by-view rewrite. Built: Landing, Auth, Home/Matching shell.
  // Next: Messages/Chat, Profile, Graph.
  import { onMount } from 'svelte';
  import Landing from './views/Landing.svelte';
  import Auth from './views/Auth.svelte';
  import Shell from './views/Shell.svelte';
  import Modal from './lib/Modal.svelte';
  import Toaster from './lib/Toaster.svelte';
  import { currentUser, setCurrentUser, savedUserId } from './lib/stores.js';
  import { api } from './lib/api.js';

  let authOpen = false;
  let authMode = 'login';

  function openAuth(mode) {
    authMode = mode;
    authOpen = true;
  }

  // Restore a persisted session on load
  onMount(async () => {
    if (!savedUserId) return;
    try {
      const users = await api('/users');
      const user = users.find((u) => u.id === savedUserId);
      if (user) setCurrentUser(user);
    } catch {
      /* offline — stay logged out */
    }
  });
</script>

<main class="shell">
  {#if $currentUser}
    <Shell />
  {:else}
    <Landing on:login={() => openAuth('login')} on:signup={() => openAuth('signup')} />
  {/if}

  <Modal open={authOpen} on:close={() => (authOpen = false)}>
    <Auth mode={authMode} on:authed={() => (authOpen = false)} />
  </Modal>

  <Toaster />
</main>

<style>
  .shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
