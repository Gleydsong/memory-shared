# LaunchAgent

Do not commit a machine-specific plist. Generate one that points at this clone:

```bash
./scripts/install-launchd-env.sh
```

The installer writes `~/Library/LaunchAgents/com.shared-memory.env.plist` with
the absolute path of `scripts/load-launchd-shared-memory-env.zsh` in this
repository. The plist never contains MCP keys.
