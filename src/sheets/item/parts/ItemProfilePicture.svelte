<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Item5e, ItemSheetContext } from 'src/types/item.types';
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';
  import FloatingContextMenu from 'src/components/context-menu/FloatingContextMenu.svelte';
  import type { ContextMenuOption } from 'src/types/types';

  let context = getContext<Readable<ItemSheetContext>>(
    CONSTANTS.SVELTE_CONTEXT.CONTEXT,
  );

  const localize = FoundryAdapter.localize;

  function openItemImagePicker(target: HTMLImageElement, item: Item5e) {
    const rect = target.getBoundingClientRect();
    const current = item.img;
    return FoundryAdapter.browseFilePicker({
      type: 'image',
      current,
      callback: (path: string) => {
        item.update({ img: path });
      },
      top: rect.top + 40,
      left: rect.left + 10,
    });
  }

  function showItemArt(item: Item5e) {
    FoundryAdapter.renderImagePopout(item.img, {
      title: FoundryAdapter.localize('TIDY5E.ItemImageTitle', {
        subject: item.name,
      }),
      shareable: true,
      uuid: item.uuid,
    });
  }

  let itemImageContainer: HTMLElement;
  let contextMenuOptions: ContextMenuOption[] = [];
  $: contextMenuOptions = [
    {
      name: 'TIDY5E.ShowItemArt',
      icon: '<i class="fa-solid fa-image fa-fw"></i>',
      callback: () => showItemArt($context.item),
    },
  ];
</script>

<FloatingContextMenu
  containingElement={itemImageContainer}
  targetSelector="[data-tidy-sheet-part={CONSTANTS.SHEET_PARTS
    .ITEM_IMAGE_CONTAINER}]"
  options={contextMenuOptions}
></FloatingContextMenu>
<div
  class="item-image item-image-show-item-art"
  data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ITEM_IMAGE_CONTAINER}
  bind:this={itemImageContainer}
>
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- TODO: Figure out if there is an accessible way to provide this feature. -->
  <img
    class="profile"
    class:conceal={$context.item.system.identified === false}
    src={$context.item.img}
    alt={$context.item.name}
    title="{localize('TIDY5E.EditSheetImageHint')} / {localize(
      'TIDY5E.SheetImageOptionsHint',
    )}"
    on:click={(event) =>
      openItemImagePicker(event.currentTarget, $context.item)}
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ITEM_IMAGE}
  />
  <div
    role="presentation"
    aria-hidden="true"
    class="unidentified-glyph"
    class:conceal={$context.item.system.identified === false}
  >
    <i class="fas fa-question" />
  </div>
</div>
