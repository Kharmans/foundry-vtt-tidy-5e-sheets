<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import SheetEditor from 'src/components/editor/SheetEditor.svelte';
  import type { NpcSheetContext } from 'src/types/types';
  import { CONSTANTS } from 'src/constants';
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';
  import ContentEditableFormField from 'src/components/inputs/ContentEditableFormField.svelte';
  import RerenderAfterFormSubmission from 'src/components/utility/RerenderAfterFormSubmission.svelte';
  import { settingStore } from 'src/settings/settings';
  import { TidyFlags } from 'src/foundry/TidyFlags';

  let context = getContext<Readable<NpcSheetContext>>('context');

  const localize = FoundryAdapter.localize;

  $: showNpcPersonalityInfo =
    TidyFlags.tryGetFlag($context.actor, 'showNpcPersonalityInfo') ?? false;

  function togglePersonalityInfo() {
    TidyFlags.setFlag(
      $context.actor,
      'showNpcPersonalityInfo',
      !showNpcPersonalityInfo,
    );
  }

  type FlagBioField = {
    flag: string;
    value: string | undefined | null;
    text: string;
  };

  let bioFields: FlagBioField[] = [];
  $: bioFields = [
    {
      flag: 'gender',
      value: TidyFlags.tryGetFlag($context.actor, 'gender'),
      text: 'DND5E.Gender',
    },
    {
      flag: 'age',
      value: TidyFlags.tryGetFlag($context.actor, 'age'),
      text: 'DND5E.Age',
    },
    {
      flag: 'height',
      value: TidyFlags.tryGetFlag($context.actor, 'height'),
      text: 'DND5E.Height',
    },
    {
      flag: 'weight',
      value: TidyFlags.tryGetFlag($context.actor, 'weight'),
      text: 'DND5E.Weight',
    },
    {
      flag: 'eyes',
      value: TidyFlags.tryGetFlag($context.actor, 'eyes'),
      text: 'DND5E.Eyes',
    },
    {
      flag: 'skin',
      value: TidyFlags.tryGetFlag($context.actor, 'skin'),
      text: 'DND5E.Skin',
    },
    {
      flag: 'hair',
      value: TidyFlags.tryGetFlag($context.actor, 'hair'),
      text: 'DND5E.Hair',
    },
    {
      flag: 'faith',
      value: TidyFlags.tryGetFlag($context.actor, 'faith'),
      text: 'DND5E.Faith',
    },
  ];
</script>

<div class="scroll-container">
  <div class="notes-container">
    <div
      class="top-notes note-entries"
      class:limited={$context.showLimitedSheet}
    >
      <article>
        <ul class="character-details">
          {#each bioFields as bioField (bioField.flag)}
            <li>
              <span>{localize(bioField.text)}:</span>
              <ContentEditableFormField
                selectOnFocus={true}
                element="span"
                editable={$context.editable && !$context.lockSensitiveFields}
                document={$context.actor}
                field="flags.{CONSTANTS.MODULE_ID}.{bioField.flag}"
                value={bioField.value ?? ''}
                cssClass="detail-input"
              />
            </li>
          {/each}
        </ul>
      </article>
    </div>
    <div class="flex-row extra-small-gap full-height">
      <button
        type="button"
        on:click={togglePersonalityInfo}
        class="toggle-personality-info"
        title={localize('TIDY5E.TogglePersonalityInfo')}
        tabindex={$settingStore.useAccessibleKeyboardSupport ? 0 : -1}
      >
        {#if showNpcPersonalityInfo}
          <i class="fas fa-angle-double-left" />
        {:else}
          <i class="fas fa-angle-double-right" />
        {/if}
      </button>
      <div class="main-notes">
        {#if showNpcPersonalityInfo}
          <div
            class="left-notes note-entries"
            class:limited={$context.showLimitedSheet}
          >
            <RerenderAfterFormSubmission
              andOnValueChange={TidyFlags.tryGetFlag($context.actor, 'trait') ??
                ''}
            >
              <article use:$context.activateEditors>
                <div class="section-titles biopage">
                  {localize('DND5E.PersonalityTraits')}
                </div>
                <SheetEditor
                  content={$context.traitEnrichedHtml}
                  target="flags.{CONSTANTS.MODULE_ID}.trait"
                  editable={$context.editable}
                />
              </article>
            </RerenderAfterFormSubmission>
            <RerenderAfterFormSubmission
              andOnValueChange={TidyFlags.tryGetFlag($context.actor, 'ideal') ??
                ''}
            >
              <article use:$context.activateEditors>
                <div class="section-titles biopage">
                  {localize('DND5E.Ideals')}
                </div>
                <SheetEditor
                  content={$context.idealEnrichedHtml}
                  target="flags.{CONSTANTS.MODULE_ID}.ideal"
                  editable={$context.editable}
                />
              </article>
            </RerenderAfterFormSubmission>
            <RerenderAfterFormSubmission
              andOnValueChange={TidyFlags.tryGetFlag($context.actor, 'bond') ??
                ''}
            >
              <article use:$context.activateEditors>
                <div class="section-titles biopage">
                  {localize('DND5E.Bonds')}
                </div>
                <SheetEditor
                  content={$context.bondEnrichedHtml}
                  target="flags.{CONSTANTS.MODULE_ID}.bond"
                  editable={$context.editable}
                />
              </article>
            </RerenderAfterFormSubmission>
            <RerenderAfterFormSubmission
              andOnValueChange={TidyFlags.tryGetFlag($context.actor, 'flaw') ??
                ''}
            >
              <article use:$context.activateEditors>
                <div class="section-titles biopage">
                  {localize('DND5E.Flaws')}
                </div>
                <SheetEditor
                  content={$context.flawEnrichedHtml}
                  target="flags.{CONSTANTS.MODULE_ID}.flaw"
                  editable={$context.editable}
                />
              </article>
            </RerenderAfterFormSubmission>
          </div>
        {/if}
        <div
          class="right-notes note-entries"
          class:limited={$context.showLimitedSheet}
        >
          <!-- TODO: Offload this kind of thing to itemContext -->
          <RerenderAfterFormSubmission
            andOnValueChange={TidyFlags.tryGetFlag(
              $context.actor,
              'appearance',
            ) ?? ''}
          >
            <article class="appearance-notes" use:$context.activateEditors>
              <div class="section-titles biopage">
                {localize('DND5E.Appearance')}
              </div>
              <SheetEditor
                content={$context.appearanceEnrichedHtml}
                target="flags.{CONSTANTS.MODULE_ID}.appearance"
                editable={$context.editable}
              />
            </article>
          </RerenderAfterFormSubmission>
          <RerenderAfterFormSubmission
            andOnValueChange={$context.system.details.biography.value}
          >
            <article class="biography-notes" use:$context.activateEditors>
              <div class="section-titles">
                {localize('DND5E.Background')}/{localize('DND5E.Biography')}
              </div>
              <SheetEditor
                content={$context.biographyEnrichedHtml}
                target="system.details.biography.value"
                editable={$context.editable}
              />
            </article>
          </RerenderAfterFormSubmission>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .notes-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
  }

  .main-notes {
    display: flex;
    flex: 1;
    gap: 1rem;
  }

  .left-notes,
  .right-notes {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .left-notes {
    max-width: 21.875rem;
  }

  .top-notes {
    width: 100%;
    margin-bottom: 1rem;

    .character-details {
      margin: 0;
      padding: 0;
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    li {
      display: flex;
      flex: 0 0 calc(100% / 3 - 0.25rem);

      :global(span) {
        flex: 1;
        margin: 0 0.5rem 0 0.25rem;
      }

      :global(span:first-child) {
        flex: 0 0 0.0625rem;
        font-weight: 600;
        margin: 0;
      }
    }
  }

  .character-details :global(.detail-input) {
    flex: 1;
    margin: 0 0.5rem 0 0.25rem;
  }

  .toggle-personality-info {
    width: auto;
    border: none;
    align-self: flex-start;
    transition:
      color 0.3s ease,
      transform 0.3s ease;
    padding: 1.25rem 0.25rem;
    background: var(--t5e-faint-color);
    border-radius: 0.1875rem;
    margin-right: 0.25rem;
    color: var(--t5e-tertiary-color);
    cursor: pointer;

    &:hover {
      color: var(--t5e-secondary-color);
    }
  }
</style>
