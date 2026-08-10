# MARS Sync Benchmark

This benchmark compares the current MARS/Yjs CRDT path with a Loro replacement while keeping the same MARS-style document model:

- one `MarsDigitalEntity` mapped to a CRDT map
- one shared `transform` component
- one active `MeshView`
- two clients that issue opposite X-axis transform edits

The default simulation uses a 60s virtual time window. For each `intervalMs`, both clients generate edit events with a Poisson process whose mean inter-arrival time is `intervalMs`.

Run the full comparison:

```bash
npm run experiment:mars-sync
```

Useful options:

```bash
npm run experiment:mars-sync -- --repeats 10 --intervals 10,30
npm run experiment:mars-sync -- --duration-ms 60000 --conflict-window-ms 50
npm run experiment:mars-sync -- --transport websocket --duration-ms 60000 --conflict-window-ms 50
npm run experiment:mars-sync -- --real-time
```

Results are written to `experiments/mars-sync-benchmark/results` as JSON, CSV, and summary JSON.

Transport modes:

- `direct`: default fast in-process delivery. It measures CRDT encode/import/merge cost without real network transfer.
- `websocket`: starts a local WebSocket relay server and sends each CRDT update through `ws.send()`. This records `networkMessageBytes`, `networkTransferMs`, and `crdtMergeMs` separately.

Conflict metrics are recorded per trial:

- `hasConflict`: true when both clients edit `transform.x` within the configured conflict window.
- `conflictResolved`: true when both clients converge to the same final transform state.
- `conflictWinner`: the final `lastWriter` value after CRDT conflict resolution.
- `conflictResolutionLatencyMs`: elapsed time from conflict creation to both clients receiving the merged state in this harness.

The summary file also includes `conflictRate`, `conflictResolutionRate`, and `convergenceSuccessRate`.

`encodedDocSizeBytes` is reported in the summary as `finalEncodedDocSizeBytes`, because the document-size metric is defined after all simulated operations finish.
