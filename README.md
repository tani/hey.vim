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

Note that if you're using [denops-shared-server](https://github.com/vim-denops/denops-shared-server.vim), the environment variable is separate from Vim. In this case, you should set it to `g:hey_openai_api_key`.

## Commands

- `[range]Hey {prompt}` - Edit text with OpenAI API.
- `HeyAbort` - Abort the current edit.

## Options

- `g:hey_openai_api_key` - Set the OpenAI API key to use. Defaults is not set, `OPENAI_API_KEY` environment variable is used.
- `g:hey_model_name` - Set the model name to use. Defaults `"gpt-3.5-turbo"`
- `g:hey_verbose` - Set verbose mode. Defaults `v:false`.

## License

This software is released under the MIT License. https://git.io/mit-license
