# SandWorkflow Source of Truth and Host Synchronization

## Authority

As of 2026-09-21, `supdger/sand-workflow` is the authoritative SandWorkflow
repository. It owns the plugin backend, frontend payload, lifecycle SQL,
documentation, release metadata, and package checks.

The authoritative workspace location is:

```text
https://github.com/supdger/sand-workflow
```

The historical directory `/Users/code/project/plugins/sandworkflow` is not a
release source and is retained only for a later, deliberate comparison.  Do
not copy changes from it into a release without review.

## Host delivery boundary

An explicitly selected SandAdmin test host may temporarily receive the exact
version of this package as a deployment copy. Its `plugins/sandworkflow`,
`server/plugin/sandworkflow`, matching frontend payload, and Composer autoload
entry are deployment and acceptance material only. They must not be edited as
a second source of truth.

Before host acceptance, synchronize this complete package to the configured
demo host, record the package revision and destination, and verify that the
backend and frontend payloads match the release source. Then run the real
PostgreSQL install, core workflow, upgrade, uninstall, and post-uninstall host
checks. An explicitly selected separate isolated host may be supplied through
`SANDADMIN_ROOT`; this does not change the default contract.

## Migration record

- Migration baseline: SandAdmin `plugins/sandworkflow` package at version
  `1.0.7`, including its in-progress uncommitted changes.
- Baseline date: 2026-08-17.
- The SandAdmin host copies were removed only after the source copy was
  verified byte-for-byte and separate deletion authorization was received.
- This migration records source ownership; it does not claim an installation,
  upgrade, uninstall, or workflow business-path acceptance in a real host.
