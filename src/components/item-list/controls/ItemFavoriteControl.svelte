<script lang="ts">
  import type { Item5e } from 'src/types/item.types';
  import ItemControl from './ItemControl.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';

  export let item: Item5e;

  $: active = FoundryAdapter.isItemFavorited(item);
  $: title = FoundryAdapter.localize(
    active ? 'TIDY5E.RemoveFavorite' : 'TIDY5E.AddFavorite',
  );
</script>

<ItemControl
  iconCssClass="fas fa-bookmark"
  {active}
  {title}
  onclick={() => FoundryAdapter.toggleFavoriteItem(item)}
/>
