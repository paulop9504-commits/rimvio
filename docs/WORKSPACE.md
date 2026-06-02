# Glango — Cursor workspace

Glango and **Silent Ghost** (`ghostsilence-programmer`) are **separate repos**. Open the correct workspace so Cursor rules and tests apply to the right project.

## Glango only (recommended for Glango work)

1. **File → Open Workspace from File…**
2. Select:
   ```
   c:\Users\userguest\Desktop\new-project\glango.code-workspace
   ```

Or from terminal:

```powershell
cursor "c:\Users\userguest\Desktop\new-project\glango.code-workspace"
```

**Applies:** `.cursor/rules/glango-*.mdc`  
**Dev:** `npm run dev` → http://localhost:3000  
**Tests:** `npm test` in `new-project`

## Both projects (multi-root)

```
c:\Users\userguest\Desktop\glango-and-silent-ghost.code-workspace
```

| Folder | Port | Rules |
|--------|------|--------|
| **Glango** (`new-project`) | 3000 | `glango-*.mdc` |
| **Silent Ghost** (`ghostsilence-programmer`) | 38471 bridge | `engine-site-separation`, etc. |

When editing a file, match the **folder name** — do not apply Silent Ghost truth-log patterns to Glango chat/orchestrator.

## Do not

- Open Glango files from **only** the Silent Ghost workspace root (SG rules leak into Glango edits).
- Run Silent Ghost `npm test` to verify Glango orchestrator changes.
- Import across repos.

See also: [GLANGO_HANDOFF.md](./GLANGO_HANDOFF.md) · `.cursor/rules/glango-isolation.mdc`
