# JSX Share URL Hooks

The viewer can copy shareable URLs for any JSX deliverable that opts into its settings hook contract. The copied URL keeps the selected file and a base64url-encoded `state` value containing only settings that differ from the deliverable defaults.

## Contract

Export `DEFAULT_SETTINGS` from the JSX file, then accept `initialSettings` and `onSettingsChange` in the default component.

```jsx
export const DEFAULT_SETTINGS = {
  view: "summary",
  selectedCompany: "sierra",
};

export default function MyDeliverable({
  initialSettings = DEFAULT_SETTINGS,
  onSettingsChange,
} = {}) {
  const [settings, setSettings] = useState(initialSettings);

  function updateSettings(patch) {
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);
    onSettingsChange?.(nextSettings);
  }

  return (
    <button type="button" onClick={() => updateSettings({ view: "runway" })}>
      Runway Scenarios
    </button>
  );
}
```

## How It Works

- `DEFAULT_SETTINGS` defines the clean state for the deliverable.
- `initialSettings` is the viewer-restored state from a copied URL.
- `onSettingsChange(nextSettings)` tells the viewer that the user changed a shareable setting.
- The viewer diffs `nextSettings` against `DEFAULT_SETTINGS`, encodes the difference into the URL, and updates the copy-link field.

## Rules

- Keep settings JSON-safe: strings, numbers, booleans, arrays, plain objects, or `null`.
- Store user-visible configuration only. Do not store secrets, tokens, large data, raw files, or personally sensitive data.
- Normalise untrusted `initialSettings` before using them for rendering.
- Call `onSettingsChange` only for state that should survive in a copied URL.
- Keep transient UI state local when it should not be shared, such as open accordions, hover state, loading state, or temporary errors.

## Example: Shareable Runway Tab

```jsx
const DEFAULT_RUNWAY = {
  marginIdx: 2,
  growthIdx: 0,
  horizonIdx: 1,
};

export const DEFAULT_SETTINGS = {
  view: "compare",
  runwayScenario: DEFAULT_RUNWAY,
};

export default function FundingTracker({
  initialSettings = DEFAULT_SETTINGS,
  onSettingsChange,
} = {}) {
  const [view, setView] = useState(initialSettings.view);
  const [runwayScenario, setRunwayScenario] = useState(
    initialSettings.runwayScenario,
  );

  function showRunwayScenarios() {
    setView("runway");
    onSettingsChange?.({ view: "runway", runwayScenario });
  }

  function updateRunwayScenario(nextRunwayScenario) {
    setRunwayScenario(nextRunwayScenario);
    onSettingsChange?.({
      view,
      runwayScenario: nextRunwayScenario,
    });
  }

  // Render tabs and controls...
}
```

With this shape, a user can configure the Runway Scenarios view, copy the viewer URL, and reopen the same JSX file with those settings restored.
