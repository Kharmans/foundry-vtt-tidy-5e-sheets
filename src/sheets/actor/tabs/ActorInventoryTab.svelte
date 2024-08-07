<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { type CharacterSheetContext } from 'src/types/types';
  import type {
    InventorySection,
    ItemLayoutMode,
    NpcSheetContext,
  } from 'src/types/types';
  import InventoryList from '../InventoryList.svelte';
  import InventoryGrid from '../InventoryGrid.svelte';
  import { getContext, setContext } from 'svelte';
  import { writable, type Readable } from 'svelte/store';
  import Currency from 'src/sheets/actor/Currency.svelte';
  import Notice from '../../../components/notice/Notice.svelte';
  import NumberInput from '../../../components/inputs/NumberInput.svelte';
  import EncumbranceBar from 'src/sheets/actor/EncumbranceBar.svelte';
  import TabFooter from 'src/sheets/actor/TabFooter.svelte';
  import { settingStore } from 'src/settings/settings';
  import { CONSTANTS } from 'src/constants';
  import UtilityToolbar from 'src/components/utility-bar/UtilityToolbar.svelte';
  import Search from 'src/components/utility-bar/Search.svelte';
  import UtilityToolbarCommand from 'src/components/utility-bar/UtilityToolbarCommand.svelte';
  import FilterMenu from 'src/components/filter/FilterMenu.svelte';
  import ContainerPanel from 'src/sheets/shared/ContainerPanel.svelte';
  import ExpandableContainer from 'src/components/expandable/ExpandableContainer.svelte';
  import PinnedFilterToggles from 'src/components/filter/PinnedFilterToggles.svelte';
  import { ItemFilterRuntime } from 'src/runtime/item/ItemFilterRuntime';
  import { TidyFlags } from 'src/foundry/TidyFlags';
  import { SheetSections } from 'src/features/sections/SheetSections';
  import { SheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { ItemVisibility } from 'src/features/sections/ItemVisibility';

  export let tabId: string;

  let context = getContext<Readable<CharacterSheetContext | NpcSheetContext>>(
    CONSTANTS.SVELTE_CONTEXT.CONTEXT,
  );

  $: inventory = SheetSections.configureInventory(
    $context.inventory,
    tabId,
    SheetPreferencesService.getByType($context.actor.type),
    TidyFlags.sectionConfig.get($context.actor)?.[tabId],
  );

  let searchCriteria: string = '';

  const itemIdsToShow = writable<Set<string> | undefined>(undefined);
  setContext(CONSTANTS.SVELTE_CONTEXT.ITEM_IDS_TO_SHOW, itemIdsToShow);

  $: {
    $itemIdsToShow = ItemVisibility.getItemsToShowAtDepth({
      criteria: searchCriteria,
      itemContext: $context.itemContext,
      sections: inventory,
      tabId: tabId,
    });
  }

  const localize = FoundryAdapter.localize;

  let layoutMode: ItemLayoutMode;
  $: layoutMode = TidyFlags.inventoryGrid.get($context.actor) ? 'grid' : 'list';

  $: noItems =
    inventory.some((section: InventorySection) => section.items.length > 0) ===
    false;

  $: utilityBarCommands =
    $context.utilities[tabId]?.utilityToolbarCommands ?? [];
</script>

<UtilityToolbar>
  <Search bind:value={searchCriteria} />
  <PinnedFilterToggles
    filterGroupName={tabId}
    filters={ItemFilterRuntime.getPinnedFiltersForTab(
      $context.filterPins,
      $context.filterData,
      tabId,
    )}
  />
  <FilterMenu {tabId} />
  {#each utilityBarCommands as command (command.title)}
    <UtilityToolbarCommand
      title={command.title}
      iconClass={command.iconClass}
      text={command.text}
      visible={command.visible ?? true}
      on:execute={(ev) => command.execute?.(ev.detail)}
    />
  {/each}
</UtilityToolbar>

<div
  class="tidy-inventory-container scroll-container flex-column small-gap"
  data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ITEMS_CONTAINER}
>
  {#if noItems && !$context.unlocked}
    <Notice>{localize('TIDY5E.EmptySection')}</Notice>
  {:else}
    {@const containerPanelExpanded =
      $context.showContainerPanel && !!$context.containerPanelItems.length}
    <ExpandableContainer
      expanded={containerPanelExpanded}
      class="container-panel-wrapper {containerPanelExpanded
        ? 'container-panel-expanded'
        : ''}"
    >
      <ContainerPanel
        containerPanelItems={$context.containerPanelItems}
        {searchCriteria}
      />
    </ExpandableContainer>
    {#each inventory as section (section.key)}
      {@const visibleItemCount = ItemVisibility.countVisibleItems(
        section.items,
        $itemIdsToShow,
      )}
      {#if section.show}
        {#if (searchCriteria.trim() === '' && $context.unlocked) || visibleItemCount > 0}
          {#if layoutMode === 'list'}
            <InventoryList
              primaryColumnName="{localize(section.label)} ({visibleItemCount})"
              {section}
              items={section.items}
            />
          {:else}
            <InventoryGrid items={section.items} {section} />
          {/if}
        {/if}
      {/if}
    {/each}
  {/if}
</div>

<TabFooter mode="vertical">
  <div class="attunement-and-currency">
    <div
      class="attuned-items-counter"
      class:overattuned={$context.actor.system.attributes.attunement.value >
        $context.actor.system.attributes.attunement.max}
      title={localize('DND5E.Attunement')}
    >
      <i class="attunement-icon fas fa-sun" />
      <span
        class="attuned-items-current"
        title={localize('TIDY5E.AttunementItems')}
        >{$context.system.attributes.attunement.value}</span
      >
      /
      {#if $context.editable && FoundryAdapter.userIsGm()}
        <NumberInput
          selectOnFocus={true}
          document={$context.actor}
          field="system.attributes.attunement.max"
          cssClass="attuned-items-max"
          value={$context.system.attributes.attunement.max}
          placeholder="0"
          title={localize('TIDY5E.AttunementMax')}
          disabled={!$context.editable || $context.lockSensitiveFields}
        />
      {:else}
        <span class="attuned-items-max" title={localize('TIDY5E.AttunementMax')}
          >{$context.system.attributes.attunement.max}</span
        >
      {/if}
    </div>
    <Currency document={$context.actor} />
  </div>

  {#if $settingStore.useCharacterEncumbranceBar}
    <EncumbranceBar />
  {/if}
</TabFooter>

<style lang="scss">
  .attunement-and-currency {
    display: flex;
    flex: 0 0 1.875rem;
    gap: 0.5rem;

    .attuned-items-counter {
      display: flex;
      align-items: center;
      margin-left: 0.1875rem;
      padding-left: 0.625rem;
      border-radius: 0.3125rem;
      background: var(--t5e-faint-color);

      .attunement-icon {
        color: var(--t5e-primary-accent-color);
      }

      &.overattuned {
        animation: overflowing-with-arcane-power 2s infinite;
      }

      @keyframes overflowing-with-arcane-power {
        0% {
          box-shadow: 0 0 0 0 var(--t5e-primary-accent-color);
        }
        100% {
          box-shadow: 0 0 0 0.375rem rgba(0, 0, 0, 0);
        }
      }

      span {
        font-size: 1rem;
      }

      i {
        opacity: 0.6;
        font-size: 1.25rem;
        margin-right: 0.3125rem;
        margin-left: 0.0625rem;
      }

      :global(.attuned-items-max) {
        width: 1.5rem;
      }

      :global(input) {
        font-size: 1rem;
        font-family: var(--t5e-body-font-family);
      }
    }
  }

  .tidy-inventory-container
    :global(.container-panel-wrapper:not(.container-panel-expanded)) {
    margin-bottom: -0.5rem;
  }
</style>
