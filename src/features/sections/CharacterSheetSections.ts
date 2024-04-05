import { CONSTANTS } from 'src/constants';
import type { Item5e } from 'src/types/item.types';
import type {
  ActorInventoryTypes,
  CharacterFeatureSection,
  CharacterItemPartitions,
  InventorySection,
} from 'src/types/types';
import { TidyFlags } from 'src/foundry/TidyFlags';

export class CharacterSheetSections {
  static get inventoryItemTypes() {
    return [
      CONSTANTS.ITEM_TYPE_WEAPON,
      CONSTANTS.ITEM_TYPE_EQUIPMENT,
      CONSTANTS.ITEM_TYPE_TOOL,
      CONSTANTS.ITEM_TYPE_CONTAINER,
      CONSTANTS.ITEM_TYPE_LOOT,
    ];
  }

  static applyInventoryItemToSection(
    inventory: Record<string, InventorySection>,
    item: Item5e,
    customSectionOptions: Partial<InventorySection>
  ) {
    const customSectionName = TidyFlags.section.get(item);

    if (!customSectionName) {
      inventory[item.type].items.push(item);
      return;
    }

    const customSection: InventorySection = (inventory[customSectionName] ??= {
      dataset: { [TidyFlags.section.prop]: customSectionName },
      items: [],
      label: customSectionName,
      canCreate: true,
      key: customSectionName,
      custom: {
        section: customSectionName,
        creationItemTypes: CharacterSheetSections.inventoryItemTypes,
      },
      ...customSectionOptions,
    });

    customSection.items.push(item);
  }

  static applyCharacterFeatureToSection(
    features: Record<string, CharacterFeatureSection>,
    feat: Item5e,
    customSectionOptions: Partial<CharacterFeatureSection>
  ) {
    const customSectionName = TidyFlags.section.get(feat);

    if (!customSectionName) {
      return;
    }

    const customSection: CharacterFeatureSection = (features[
      customSectionName
    ] ??= {
      label: customSectionName,
      items: [],
      hasActions: true,
      dataset: {
        [TidyFlags.section.prop]: customSectionName,
      },
      isClass: false,
      canCreate: true,
      showUsesColumn: true,
      showUsagesColumn: true,
      showRequirementsColumn: true,
      key: customSectionName,
      custom: {
        section: customSectionName,
        creationItemTypes: [CONSTANTS.ITEM_TYPE_FEAT],
      },
      ...customSectionOptions,
    });

    customSection.items.push(feat);
  }

  static partitionItem(
    item: Item5e,
    partitions: CharacterItemPartitions,
    inventory: ActorInventoryTypes
  ) {
    if (item.type === CONSTANTS.ITEM_TYPE_SPELL) {
      partitions.spells.push(item);
    } else if (item.type === CONSTANTS.ITEM_TYPE_FEAT) {
      partitions.feats.push(item);
    } else if (item.type === CONSTANTS.ITEM_TYPE_RACE) {
      partitions.races.push(item);
    } else if (item.type === CONSTANTS.ITEM_TYPE_BACKGROUND) {
      partitions.backgrounds.push(item);
    } else if (item.type === CONSTANTS.ITEM_TYPE_CLASS) {
      partitions.classes.push(item);
    } else if (item.type === CONSTANTS.ITEM_TYPE_SUBCLASS) {
      partitions.subclasses.push(item);
    } else if (Object.keys(inventory).includes(item.type)) {
      partitions.items.push(item);
    }
  }
}
