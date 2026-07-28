# Revision Pattern Example

## Case: Correct A Contrast Assumption

A debug diagram uses white text on the strong red suspect color.

~~~text
Thought 1/6: Assume the existing red and white pair meets normal-text contrast.
Thought 2/6: Plan to reuse it in every high-risk node.
Thought 3/6 [VERIFICATION]: The measured ratio is 3.28:1; the assumption is false.
Thought 4/6 [REVISION of Thought 1]: Use #111111 text on #FA5252; discard the white-text rollout from Thought 2.
Thought 5/6 [VERIFICATION]: The replacement measures 5.75:1 and remains visually distinct in the render.
Thought 6/6 [FINAL]: Keep the ink-text rule and assert a minimum ratio of 4.5:1.
~~~

## Revision Cascade

- Thought 1: invalid.
- Thought 2: discard because it depended on Thought 1.
- Thought 3: retain as evidence.
- Later styling guidance: update wherever it repeats the invalid pairing.

A revision is not complete until dependent checkpoints are reassessed.
