import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { SettingsProvider, settingStore } from 'src/settings/settings';
import type {
  ItemCardStore,
  SheetExpandedItemsCacheable,
  SheetStats,
  SheetTabCacheable,
  ExpandedItemData,
  ExpandedItemIdToLocationsMap,
  VehicleSheetContext,
  Utilities,
  MessageBus,
  MessageBusMessage,
  SearchFilterCacheable,
  VehicleCargoSection,
  VehicleFeatureSection,
  SimpleEditableColumn,
  Actor5e,
} from 'src/types/types';
import { writable } from 'svelte/store';
import VehicleSheet from './vehicle/VehicleSheet.svelte';
import { initTidy5eContextMenu } from 'src/context-menu/tidy5e-context-menu';
import {
  applySheetAttributesToWindow,
  applyTitleToWindow,
  blurUntabbableButtonsOnClick,
  maintainCustomContentInputFocus,
} from 'src/utils/applications';
import type { SvelteComponent } from 'svelte';
import { debug } from 'src/utils/logging';
import { getPercentage } from 'src/utils/numbers';
import type { Item5e, ItemChatData } from 'src/types/item.types';
import { VehicleSheetRuntime } from 'src/runtime/VehicleSheetRuntime';
import {
  actorUsesActionFeature,
  getActorActions,
} from 'src/features/actions/actions';
import { isNil } from 'src/utils/data';
import { CustomContentRenderer } from './CustomContentRenderer';
import { getBaseActorSheet5e } from 'src/utils/class-inheritance';
import { ActorPortraitRuntime } from 'src/runtime/ActorPortraitRuntime';
import { CustomActorTraitsRuntime } from 'src/runtime/actor-traits/CustomActorTraitsRuntime';
import { ItemTableToggleCacheService } from 'src/features/caching/ItemTableToggleCacheService';
import { StoreSubscriptionsService } from 'src/features/store/StoreSubscriptionsService';
import { SheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
import { ItemFilterService } from 'src/features/filtering/ItemFilterService';
import { AsyncMutex } from 'src/utils/mutex';
import { ItemFilterRuntime } from 'src/runtime/item/ItemFilterRuntime';
import { SheetPreferencesRuntime } from 'src/runtime/user-preferences/SheetPreferencesRuntime';

export class Tidy5eVehicleSheet
  extends dnd5e.applications.actor.ActorSheet5eVehicle
  implements
    SheetTabCacheable,
    SheetExpandedItemsCacheable,
    SearchFilterCacheable
{
  context = writable<VehicleSheetContext>();
  stats = writable<SheetStats>({
    lastSubmissionTime: null,
  });
  card = writable<ItemCardStore>();
  currentTabId: string;
  expandedItems: ExpandedItemIdToLocationsMap = new Map<string, Set<string>>();
  expandedItemData: ExpandedItemData = new Map<string, ItemChatData>();
  itemTableTogglesCache: ItemTableToggleCacheService;
  subscriptionsService: StoreSubscriptionsService;
  itemFilterService: ItemFilterService;
  messageBus: MessageBus = writable<MessageBusMessage | undefined>();

  constructor(...args: any[]) {
    super(...args);

    this.subscriptionsService = new StoreSubscriptionsService();

    this.itemTableTogglesCache = new ItemTableToggleCacheService({
      userId: game.user.id,
      documentId: this.actor.id,
    });

    this.itemFilterService = new ItemFilterService({}, this.actor);

    this.currentTabId = SettingsProvider.settings.initialVehicleSheetTab.get();
  }

  get template() {
    return FoundryAdapter.getTemplate('empty-form-template.hbs');
  }

  static get defaultOptions() {
    const { width, height } =
      SheetPreferencesService.getByType(CONSTANTS.SHEET_TYPE_VEHICLE) ?? {};

    return FoundryAdapter.mergeObject(super.defaultOptions, {
      classes: ['tidy5e-sheet', 'sheet', 'actor', CONSTANTS.SHEET_TYPE_VEHICLE],
      width: width ?? 740,
      height: height ?? 810,
      scrollY: ['[data-tidy-track-scroll-y]', '.scroll-container'],
    });
  }

  component: SvelteComponent | undefined;
  activateListeners(html: { get: (index: 0) => HTMLElement }) {
    let first = true;
    this.subscriptionsService.registerSubscriptions(
      this.itemFilterService.filterData$.subscribe(() => {
        if (first) return;
        this.render();
      }),
      settingStore.subscribe(() => {
        if (first) return;
        this.render();
      }),
      this.messageBus.subscribe((m) => {
        debug('Message bus message received', {
          app: this,
          actor: this.actor,
          message: m,
        });
      }),
      SheetPreferencesRuntime.getStore().subscribe(() => {
        if (first) return;
        this.render();
      })
    );
    first = false;

    const node = html.get(0);
    this.card.set({ sheet: node, item: null, itemCardContentTemplate: null });

    this.component = new VehicleSheet({
      target: node,
      context: new Map<any, any>([
        ['context', this.context],
        ['messageBus', this.messageBus],
        ['stats', this.stats],
        ['card', this.card],
        [
          'onFilter',
          this.itemFilterService.onFilter.bind(this.itemFilterService),
        ],
        [
          'onFilterClearAll',
          this.itemFilterService.onFilterClearAll.bind(this.itemFilterService),
        ],
        ['currentTabId', this.currentTabId],
        ['onTabSelected', this.onTabSelected.bind(this)],
        ['onItemToggled', this.onItemToggled.bind(this)],
        ['location', ''],
        ['expandedItems', new Map(this.expandedItems)],
        ['expandedItemData', new Map(this.expandedItemData)],
        [
          'itemTableToggles',
          new Map(this.itemTableTogglesCache.itemTableToggles),
        ],
        [
          'onItemTableToggle',
          this.itemTableTogglesCache.onItemTableToggle.bind(
            this.itemTableTogglesCache
          ),
        ],
      ]),
    });

    initTidy5eContextMenu(this, html);
  }

  async getData(options = {}) {
    const defaultDocumentContext = await super.getData(this.options);

    const unlocked =
      FoundryAdapter.isActorSheetUnlocked(this.actor) &&
      defaultDocumentContext.editable;

    const vehiclePreferences = SheetPreferencesService.getByType(
      this.actor.type
    );

    const actionListSortMode =
      vehiclePreferences.tabs?.[CONSTANTS.TAB_ACTOR_ACTIONS]?.sort ?? 'm';

    const utilities: Utilities = {
      [CONSTANTS.TAB_ACTOR_ACTIONS]: {
        utilityToolbarCommands: [
          {
            title: FoundryAdapter.localize('SIDEBAR.SortModeAlpha'),
            iconClass: 'fa-solid fa-arrow-down-a-z fa-fw',
            execute: async () => {
              await SheetPreferencesService.setDocumentTypeTabPreference(
                this.actor.type,
                CONSTANTS.TAB_ACTOR_ACTIONS,
                'sort',
                'm'
              );
            },
            visible: actionListSortMode === 'a',
          },
          {
            title: FoundryAdapter.localize('TIDY5E.SortMode.ActionListDefault'),
            iconClass: 'fa-solid fa-arrow-down-short-wide fa-fw',
            execute: async () => {
              await SheetPreferencesService.setDocumentTypeTabPreference(
                this.actor.type,
                CONSTANTS.TAB_ACTOR_ACTIONS,
                'sort',
                'a'
              );
            },
            visible: actionListSortMode === 'm',
          },
          {
            title: FoundryAdapter.localize('TIDY5E.Commands.ExpandAll'),
            iconClass: 'fas fa-angles-down',
            execute: () =>
              // TODO: Use app.messageBus
              this.messageBus.set({
                tabId: CONSTANTS.TAB_ACTOR_ACTIONS,
                message: CONSTANTS.MESSAGE_BUS_EXPAND_ALL,
              }),
          },
          {
            title: FoundryAdapter.localize('TIDY5E.Commands.CollapseAll'),
            iconClass: 'fas fa-angles-up',
            execute: () =>
              // TODO: Use app.messageBus
              this.messageBus.set({
                tabId: CONSTANTS.TAB_ACTOR_ACTIONS,
                message: CONSTANTS.MESSAGE_BUS_COLLAPSE_ALL,
              }),
          },
        ],
      },
    };

    const context: VehicleSheetContext = {
      ...defaultDocumentContext,
      actions: getActorActions(this.actor, this.itemFilterService),
      activateEditors: (node) => FoundryAdapter.activateEditors(node, this),
      actorPortraitCommands:
        ActorPortraitRuntime.getEnabledPortraitMenuCommands(this.actor),
      allowEffectsManagement: true,
      appId: this.appId,
      customActorTraits: CustomActorTraitsRuntime.getEnabledTraits(
        defaultDocumentContext
      ),
      customContent: await VehicleSheetRuntime.getContent(
        defaultDocumentContext
      ),
      filterData: this.itemFilterService.getDocumentItemFilterData(),
      filterPins: ItemFilterRuntime.defaultFilterPins[this.actor.type],
      useClassicControls:
        SettingsProvider.settings.useClassicControlsForVehicle.get(),
      editable: defaultDocumentContext.editable,
      healthPercentage: getPercentage(
        this.actor?.system?.attributes?.hp?.value,
        this.actor?.system?.attributes?.hp?.max
      ),
      lockExpChanges: FoundryAdapter.shouldLockExpChanges(),
      lockHpMaxChanges: FoundryAdapter.shouldLockHpMaxChanges(),
      lockItemQuantity: FoundryAdapter.shouldLockItemQuantity(),
      lockLevelSelector: FoundryAdapter.shouldLockLevelSelector(),
      lockMoneyChanges: FoundryAdapter.shouldLockMoneyChanges(),
      lockSensitiveFields:
        (!unlocked && SettingsProvider.settings.useTotalSheetLock.get()) ||
        !defaultDocumentContext.editable,
      owner: this.actor.isOwner,
      showLimitedSheet: FoundryAdapter.showLimitedSheet(this.actor),
      tabs: [],
      unlocked: unlocked,
      useActionsFeature: actorUsesActionFeature(this.actor),
      useRoundedPortraitStyle: [
        CONSTANTS.CIRCULAR_PORTRAIT_OPTION_ALL as string,
        CONSTANTS.CIRCULAR_PORTRAIT_OPTION_NPCVEHICLE as string,
      ].includes(SettingsProvider.settings.useCircularPortraitStyle.get()),
      utilities: utilities,
      viewableWarnings:
        defaultDocumentContext.warnings?.filter(
          (w: any) => !isNil(w.message?.trim(), '')
        ) ?? [],
    };

    let tabs = await VehicleSheetRuntime.getTabs(context);

    const selectedTabs = FoundryAdapter.tryGetFlag<string[]>(
      context.actor,
      'selected-tabs'
    );

    if (selectedTabs?.length) {
      tabs = tabs
        .filter((t) => selectedTabs?.includes(t.id))
        .sort(
          (a, b) => selectedTabs.indexOf(a.id) - selectedTabs.indexOf(b.id)
        );
    } else {
      const defaultTabs =
        SettingsProvider.settings.defaultVehicleSheetTabs.get();
      tabs = tabs
        .filter((t) => defaultTabs?.includes(t.id))
        .sort((a, b) => defaultTabs.indexOf(a.id) - defaultTabs.indexOf(b.id));
    }

    context.tabs = tabs;

    debug('Vehicle Sheet context data', context);

    return context;
  }

  protected _prepareItems(context: VehicleSheetContext) {
    const cargoColumns: SimpleEditableColumn[] = [
      {
        label: game.i18n.localize('DND5E.Quantity'),
        css: 'item-qty',
        property: 'quantity',
        editable: 'Number',
      },
    ];

    const equipmentColumns: SimpleEditableColumn[] = [
      {
        label: game.i18n.localize('DND5E.Quantity'),
        css: 'item-qty',
        property: 'system.quantity',
        editable: 'Number',
      },
      {
        label: game.i18n.localize('DND5E.AC'),
        css: 'item-ac',
        property: 'system.armor.value',
      },
      {
        label: game.i18n.localize('DND5E.HP'),
        css: 'item-hp',
        property: 'system.hp.value',
        maxProperty: 'system.hp.max',
        editable: 'Number',
      },
      {
        label: game.i18n.localize('DND5E.Threshold'),
        css: 'item-threshold',
        property: 'threshold',
      },
    ];

    const features: Record<string, VehicleFeatureSection> = {
      actions: {
        label: game.i18n.localize('DND5E.ActionPl'),
        items: [],
        hasActions: true,
        crewable: true,
        dataset: { type: 'feat', 'activation.type': 'crew' },
        columns: [
          {
            label: game.i18n.localize('DND5E.Cover'),
            css: 'item-cover',
            property: 'cover',
          },
        ],
      },
      equipment: {
        label: game.i18n.localize(CONFIG.Item.typeLabels.equipment),
        items: [],
        crewable: true,
        dataset: { type: 'equipment', 'type.value': 'vehicle' },
        columns: equipmentColumns,
      },
      passive: {
        label: game.i18n.localize('DND5E.Features'),
        items: [],
        dataset: { type: 'feat' },
      },
      reactions: {
        label: game.i18n.localize('DND5E.ReactionPl'),
        items: [],
        dataset: { type: 'feat', 'activation.type': 'reaction' },
      },
      weapons: {
        label: game.i18n.localize(`${CONFIG.Item.typeLabels.weapon}Pl`),
        items: [],
        crewable: true,
        dataset: { type: 'weapon', 'weapon-type': 'siege' },
        columns: equipmentColumns,
      },
    };

    context.items.forEach((item) => {
      const { uses, recharge } = item.system;
      const ctx = (context.itemContext[item.id] ??= {});
      ctx.canToggle = false;
      ctx.hasUses = uses && uses.max > 0;
      ctx.isOnCooldown =
        recharge && !!recharge.value && recharge.charged === false;
      ctx.isDepleted = item.isOnCooldown && uses.per && uses.value > 0;
    });

    const cargo: Record<string, VehicleCargoSection> = {
      crew: {
        label: game.i18n.localize('DND5E.VehicleCrew'),
        items: context.actor.system.cargo.crew,
        css: 'cargo-row crew',
        editableName: true,
        dataset: { type: 'crew' },
        columns: cargoColumns,
      },
      passengers: {
        label: game.i18n.localize('DND5E.VehiclePassengers'),
        items: context.actor.system.cargo.passengers,
        css: 'cargo-row passengers',
        editableName: true,
        dataset: { type: 'passengers' },
        columns: cargoColumns,
      },
      cargo: {
        label: game.i18n.localize('DND5E.VehicleCargo'),
        items: [],
        dataset: { type: 'loot' },
        columns: [
          {
            label: game.i18n.localize('DND5E.Quantity'),
            css: 'item-qty',
            property: 'system.quantity',
            editable: 'Number',
          },
          {
            label: game.i18n.localize('DND5E.Price'),
            css: 'item-price',
            property: 'system.price.value',
            editable: 'Number',
          },
          {
            label: game.i18n.localize('DND5E.Weight'),
            css: 'item-weight',
            property: 'system.weight',
            editable: 'Number',
          },
        ],
      },
    };

    // Classify items owned by the vehicle and compute total cargo weight
    let totalWeight = 0;
    for (const item of context.items) {
      const ctx = (context.itemContext[item.id] ??= {});
      this._prepareCrewedItem(item, ctx);

      // Handle cargo explicitly
      const isCargo = item.flags.dnd5e?.vehicleCargo === true;
      if (isCargo) {
        totalWeight += item.system.totalWeight ?? 0;
        cargo.cargo.items.push(item);
        continue;
      }

      // Handle non-cargo item types
      switch (item.type) {
        case 'weapon':
          features.weapons.items.push(item);
          break;
        case 'equipment':
          features.equipment.items.push(item);
          break;
        case 'feat':
          const act = item.system.activation;
          if (!act.type || act.type === 'none')
            features.passive.items.push(item);
          else if (act.type === 'reaction') features.reactions.items.push(item);
          else features.actions.items.push(item);
          break;
        default:
          totalWeight += item.system.totalWeight ?? 0;
          cargo.cargo.items.push(item);
      }
    }

    // Update the rendering context data
    context.inventoryFilters = false;
    context.features = Object.values(features);
    context.cargo = Object.values(cargo);
    context.encumbrance = this._computeEncumbrance(totalWeight, context);
  }

  /**
   * Prepare items that are mounted to a vehicle and require one or more crew to operate.
   * @param {object} item     Copy of the item data being prepared for display.
   * @param {object} context  Display context for the item.
   * @protected
   */
  _prepareCrewedItem(item: Item5e, context: VehicleItemContext) {
    // Determine crewed status
    const isCrewed = item.system.crewed;
    context.toggleClass = isCrewed ? 'active' : '';
    context.toggleTitle = game.i18n.localize(
      `DND5E.${isCrewed ? 'Crewed' : 'Uncrewed'}`
    );

    // Handle crew actions
    if (item.type === 'feat' && item.system.activation.type === 'crew') {
      context.cover = game.i18n.localize(
        `DND5E.${item.system.cover ? 'CoverTotal' : 'None'}`
      );
      if (item.system.cover === 0.5) context.cover = '½';
      else if (item.system.cover === 0.75) context.cover = '¾';
      else if (item.system.cover === null) context.cover = '—';
    }

    // Prepare vehicle weapons
    if (item.type === 'equipment' || item.type === 'weapon') {
      context.threshold = item.system.hp.dt ? item.system.hp.dt : '—';
    }
  }

  /**
   * Compute the total weight of the vehicle's cargo.
   * @param {number} totalWeight    The cumulative item weight from inventory items
   * @param {object} actorData      The data object for the Actor being rendered
   * @returns {{max: number, value: number, pct: number}}
   * @private
   */
  _computeEncumbrance(totalWeight: number, actorData: Actor5e) {
    // Compute currency weight
    const totalCoins = Object.values(
      // TODO: Use dnd5e types ... one day ...
      actorData.system.currency as Record<string, number>
    ).reduce((acc: number, denom: number) => acc + denom, 0);

    const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
      ? CONFIG.DND5E.encumbrance.currencyPerWeight.metric
      : CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;
    totalWeight += totalCoins / currencyPerWeight;

    // Vehicle weights are an order of magnitude greater.
    totalWeight /= game.settings.get('dnd5e', 'metricWeightUnits')
      ? CONFIG.DND5E.encumbrance.vehicleWeightMultiplier.metric
      : CONFIG.DND5E.encumbrance.vehicleWeightMultiplier.imperial;

    // Compute overall encumbrance
    const max = actorData.system.attributes.capacity.cargo;
    const pct = Math.clamped((totalWeight * 100) / max, 0, 100);
    return { value: totalWeight.toNearest(0.1), max, pct };
  }

  private async setExpandedItemData() {
    this.expandedItemData.clear();
    for (const id of this.expandedItems.keys()) {
      const item = this.actor.items.get(id);
      if (item) {
        this.expandedItemData.set(
          id,
          await item.getChatData({ secrets: this.actor.isOwner })
        );
      }
    }
  }

  private _renderMutex = new AsyncMutex();
  async _render(force?: boolean, options = {}) {
    await this._renderMutex.lock(async () => {
      await this._renderSheet(force, options);
    });
  }

  private async _renderSheet(force?: boolean, options = {}) {
    await this.setExpandedItemData();
    const data = await this.getData();
    this.context.set(data);

    if (force) {
      const { width, height } =
        SheetPreferencesService.getByType(CONSTANTS.SHEET_TYPE_VEHICLE) ?? {};
      this.position = {
        ...this.position,
        width: width ?? this.position.width,
        height: height ?? this.position.height,
      };

      this._saveScrollPositions(this.element);
      this._destroySvelteComponent();
      await super._render(force, options);
      applySheetAttributesToWindow(
        this.actor.documentName,
        this.actor.type,
        SettingsProvider.settings.colorScheme.get(),
        this.element.get(0)
      );
      await this.renderCustomContent({ data, isFullRender: true });
      Hooks.callAll(
        'tidy5e-sheet.renderActorSheet',
        this,
        this.element.get(0),
        data,
        true
      );
      CustomContentRenderer.wireCompatibilityEventListeners(
        this.element,
        super.activateListeners,
        this
      );
      blurUntabbableButtonsOnClick(this.element);
      return;
    }

    await maintainCustomContentInputFocus(this, async () => {
      applyTitleToWindow(this.title, this.element.get(0));
      await this.renderCustomContent({ data, isFullRender: false });
      Hooks.callAll(
        'tidy5e-sheet.renderActorSheet',
        this,
        this.element.get(0),
        data,
        false
      );
      CustomContentRenderer.wireCompatibilityEventListeners(
        this.element,
        super.activateListeners,
        this
      );
    });
  }

  private async renderCustomContent(args: {
    data: VehicleSheetContext;
    isFullRender: boolean;
  }) {
    await CustomContentRenderer.render({
      app: this,
      customContent: args.data.customContent,
      data: args.data,
      element: this.element,
      isFullRender: args.isFullRender,
      superActivateListeners: super.activateListeners,
      tabs: args.data.tabs,
    });
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    return FoundryAdapter.removeConfigureSettingsButtonWhenLockedForNonGm(
      buttons
    );
  }

  _destroySvelteComponent() {
    this.component?.$destroy();
    this.component = undefined;
  }

  _saveScrollPositions(html: any) {
    if (html.length && this.component) {
      const save = super._saveScrollPositions(html);
      debug('Saved scroll positions', this._scrollPositions);
      return save;
    }
  }

  async _onDropSingleItem(itemData: any) {
    const cargoTypes = [
      'weapon',
      'equipment',
      'consumable',
      'tool',
      'loot',
      'container',
    ];
    const isCargo =
      cargoTypes.includes(itemData.type) &&
      this.currentTabId === CONSTANTS.TAB_VEHICLE_CARGO_AND_CREW;
    foundry.utils.setProperty(itemData, 'flags.dnd5e.vehicleCargo', isCargo);

    // Create a Consumable spell scroll on the Inventory tab
    if (itemData.type === 'spell') {
      const scroll = await dnd5e.documents.Item5e.createScrollFromSpell(
        itemData
      );
      return scroll.toObject();
    }

    if (itemData.type === 'consumable') {
      return super._onDropSingleItem(itemData);
    }

    // Skip the default vehicle sheet handler, as we are handling all use cases.
    const baseActor5eClass = getBaseActorSheet5e(this);
    if (baseActor5eClass) {
      return baseActor5eClass._onDropSingleItem.call(this, itemData);
    }
  }

  close(options: unknown = {}) {
    this._destroySvelteComponent();
    this.subscriptionsService.unsubscribeAll();
    return super.close(options);
  }

  async _onSubmit(...args: any[]) {
    await super._onSubmit(...args);
    this.stats.update((stats) => {
      stats.lastSubmissionTime = new Date();
      return stats;
    });
  }

  _disableFields(...args: any[]) {
    debug('Ignoring call to disable fields. Delegating to Tidy Sheets...');
  }

  _onResize(event: any) {
    super._onResize(event);
    const { width, height } = this.position;
    SheetPreferencesService.setDocumentTypePreference(
      CONSTANTS.SHEET_TYPE_VEHICLE,
      'width',
      width
    );
    SheetPreferencesService.setDocumentTypePreference(
      CONSTANTS.SHEET_TYPE_VEHICLE,
      'height',
      height
    );
  }

  /* -------------------------------------------- */
  /* SheetTabCacheable
  /* -------------------------------------------- */

  onTabSelected(tabId: string) {
    this.currentTabId = tabId;
  }

  /* -------------------------------------------- */
  /* SheetExpandedItemsCacheable
  /* -------------------------------------------- */

  onItemToggled(itemId: string, isVisible: boolean, location: string) {
    const locationSet =
      this.expandedItems.get(itemId) ??
      this.expandedItems.set(itemId, new Set<string>()).get(itemId);

    if (isVisible) {
      locationSet?.add(location);
    } else {
      locationSet?.delete(location);
    }

    debug('Item Toggled', {
      expandedItems: this.expandedItems,
    });
  }

  /* -------------------------------------------- */
  /* SearchFilterCacheable
  /* -------------------------------------------- */

  onSearch(location: string, text: string): void {
    debug('Searched', {
      location,
      text,
    });
    this.searchFilters.set(location, text);
  }
}
