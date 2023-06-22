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

## Variables

- `hey_message_style` - It determines the style of the message, either 'window' or else implicitly 'popup' is accepted.
- `hey_model_name` - It specifies the model name for the ChatOpenAI component, with the default being 'gpt-3.5-turbo'.
- `hey_verbose` - It is a boolean which if true, the verbose output will be used, else the default is false.

## Commands

- `[range]Hey {prompt}` - Edit text with OpenAI API.
- `HeyAbort` - Abort the current edit.
- Press `q` to close chat buffer.

## License

This software is released under the MIT License. https://git.io/mit-license
