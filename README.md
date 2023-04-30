# Hey, Vim

hey.vim is a Vim plugin that utilizes the OpenAI API to edit text.


https://user-images.githubusercontent.com/5019902/235354741-b3ec948c-73af-4121-90e9-bd5e2d159852.mp4


## Installation

This plugin is depends on [vim-denops/denops.vim](https://github.com/vim-denops/denops.vim).

```vim
Plug 'vim-denops/denops.vim'
Plug 'tani/hey.vim'
```

You need to set the OpenAI API key to the environment variable `OPENAI_API_KEY`.

## Commands

- `[range]Hey {prompt}` - Edit text with OpenAI API.
- `HeyAgain` - Edit text with the same prompt as the previous one.
- `HeyUndo` - Undo the last edit.

## Keymaps

- `<Plug>HeyUndo` - Undo the last edit.
- `<Plug>HeyAgain` - Edit text with the same prompt as the previous one.

## License

This software is released under the MIT License. https://git.io/mit-license
