---
id: sources
title: Populating autocomplete with Sources
---

Sources define where to retrieve items from and their behavior.

**The most important aspect of an autocomplete experience is the items you display.** Most of the time they're search results to a query, but you could imagine many different usages.

Autocomplete gives you total freedom to return rich suggestions via the Sources API.

## Usage

### Using static sources

The most straightforward way to provide items is to return static sources. Each source returns a collection of items.

```js
autocomplete({
  // ...
  getSources() {
    return [
      {
        sourceId: 'links',
        getItems() {
          return [
            { label: 'Twitter', url: 'https://twitter.com' },
            { label: 'GitHub', url: 'https://github.com' },
          ];
        },
        getItemUrl({ item }) {
          return item.url;
        },
        // ...
      },
    ];
  },
});
```

Here, whatever the autocomplete state is, it always returns these two items.

### Searching in static sources

You can access the autocomplete state in your sources, meaning you can search within static sources to update them as the user types.

```js
autocomplete({
  // ...
  getSources() {
    return [
      {
        sourceId: 'links',
        getItems({ query }) {
          return [
            { label: 'Twitter', url: 'https://twitter.com' },
            { label: 'GitHub', url: 'https://github.com' },
          ].filter(({ label }) =>
            label.toLowerCase().includes(query.toLowerCase())
          );
        },
        getItemUrl({ item }) {
          return item.url;
        },
        // ...
      },
    ];
  },
});
```

Before moving on to more complex sources, let's take a closer look at the code.

Notice that the [`getSources`](#getsources) function returns an array of sources. Each source implements a [`getItems`](#getitems) function to return the items to display. These items can be a simple static array, but you can also use a function to refine items based on the query. **The [`getItems`](#getitems) function is called whenever the input changes.**

By default, autocomplete items are meant to be hyperlinks. To determine what URL to navigate to, you can implement a [`getItemURL`](#getitemurl) function. It enables the [keyboard accessibility](/docs/keyboard-navigation) feature, allowing users to open items in the current tab, a new tab, or a new window from their keyboard.

### Customizing items with templates

In addition to defining data sources for items, a source also lets you customize how to display items using [`templates`](#templates).

```js
autocomplete({
  // ...
  getSources({ query }) {
    return [
      {
        // ...
        templates: {
          item({ item }) {
            return `Result: ${item.name}`;
          },
        },
      },
    ];
  },
});
```

You can also display header and footer elements around the list of items.

```js
autocomplete({
  // ...
  getSources({ query }) {
    return [
      {
        // ...
        templates: {
          header() {
            return 'Suggestions';
          },
          item({ item }) {
            return `Result: ${item.name}`;
          },
          footer() {
            return 'Footer';
          },
        },
      },
    ];
  },
});
```

**Templates aren't limited to strings.** You can provide anything as long as they're a valid virtual DOM element (see more in [**Templates**](templates)).

### Using dynamic sources

Static sources can be useful, especially [when the user hasn't typed anything yet](changing-behavior-based-on-query). However, you might want more robust search capabilities beyond exact matches in strings.

In this case, you could search into one or more Algolia indices using the built-in [`getAlgoliaHits`](getAlgoliaHits) function from the `autocomplete-preset-algolia` preset.

```js
import algoliasearch from 'algoliasearch/lite';
import { autocomplete } from '@algolia/autocomplete-js';
import { getAlgoliaHits } from '@algolia/autocomplete-preset-algolia';

const searchClient = algoliasearch(
  'latency',
  '6be0576ff61c053d5f9a3225e2a90f76'
);

autocomplete({
  // ...
  getSources() {
    return [
      {
        sourceId: 'products',
        getItems({ query }) {
          return getAlgoliaHits({
            searchClient,
            queries: [
              {
                indexName: 'instant_search',
                query,
              },
            ],
          });
        },
        getItemUrl({ item }) {
          return item.url;
        },
        // ...
      },
    ];
  },
});
```

### Using asynchronous sources

The [`getSources`](#getsources) function supports promises so that you can fetch sources from any asynchronous API. It can be Algolia or any third-party API you can query with an HTTP request.

For example, you could use the [Query Autocomplete](https://developers.google.com/places/web-service/query) service of the Google Places API to search for places and retrieve popular queries that map to actual points of interest.

```js
autocomplete({
  // ...
  getSources({ query }) {
    return fetch(
      `https://maps.googleapis.com/maps/api/place/queryautocomplete/json?input=${query}&key=YOUR_GOOGLE_PLACES_API_KEY`
    )
      .then((response) => response.json())
      .then(({ predictions }) => {
        return [
          {
            sourceId: 'predictions',
            getItems() {
              return predictions;
            },
            getItemInputValue({ item }) {
              return item.description;
            },
          },
        ];
      });
  },
});
```

Note the usage of the [`getItemInputValue`](#getiteminputvalue) function to return the value of the item. It lets you fill the search box with a new value whenever the user selects an item, allowing them to refine their query and retrieve more relevant results.

### Using multiple sources

An autocomplete experience doesn't have to return only a single set of results. Autocomplete lets you fetch from different sources and display different types of results that serve different purposes.

For example, you may want to display Algolia search results and [Query Suggestions](https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/query-suggestions/js/) based on the current query to let users refine it and yield better results.

```js
import algoliasearch from 'algoliasearch/lite';
import { autocomplete } from '@algolia/autocomplete-js';
import { getAlgoliaHits } from '@algolia/autocomplete-preset-algolia';

const searchClient = algoliasearch(
  'latency',
  '6be0576ff61c053d5f9a3225e2a90f76'
);

autocomplete({
  // ...
  getSources({ query }) {
    return getAlgoliaHits({
      searchClient,
      queries: [
        {
          indexName: 'instant_search_demo_query_suggestions',
          query,
        },
        {
          indexName: 'instant_search',
          query,
        },
      ],
    }).then((results) => {
      const [suggestions, products] = results;

      return [
        {
          sourceId: 'querySuggestions',
          getItems() {
            return suggestions.hits;
          },
          getItemInputValue() {
            return item.query;
          },
        },
        {
          sourceId: 'products',
          getItems() {
            return products.hits;
          },
          getItemUrl({ item }) {
            return item.url;
          },
        },
      ];
    });
  },
});
```

:::note

You can use the official [`autocomplete-plugin-query-suggestions`](createQuerySuggestionsPlugin) plugin to retrieve [Query Suggestions](https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/query-suggestions/js/) from Algolia.

:::

For more information, check out the guide on [adding multiple sources to one autocomplete](including-multiple-result-types).

## Sources

### `getSources`

> `(params: { query: string, state: AutocompleteState, ...setters: Autocomplete Setters }) => Array<AutocompleteSource> | Promise<Array<AutocompleteSource>>`

The function to fetch sources and their behaviors.

See [source](#source) for what to return.

## Source

Each source implements the following interface:

### `sourceId`

> `string`

Unique identifier for the source. It is used as value for the `data-autocomplete-source-id` attribute of the source `section` container.

### `getItems`

> `(params: { query: string, state: AutocompleteState, ...setters }) => Item[] | Promise<Item[]>` | **required**

The function called when the input changes. You can use this function to filter the items based on the query.

```js
const items = [{ value: 'Apple' }, { value: 'Banana' }];

const source = {
  getItems({ query }) {
    return items.filter((item) => item.value.includes(query));
  },
  // ...
};
```

### `getItemInputValue`

> `(params: { item, state: AutocompleteState }) => string` | defaults to `({ state }) => state.query`

The function called to get the value of an item. The value is used to fill the search box.

```js
const items = [{ value: 'Apple' }, { value: 'Banana' }];

const source = {
  getItemInputValue({ item }) {
    return item.value;
  },
  // ...
};
```

### `getItemUrl`

> `(params: { item: Item, state: AutocompleteState }) => string | undefined`

The function called to get the URL of the item. The value is used to add [keyboard accessibility](keyboard-navigation) features to let users open items in the current tab, a new tab, or a new window.

```js
const items = [
  { value: 'Google', url: 'https://google.com' },
  { value: 'Amazon', url: 'https://amazon.com' },
];

const source = {
  getItemUrl({ item }) {
    return item.url;
  },
  // ...
};
```

### `onSelect`

> `(params: { state: AutocompleteState, ...setters, event: Event, item: TItem, itemInputValue: string, itemUrl: string, source: AutocompleteSource }) => void` | defaults to `({ setIsOpen }) => setIsOpen(false)`

The function called whenever an item is selected.

### `onActive`

> `(params: { state: AutocompleteState, ...setters, event: Event, item: TItem, itemInputValue: string, itemUrl: string, source: AutocompleteSource }) => void`

The function called whenever an item is active.

You can trigger different behaviors if the item is active depending on the triggering event using the `event` parameter.

### `templates`

> `AutocompleteTemplates`

A set of templates to customize how sections and their items are displayed.

See [**Displaying items with Templates**](templates) for more information.
