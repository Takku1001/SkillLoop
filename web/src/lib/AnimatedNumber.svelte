<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value = 0;
  const n = tweened(0, { duration: 650, easing: cubicOut });
  $: n.set(value || 0);
</script>

<span class="mono">{Math.round($n)}</span>
