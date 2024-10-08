<script lang="ts">
  import { setContext } from 'svelte';
  import { clickOutside } from '../../events/clickOutside';
  import type {
    ButtonMenuAnchor,
    ButtonMenuContext,
    ButtonMenuPosition,
  } from './button-menu-types';
  import { getPositionStyles } from './button-menu-position';
  import { settingStore } from 'src/settings/settings';
  import { CONSTANTS } from 'src/constants';

  type StatefulIconClass = {
    opened: string | null;
    closed: string | null;
  };

  export let open = false;
  export let buttonText: string = '';
  export let iconClass: string | StatefulIconClass | null = null;
  export let wrapperClass: string | null = null;
  export let listClass: string | null = null;
  export let buttonClass: string | null = null;
  export let openerPadding: string | null = null;
  export let ariaLabel: string | null = null;
  export let title: string | null = null;
  export let gap: string | false = '0.25rem';
  export let position: ButtonMenuPosition = 'bottom';
  export let anchor: ButtonMenuAnchor = 'center';
  export let menuElement: keyof HTMLElementTagNameMap = 'ul';
  export let buttonStyle: 'solid' | 'transparent-inline' | 'transparent-inline-icon' = 'solid';

  let openerEl: HTMLElement;
  let menuStyles: string = '';

  setContext<ButtonMenuContext>(CONSTANTS.SVELTE_CONTEXT.BUTTON_MENU_CONTEXT, {
    close: close,
  });

  function close() {
    open = false;
  }

  function positionMenu(menuEl: HTMLElement) {
    menuStyles = getPositionStyles(openerEl, menuEl, position, anchor, gap);
  }

  let actualIconClass: string | null;
  $: {
    if (iconClass !== null) {
      if (typeof iconClass === 'string') {
        actualIconClass = iconClass;
      } else {
        let potentialClass = open ? iconClass.opened : iconClass.closed;
        potentialClass ??= iconClass.opened ?? iconClass.closed;
        actualIconClass = potentialClass;
      }
    }
  }
</script>

<div class="button-menu-wrapper {wrapperClass ?? ''}">
  <button
    type="button"
    on:click={() => (open = !open)}
    aria-label={ariaLabel}
    bind:this={openerEl}
    {title}
    class="button-menu-opener {buttonClass ?? ''} {buttonStyle}"
    style:padding={openerPadding}
    tabindex={$settingStore.useAccessibleKeyboardSupport ? 0 : -1}
  >
    {#if iconClass}
      <i class={actualIconClass} />
    {/if}
    {buttonText}
  </button>

  {#if open}
    <svelte:element
      this={menuElement}
      class="button-menu-list {listClass ?? ''}"
      use:clickOutside
      on:outsideclick={() => close()}
      style={menuStyles}
      use:positionMenu
    >
      <slot />
    </svelte:element>
  {/if}
</div>
