<script lang="ts">
  import TextInput from 'src/components/inputs/TextInput.svelte';
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { settingStore } from 'src/settings/settings';
  import type { ContainerSheetContext, Item5e } from 'src/types/item.types';
  import type { Actor5e } from 'src/types/types';
  import type { ActorSheetContext } from 'src/types/types';
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';

  export let document: Actor5e | Item5e;

  let context = getContext<Readable<ActorSheetContext | ContainerSheetContext>>(
    CONSTANTS.SVELTE_CONTEXT.CONTEXT,
  );

  $: currencies = Object.entries(document.system.currency).map((e) => ({
    key: e[0],
    value: e[1] as any,
  }));

  function confirmConvertCurrency() {
    new dnd5e.applications.CurrencyManager(document).render(true);
  }

  function abbreviateCurrency(currencyKey: string) {
    return CONFIG.DND5E.currencies[currencyKey]?.abbreviation ?? currencyKey;
  }

  const localize = FoundryAdapter.localize;
</script>

<div class="inventory-currency">
  <ol class="currency">
    {#each currencies as currency}
      <li
        class="currency-item {currency.key}"
        title={$context.config.currencies[currency.key]?.label}
      >
        <TextInput
          {document}
          field="system.currency.{currency.key}"
          id="{$context.appId}-system.currency.{currency.key}"
          value={currency.value}
          allowDeltaChanges={true}
          selectOnFocus={true}
          disabled={!$context.editable || $context.lockMoneyChanges}
        />
        <label
          for="{$context.appId}-system.currency.{currency.key}"
          class="denomination {currency.key}"
          data-denom={currency.key}>{abbreviateCurrency(currency.key)}</label
        >
      </li>
    {/each}
    <li class="currency-item convert">
      <button
        type="button"
        class="currency-convert"
        title={localize('DND5E.CurrencyManager.Title')}
        on:click|stopPropagation|preventDefault={() => confirmConvertCurrency()}
        disabled={!$context.editable}
        tabindex={$settingStore.useAccessibleKeyboardSupport ? 0 : -1}
      >
        <i class="fas fa-coins" />
      </button>
    </li>
  </ol>
</div>

<style lang="scss">
  .inventory-currency {
    --currency-line-height: 1.875rem;

    .currency {
      display: flex;
      align-items: center;
      list-style: none;
      gap: 0.5rem;
      margin: 0.25rem 0;
      padding: 0;

      .currency-item {
        display: flex;
        align-items: center;
        background: var(--t5e-faint-color);
        border-radius: 0.3125rem;
        line-height: var(--currency-line-height);
        padding-right: 0.5rem;

        :global(input) {
          text-align: right;
          flex: 1;
          padding-left: 0.5rem;
        }

        label {
          margin-left: 0.25rem;
          flex: 0 0 auto;
        }

        &.convert {
          padding: 0;
          flex: 0 0 0.0625rem;
          text-align: center;
          white-space: nowrap;
        }

        .currency-convert {
          line-height: var(--currency-line-height);
          border: none;
          background: var(--t5e-faintest-color);
          color: var(--t5e-secondary-color);
          border-radius: 0.3125rem;
          padding: 0 0.375rem;

          &:hover {
            background: var(--t5e-light-color);
          }
        }

        .denomination {
          text-transform: uppercase;
        }
      }
    }
  }
</style>
