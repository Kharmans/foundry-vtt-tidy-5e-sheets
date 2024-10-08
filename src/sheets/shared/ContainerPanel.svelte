<script lang="ts">
  import type {
    ContainerPanelItemContext,
    ItemCardStore,
  } from 'src/types/types';
  import CapacityBar from '../container/CapacityBar.svelte';
  import { CONSTANTS } from 'src/constants';
  import type { Writable } from 'svelte/store';
  import { getContext } from 'svelte';
  import type { Item5e } from 'src/types/item.types';
  import { settingStore } from 'src/settings/settings';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { coalesce } from 'src/utils/formatting';
  import { TidyHooks } from 'src/foundry/TidyHooks';

  export let containerPanelItems: ContainerPanelItemContext[] = [];
  export let searchCriteria: string = '';

  $: visibleContainersIdsSubset = FoundryAdapter.searchItems(
    searchCriteria,
    containerPanelItems.map((c) => c.container),
  );

  let card: Writable<ItemCardStore> | undefined = getContext<
    Writable<ItemCardStore>
  >(CONSTANTS.SVELTE_CONTEXT.CARD);

  async function onMouseEnter(event: Event, item: Item5e) {
    TidyHooks.tidy5eSheetsItemHoverOn(event, item);

    if (!item?.getChatData || !$settingStore.itemCardsForAllItems) {
      return;
    }

    card?.update((card) => {
      card.item = item;
      return card;
    });
  }

  async function onMouseLeave(event: Event, item: Item5e) {
    TidyHooks.tidy5eSheetsItemHoverOff(event, item);

    card?.update((card) => {
      card.item = null;
      card.itemCardContentTemplate = null;
      return card;
    });
  }

  function handleDragStart(event: DragEvent, item: Item5e) {
    // Don't show cards while dragging
    onMouseLeave(event, item);

    card?.update((card) => {
      return card;
    });

    const dragData = item.toDragData();
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }
</script>

<ul class="containers">
  {#each containerPanelItems as { container, ...capacity } (container.id)}
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <li
      draggable="true"
      data-item-id={container.id}
      on:dragstart={(ev) => handleDragStart(ev, container)}
      on:mouseenter={(ev) => onMouseEnter(ev, container)}
      on:mouseleave={(ev) => onMouseLeave(ev, container)}
      class="container"
      title={container.system.identified === false
        ? coalesce(
            container.system.unidentified.name,
            FoundryAdapter.localize('DND5E.Unidentified.Title'),
          )
        : container.name}
      class:hidden={!visibleContainersIdsSubset.has(container.id)}
      aria-hidden={!visibleContainersIdsSubset.has(container.id)}
    >
      <button
        type="button"
        class="container-image-button transparent-button"
        on:click={() => container.sheet.render(true)}
        data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_ITEMS}
        data-context-menu-document-uuid={container.uuid}
        disabled={!FoundryAdapter.userIsGm() && !container.isOwner}
      >
        <div
          class="container-image"
          class:conceal={container.system.identified === false}
          style="background-image: url('{container.img}')"
        >
          <div
            role="presentation"
            aria-hidden="true"
            class="unidentified-glyph"
            class:conceal={container.system.identified === false}
          >
            <i class="fas fa-question" />
          </div>
        </div>
      </button>
      <CapacityBar
        showLabel={false}
        {container}
        {capacity}
        --capacity-bar-height="0.5rem"
        --capacity-bar-container-border-radius="0 0 0.1875rem 0.1875rem"
      />
    </li>
  {/each}
</ul>

<style lang="scss">
  .containers {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(
      auto-fit,
      minmax(var(--t5e-container-panel-item-size), max-content)
    );
    gap: 0.375rem;
    margin-left: 0.1875rem;

    .container {
      position: relative; // 👈 required for correct drag preview
      display: flex;
      flex-direction: column;
      height: 100%;

      &.hidden {
        display: none;
      }
    }

    .container-image-button {
      display: block;
    }

    .container-image {
      aspect-ratio: 1;
      border: 0.0625rem solid var(--t5e-separator-color);
      border-radius: 0.1875rem 0.1875rem 0 0;
      background-color: var(--t5e-light-color);
      background-size: cover;
      background-position: 50% 0;
      transition: filter 0.75s;

      &.conceal {
        filter: grayscale(100%);
      }
    }

    .unidentified-glyph {
      font-size: calc(var(--t5e-container-panel-item-size) / 2);
    }
  }
</style>
