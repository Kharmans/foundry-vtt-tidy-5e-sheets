<script lang="ts">
  import { TidyFlags } from 'src/api';
  import Checkbox from 'src/components/inputs/Checkbox.svelte';
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type {
    PortraitCharmRadiusClass,
    VehicleSheetContext,
  } from 'src/types/types';
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';

  let context = getContext<Readable<VehicleSheetContext>>(
    CONSTANTS.SVELTE_CONTEXT.CONTEXT,
  );

  export let motion: boolean;
  export let cssClass: string = '';
  export let radiusClass: PortraitCharmRadiusClass;
  export let animate: boolean = true;

  const localize = FoundryAdapter.localize;
</script>

<div
  class="motion {cssClass}"
  class:is-in-motion={motion}
  title={localize(
    motion ? 'TIDY5E.VehicleInMotion' : 'TIDY5E.VehicleMotionless',
  )}
>
  <Checkbox
    checkboxCssClass="motion-toggle"
    labelCssClass="{motion ? 'motion' : ''} {radiusClass}"
    document={$context.actor}
    field={TidyFlags.motion.prop}
    checked={motion}
    disabled={!$context.editable}
  >
    <i class="motion-icon fas fa-sailboat" class:animate />
  </Checkbox>
</div>

<style lang="scss">
  .motion {
    position: absolute;
    right: 0;
    top: 0;
    width: 2.125rem;
    height: 2.125rem;

    &.only-show-on-hover {
      :global(label) {
        visibility: hidden;
      }

      &:hover :global(label) {
        visibility: visible;
      }
    }

    :global(input.motion-toggle) {
      display: none;
    }

    :global(label) {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.25rem;
      color: var(--t5e-icon-font-color);
      cursor: pointer;
      box-shadow: 0 0 0.625rem var(--t5e-icon-shadow-color) inset;
      border: 0.0625rem solid var(--t5e-icon-outline-color);
      background: var(--t5e-icon-background);
    }

    :global(label i) {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      text-align: center;
      line-height: 2.125rem;
    }

    :global(label:hover) {
      color: var(--t5e-vehicle-motion-hover-color);
      text-shadow: 0 0 0.3125rem
        var(--t5e-vehicle-motion-text-shadow-hover-color);
    }
  }

  .is-in-motion {
    :global(label) {
      color: var(--t5e-activated-profile-toggle-color);
      text-shadow: 0 0 0.625rem var(--t5e-vehicle-in-motion-text-shadow-color);
      background: var(--t5e-vehicle-in-motion-background);
    }

    :global(label i.animate) {
      color: var(--t5e-activated-profile-toggle-color);
      animation: boat 5s linear infinite;
    }
  }

  @keyframes boat {
    0% {
      transform: rotate(0);
    }
    25% {
      transform: rotate(-3deg) translate(0.0625rem, 0);
    }
    50% {
      transform: rotate(3deg) translate(0.0625rem, 0);
    }
    100% {
      transform: rotate(0);
    }
  }
</style>
