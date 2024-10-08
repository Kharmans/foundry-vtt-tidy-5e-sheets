<script lang="ts">
  import { type Actor5e, type OnItemToggledFn } from 'src/types/types';
  import ItemSummary from '../ItemSummary.svelte';
  import { warn } from 'src/utils/logging';
  import { createEventDispatcher, getContext, onMount } from 'svelte';
  import type {
    ItemCardStore,
    ExpandedItemData,
    ExpandedItemIdToLocationsMap,
    ActiveEffect5e,
    ActiveEffectContext,
  } from 'src/types/types';
  import type { Writable } from 'svelte/store';
  import type {
    Item5e,
    ItemCardContentComponent,
    ItemChatData,
  } from 'src/types/item.types';
  import { settingStore } from 'src/settings/settings';
  import { CONSTANTS } from 'src/constants';
  import { TidyHooks } from 'src/foundry/TidyHooks';
  import ExpandableContainer from 'src/components/expandable/ExpandableContainer.svelte';

  export let item: Item5e | null = null;
  export let effect: ActiveEffect5e | ActiveEffectContext | null = null;
  export let favoriteId: string | null = null;
  export let contextMenu: { type: string; uuid: string } | null = null;
  export let cssClass: string = '';
  export let itemCardContentTemplate: ItemCardContentComponent | null = null;
  export let hidden: boolean = false;
  export let getDragData: (() => any) | null = null;

  $: draggable = item ?? effect;

  const emptyChatData: ItemChatData = {
    description: { value: '' },
    properties: [],
    unidentified: { description: '' },
  };

  const expandedItemData = getContext<ExpandedItemData>(
    CONSTANTS.SVELTE_CONTEXT.EXPANDED_ITEM_DATA,
  );
  const context = getContext<Writable<unknown>>(
    CONSTANTS.SVELTE_CONTEXT.CONTEXT,
  );
  const expandedItems = getContext<ExpandedItemIdToLocationsMap>(
    CONSTANTS.SVELTE_CONTEXT.EXPANDED_ITEMS,
  );
  const onItemToggled = getContext<OnItemToggledFn>(
    CONSTANTS.SVELTE_CONTEXT.ON_ITEM_TOGGLED,
  );
  const dispatcher = createEventDispatcher<{ mousedown: MouseEvent }>();
  const location = getContext<string>(CONSTANTS.SVELTE_CONTEXT.LOCATION);

  let card: Writable<ItemCardStore> | undefined = getContext<
    Writable<ItemCardStore>
  >(CONSTANTS.SVELTE_CONTEXT.CARD);
  let showSummary = false;
  let chatData: ItemChatData | undefined;

  async function toggleSummary(actor: Actor5e) {
    if (!item) {
      warn('Unable to show summary. No item was provided.');
      showSummary = false;
      return;
    }

    chatData ??= await item.getChatData({ secrets: actor.isOwner });
    showSummary = !showSummary;
    onItemToggled?.(item.id, showSummary, location);
  }

  async function onMouseEnter(event: Event) {
    TidyHooks.tidy5eSheetsItemHoverOn(event, item);

    if (!item?.getChatData || !$settingStore.itemCardsForAllItems) {
      return;
    }

    card?.update((card) => {
      card.item = item;
      card.itemCardContentTemplate = itemCardContentTemplate;
      return card;
    });
  }

  async function onMouseLeave(event: Event) {
    TidyHooks.tidy5eSheetsItemHoverOff(event, item);

    card?.update((card) => {
      card.item = null;
      card.itemCardContentTemplate = null;
      return card;
    });
  }

  function handleDragStart(event: DragEvent) {
    if (!draggable) {
      return;
    }

    // Don't show cards while dragging
    onMouseLeave(event);

    card?.update((card) => {
      return card;
    });

    const dragData = getDragData?.() ?? draggable.toDragData?.();
    if (dragData) {
      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    }
  }

  function restoreItemSummaryIfExpanded() {
    if (!item) {
      return;
    }

    const isExpandedAtThisLocation = expandedItems?.get(item.id)?.has(location);

    if (isExpandedAtThisLocation) {
      chatData = expandedItemData.get(item.id);
      showSummary = true;
    }
  }

  onMount(() => {
    let first = true;

    const subscription = context?.subscribe(async (c: any) => {
      if (first) {
        first = false;
        restoreItemSummaryIfExpanded();
        return;
      }

      if (item && showSummary) {
        chatData = await item.getChatData({ secrets: item.actor.isOwner });
      } else if (item && !showSummary && chatData) {
        // Reset chat data for non-expanded, hydrated chatData
        // so it rehydrates on next open
        chatData = undefined;
      }
    });

    return subscription;
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="item-table-row-container"
  class:hidden
  aria-hidden={hidden}
  data-context-menu={contextMenu?.type}
  data-context-menu-document-uuid={contextMenu?.uuid}
  data-effect-id={effect?.id}
  data-parent-id={effect?.parentId ?? effect?.parent?.id}
  on:mousedown={(event) => dispatcher('mousedown', event)}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:dragstart={handleDragStart}
  draggable={!!draggable}
  data-item-id={item?.id}
  data-tidy-table-row
  data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ITEM_TABLE_ROW}
  data-tidy-item-type={item?.type ?? 'unknown'}
  data-favorite-id={favoriteId ?? null}
>
  <div class="item-table-row {cssClass ?? ''}">
    <slot {toggleSummary} />
  </div>
  <ExpandableContainer expanded={showSummary}>
    <ItemSummary chatData={chatData ?? emptyChatData} {item} />
  </ExpandableContainer>
</div>

<style lang="scss">
  .item-table-row-container {
    position: relative;
    border-radius: 0.3125rem;
    margin: 0 0 0.125rem 0.5rem;
    background: var(--t5e-faintest-color);

    &:global(.context) {
      box-shadow: 0 0 0.1875rem 0.0625rem var(--t5e-primary-accent-color) inset;
    }

    .item-table-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      border-radius: 0.3125rem;

      // TODO: Eliminate the CSS class injection; set the background color CSS variable via an inline style with a color taken from a function, rather than using the classes. Put the variable assignment outside of the item table row so that scripters can set the CSS variable on the row itself.
      --t5e-item-table-row-background: transparent;
      &.prepared {
        --t5e-item-table-row-background: var(--t5e-prepared-background);
      }

      &.always-prepared {
        --t5e-item-table-row-background: var(--t5e-alwaysprepared-background);
      }

      &.pact {
        --t5e-item-table-row-background: var(--t5e-pact-background);
      }

      &.at-will {
        --t5e-item-table-row-background: var(--t5e-atwill-background);
      }

      &.ritual-only {
        --t5e-item-table-row-background: var(--t5e-ritual-only-background);
      }

      &.innate {
        --t5e-item-table-row-background: var(--t5e-innate-background);
      }

      &.equipped {
        --t5e-item-table-row-background: var(--t5e-equipped-background);
      }

      &.magic-item {
        box-shadow: 0 0 0 0.0625rem var(--t5e-magic-accent-color) inset;
      }

      & {
        background: linear-gradient(
          to right,
          var(--t5e-item-table-row-background),
          transparent 120%
        );
      }
    }
  }
</style>
