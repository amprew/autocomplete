import { invariant } from '@algolia/autocomplete-shared';

import { resolve } from './fetcher';
import {
  AutocompleteScopeApi,
  AutocompleteState,
  AutocompleteStore,
  BaseItem,
  InternalAutocompleteOptions,
} from './types';
import { getActiveItem } from './utils';

let lastStalledId: number | null = null;

interface OnInputParams<TItem extends BaseItem>
  extends AutocompleteScopeApi<TItem> {
  event: any;
  /**
   * The next partial state to apply after the function is called.
   *
   * This is useful when we call `onInput` in a different scenario than an
   * actual input. For example, we use `onInput` when we click on an item,
   * but we want to close the panel in that case.
   */
  nextState?: Partial<AutocompleteState<TItem>>;
  props: InternalAutocompleteOptions<TItem>;
  query: string;
  store: AutocompleteStore<TItem>;
}

export function onInput<TItem extends BaseItem>({
  event,
  nextState = {},
  props,
  query,
  refresh,
  store,
  ...setters
}: OnInputParams<TItem>): Promise<void> {
  if (lastStalledId) {
    props.environment.clearTimeout(lastStalledId);
  }

  const {
    setCollections,
    setIsOpen,
    setQuery,
    setActiveItemId,
    setStatus,
  } = setters;

  setQuery(query);
  setActiveItemId(props.defaultActiveItemId);

  if (!query && props.openOnFocus === false) {
    setStatus('idle');
    setCollections(
      store.getState().collections.map((collection) => ({
        ...collection,
        items: [],
      }))
    );
    setIsOpen(
      nextState.isOpen ?? props.shouldPanelOpen({ state: store.getState() })
    );

    return Promise.resolve();
  }

  setStatus('loading');

  lastStalledId = props.environment.setTimeout(() => {
    setStatus('stalled');
  }, props.stallThreshold);

  return props
    .getSources({
      query,
      refresh,
      state: store.getState(),
      ...setters,
    })
    .then((sources) => {
      setStatus('loading');

      return resolve(
        sources.map((source) => {
          return Promise.resolve(
            source.getItems({
              query,
              refresh,
              state: store.getState(),
              ...setters,
            })
          );
        })
      )
        .then((responses) => {
          console.log('onInput', responses);

          return responses.map((response, index) => {
            // invariant(
            //   Array.isArray(items),
            //   `The \`getItems\` function must return an array of items but returned type ${JSON.stringify(
            //     typeof items
            //   )}:\n\n${JSON.stringify(items, null, 2)}`
            // );

            return {
              source: sources[index],
              items: response,
            };
          });
        })
        .then((collections) => {
          // console.log({ collections });
          setStatus('idle');
          setCollections(collections as any);
          const isPanelOpen = props.shouldPanelOpen({
            state: store.getState(),
          });
          setIsOpen(
            nextState.isOpen ??
              ((props.openOnFocus && !query && isPanelOpen) || isPanelOpen)
          );

          const highlightedItem = getActiveItem(store.getState());

          if (store.getState().activeItemId !== null && highlightedItem) {
            const { item, itemInputValue, itemUrl, source } = highlightedItem;

            source.onActive({
              event,
              item,
              itemInputValue,
              itemUrl,
              refresh,
              source,
              state: store.getState(),
              ...setters,
            });
          }
        })
        .finally(() => {
          if (lastStalledId) {
            props.environment.clearTimeout(lastStalledId);
          }
        });
    });
}
