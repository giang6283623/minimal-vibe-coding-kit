# Writing style rules

- Never use emoji in responses, code, comments, commit messages, docs, or diagrams unless the user explicitly asks for them.
- Do not use em dashes or en dashes in generated prose. Use ASCII punctuation instead: comma, colon, semicolon, hyphen, or parentheses.
- Apply the rule to everything you write: chat responses, documentation, skill files, Mermaid diagram labels, and code comments.
- Exceptions: verbatim quotes of existing content, strings pinned by validators or tests, and files whose established style already uses these characters. When editing such files, keep existing characters and apply the rule only to new text.
- If the user requests a cleanup of existing emoji or dashes, propose the diff first and confirm the validation command in `backbone.yml` still passes.
