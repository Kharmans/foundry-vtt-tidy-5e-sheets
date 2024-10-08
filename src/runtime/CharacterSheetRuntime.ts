import type {
  CharacterSheetContext,
  CustomContent,
  Tab,
} from 'src/types/types';
import CharacterAttributesTab from 'src/sheets/character/tabs/CharacterAttributesTab.svelte';
import ActorInventoryTab from 'src/sheets/actor/tabs/ActorInventoryTab.svelte';
import CharacterSpellbookTab from 'src/sheets/character/tabs/CharacterSpellbookTab.svelte';
import CharacterFeaturesTab from 'src/sheets/character/tabs/CharacterFeaturesTab.svelte';
import CharacterEffectsTab from 'src/sheets/character/tabs/CharacterEffectsTab.svelte';
import CharacterBiographyTab from 'src/sheets/character/tabs/CharacterBiographyTab.svelte';
import ActorJournalTab from 'src/sheets/actor/tabs/ActorJournalTab.svelte';
import ActorActionsTab from 'src/sheets/actor/tabs/ActorActionsTab.svelte';
import type { RegisteredContent, RegisteredTab } from './types';
import { CONSTANTS } from 'src/constants';
import { debug, error, warn } from 'src/utils/logging';
import { TabManager } from './tab/TabManager';
import type { ActorTabRegistrationOptions } from 'src/api/api.types';
import { CustomContentManager } from './content/CustomContentManager';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';

export class CharacterSheetRuntime {
  private static _content: RegisteredContent<CharacterSheetContext>[] = [];
  private static _tabs: RegisteredTab<CharacterSheetContext>[] = [
    {
      title: 'TIDY5E.Actions.TabName',
      content: {
        component: ActorActionsTab,
        type: 'svelte',
      },
      id: CONSTANTS.TAB_ACTOR_ACTIONS,
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_ATTRIBUTES,
      title: 'DND5E.Attributes',
      content: {
        component: CharacterAttributesTab,
        type: 'svelte',
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_ACTOR_INVENTORY,
      title: 'DND5E.Inventory',
      content: {
        component: ActorInventoryTab,
        type: 'svelte',
        getProps() {
          return {
            tabId: CONSTANTS.TAB_ACTOR_INVENTORY,
          };
        },
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_SPELLBOOK,
      title: 'DND5E.Spellbook',
      content: {
        component: CharacterSpellbookTab,
        type: 'svelte',
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_FEATURES,
      title: 'DND5E.Features',
      content: {
        component: CharacterFeaturesTab,
        type: 'svelte',
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_EFFECTS,
      title: 'DND5E.Effects',
      content: {
        component: CharacterEffectsTab,
        type: 'svelte',
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_BIOGRAPHY,
      title: 'DND5E.Biography',
      content: {
        component: CharacterBiographyTab,
        type: 'svelte',
      },
      layout: 'classic',
    },
    {
      id: CONSTANTS.TAB_CHARACTER_JOURNAL,
      title: 'TIDY5E.JournalTabName',
      content: {
        component: ActorJournalTab,
        type: 'svelte',
      },
      enabled: (context) => context.owner,
      layout: 'classic',
    },
  ];

  static async getContent(
    context: CharacterSheetContext
  ): Promise<CustomContent[]> {
    return await CustomContentManager.prepareContentForRender(
      context,
      CharacterSheetRuntime._content
    );
  }

  static async getTabs(context: CharacterSheetContext): Promise<Tab[]> {
    return await TabManager.prepareTabsForRender(
      context,
      CharacterSheetRuntime._tabs
    );
  }

  static getAllRegisteredTabs(): RegisteredTab<CharacterSheetContext>[] {
    return [...CharacterSheetRuntime._tabs];
  }

  static registerContent(
    registeredContent: RegisteredContent<CharacterSheetContext>
  ) {
    this._content.push(registeredContent);
  }

  static registerTab(
    tab: RegisteredTab<CharacterSheetContext>,
    options?: ActorTabRegistrationOptions
  ) {
    const tabExists = CharacterSheetRuntime._tabs.some((t) => t.id === tab.id);

    if (tabExists && !options?.overrideExisting) {
      warn(`Tab with id ${tab.id} already exists.`);
      return;
    }

    if (tabExists && options?.overrideExisting) {
      const index = CharacterSheetRuntime._tabs.findIndex(
        (t) => t.id === tab.id
      );
      if (index >= 0) {
        CharacterSheetRuntime._tabs.splice(index, 1);
      }
    }

    CharacterSheetRuntime._tabs.push(tab);
  }

  static getTabTitle(tabId: string) {
    try {
      let tabTitle = this._tabs.find((t) => t.id === tabId)?.title;
      if (typeof tabTitle === 'function') {
        tabTitle = tabTitle();
      }
      return tabTitle ? FoundryAdapter.localize(tabTitle) : tabId;
    } catch (e) {
      error('An error occurred while searching for a tab title.', false, e);
      debug('Tab title error troubleshooting information', { tabId });
    }
  }
}
