# Writing style rules

- Never use emoji in responses, code, comments, commit messages, docs, or diagrams unless the user explicitly asks for them.
- Do not use em dashes or en dashes in generated prose. Use ASCII punctuation instead: comma, colon, semicolon, hyphen, or parentheses.
- Apply the rule to everything you write: chat responses, documentation, skill files, Mermaid diagram labels, and code comments.
- Exceptions: verbatim quotes of existing content, strings pinned by validators or tests, and files whose established style already uses these characters. When editing such files, keep existing characters and apply the rule only to new text.
- If the user requests a cleanup of existing emoji or dashes, propose the diff first and confirm the validation command in `backbone.yml` still passes.
- Plain-language register in every reply language: lead with the outcome, keep sentences short with one idea each, prefer active voice and concrete verbs, put known information before new information, and define project terms at first use.
- Reuse the project's vocabulary from the glossary named in `backbone.yml` `project.context` when present instead of rotating synonyms. When replying in English, keep one meaning per word (ASD-STE100-style simplicity); never apply English-only word lists to other languages.
- Reply in the user's conversation language; quote code identifiers, commands, file paths, and error text verbatim in every language. When a message does not land, the user can invoke `/wait-what` for a plain-language re-pitch.
