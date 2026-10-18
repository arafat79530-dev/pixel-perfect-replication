<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep approved-only tools under the client-only authenticated layout; check approval independently in every private server function to prevent direct-call bypasses.
- Store roles separately from profiles, with server-validated owner privileges; all access decisions use the admin-checked database function.
- Bootstrap the owner only from a confirmed Auth email, never user-editable metadata; pending accounts may read only their own access state.
