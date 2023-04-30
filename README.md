# Hey, Vim

hey.vim is a Vim plugin that utilizes the OpenAI API to edit text.

## Installation

This plugin is depends on [vim-denops/denops.vim](https://github.com/vim-denops/denops.vim).

```vim
Plug 'vim-denops/denops.vim'
Plug 'tnai/hey.vim'
```

## Commands

- `[range]Hey {prompt}` - Edit text with OpenAI API.
- `HeyAgain` - Edit text with the same prompt as the previous one.
- 'HeyUndo' - Undo the last edit.

## Keymaps

- `<Plug>HeyUndo` - Undo the last edit.
- `<Plug>HeyAgain` - Edit text with the same prompt as the previous one.

## License

This software is released under the MIT License. https://git.io/mit-license
