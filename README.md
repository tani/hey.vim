# Hey, Vim

hey.vim is a Vim plugin that utilizes the OpenAI API to edit text.



https://user-images.githubusercontent.com/5019902/236111592-23fa3a36-d65d-4af7-9b86-6fe0f3c08bb9.mp4



## Installation

This plugin depends on [vim-denops/denops.vim](https://github.com/vim-denops/denops.vim).

```vim
Plug 'vim-denops/denops.vim'
Plug 'tani/hey.vim'
```

You need to set OpenAI API key as `OPENAI_API_KEY` environment variable.

## Commands

- `[range]Hey {prompt}` - Edit text with OpenAI API.
- `HeyAgain` - Edit text with the same prompt as the previous one.
- `HeyUndo` - Undo the last edit.
- `HeyAbort` - Abort the current edit.

## Keymaps

- `<Plug>HeyUndo` - Undo the last edit.
- `<Plug>HeyAgain` - Edit text with the same prompt as the previous one.
- `<Plug>HeyAbort` - Abort the current edit.

## License

This software is released under the MIT License. https://git.io/mit-license
